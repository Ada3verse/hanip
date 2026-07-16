import { getConceptDependency } from "@/lib/knowledge/dependency";
import { inferDependencyConceptId } from "@/lib/knowledge/dependency/dependencyEngine";
import { findRelevantKnowledge, findKnowledgeBundle } from "@/lib/knowledge";
import { getVerificationStatusRank, selectKnowledgeBundle } from "@/lib/knowledge/source/sourceSelector";
import { findRelevantMisconception } from "@/lib/knowledge/misconceptions";
import { findRelevantWorkedExample } from "@/lib/knowledge/examples";
import type { KnowledgeSource } from "@/lib/knowledge/source/types";
import { hanipInternalDraftSource } from "@/lib/knowledge/source/defaultSources";
import { getImportedConceptEntries } from "@/lib/knowledge/contentPack/importer";
import type { KnowledgeRetrievalInput, KnowledgeRetrievalResult, RetrievedEvidence, RetrievalRole } from "./types";
import { getActiveMisconceptionProfile } from "@/lib/misconceptionLearning/misconceptionLearningEngine";

function compact(value: unknown) { return typeof value === "string" ? value : JSON.stringify(value); }

export function retrieveKnowledge(input: KnowledgeRetrievalInput): KnowledgeRetrievalResult {
  const { dialoguePlan, studentModel = {}, recentStudentMessage = "", conversationMessages = [], knowledgeCandidates, workedExampleState, misconceptionProfiles = [] } = input;
  const concept = dialoguePlan.activeConcept;
  const knowledgeModule = findRelevantKnowledge(recentStudentMessage, concept);
  const bundle = knowledgeCandidates
    ? selectKnowledgeBundle({ concept, candidates: knowledgeCandidates, curriculumYear: "2022", schoolLevel: "middle", subject: "국어" })
    : findKnowledgeBundle(concept);
  const dependency = getConceptDependency(inferDependencyConceptId(concept) ?? "");
  const evidence: RetrievedEvidence[] = [];
  const add = (id: string, role: RetrievalRole, content: unknown, source: KnowledgeSource | null) => {
    const text = compact(content);
    if (!source || !text || evidence.some((item) => item.id === id || (item.role === role && item.content === text))) return;
    evidence.push({ id, role, content: text, source });
  };

  const activeProfile = getActiveMisconceptionProfile(misconceptionProfiles, concept);
  const example = findRelevantWorkedExample({ currentConcept: concept, misconceptionId: activeProfile?.misconceptionId, hintLevel: studentModel.hintLevel, conversationMessages });
  const misconception = findRelevantMisconception({ recentStudentMessage, currentConcept: concept, studentMisconceptions: activeProfile ? [activeProfile.misconceptionId] : studentModel.misconceptions, studentMessages: conversationMessages });
  const reviewMode = dialoguePlan.reason.includes("mastery_review_priority");
  const sourceFor = (role: RetrievalRole) => (role === "worked_example" ? bundle.exampleSource : role === "misconception" ? bundle.misconceptionSource : role === "bridge" || role === "hint" ? bundle.teachingSource ?? bundle.definitionSource : bundle.definitionSource ?? bundle.explanationSource) ?? hanipInternalDraftSource;
  type ImportedEvidence = { id: string; role: RetrievalRole; content: string; source: KnowledgeSource | null; rank: number };
  const imported = getImportedConceptEntries(concept).flatMap<ImportedEvidence>(({ pack, concept: entry }) => {
    const source = (ids: string[]) => pack.sources.find(({ id }) => ids.includes(id)) ?? null;
    if (dialoguePlan.action === "diagnose" || dialoguePlan.action === "ask" || dialoguePlan.action === "confirm") return entry.teachingPrompts.filter(({ purpose }) => purpose === "diagnose" || purpose === "confirm").map((item) => ({ id: item.id, role: "diagnostic_question" as const, content: item.prompt, source: source(item.sourceIds), rank: getVerificationStatusRank(item.verificationStatus) }));
    if (dialoguePlan.action === "hint") return entry.teachingPrompts.filter(({ purpose }) => purpose === "hint").map((item) => ({ id: item.id, role: "hint" as const, content: item.prompt, source: source(item.sourceIds), rank: getVerificationStatusRank(item.verificationStatus) }));
    if (dialoguePlan.action === "explain") {
      if (dialoguePlan.hintType === "worked_example") {
        return entry.examples.map((item) => ({ id: item.id, role: "worked_example" as const, content: `${item.sentence} ${item.explanation}`, source: source(item.sourceIds), rank: getVerificationStatusRank(item.verificationStatus) }));
      }
      return [
        ...(entry.definition ? [{ id: entry.definition.id, role: "definition" as const, content: entry.definition.content, source: source(entry.definition.sourceIds), rank: getVerificationStatusRank(entry.definition.verificationStatus) }] : []),
        ...entry.explanation.map((item) => ({ id: item.id, role: "definition" as const, content: item.content, source: source(item.sourceIds), rank: getVerificationStatusRank(item.verificationStatus) })),
      ];
    }
    if (dialoguePlan.action === "bridge") return entry.definition ? [{ id: entry.definition.id, role: "bridge" as const, content: entry.definition.content, source: source(entry.definition.sourceIds), rank: getVerificationStatusRank(entry.definition.verificationStatus) }] : [];
    if (dialoguePlan.action === "complete") return entry.completionCriteria.map((item) => ({ id: item.id, role: "completion_criterion" as const, content: item.description, source: source(item.sourceIds), rank: getVerificationStatusRank(item.verificationStatus) }));
    if (dialoguePlan.action === "return_to_route") return entry.classificationCriteria.map((item) => ({ id: item.id, role: "definition" as const, content: item.content, source: source(item.sourceIds), rank: getVerificationStatusRank(item.verificationStatus) }));
    return [];
  }).filter((item): item is ImportedEvidence & { source: KnowledgeSource } => item.source !== null).sort((left, right) => right.rank - left.rank);
  const importedRoles = new Set<RetrievalRole>();
  for (const item of imported) {
    if (workedExampleState && !workedExampleState.completedExample && item.role !== "worked_example") continue;
    if (importedRoles.has(item.role)) continue;
    importedRoles.add(item.role);
    add(item.id, item.role, item.content, item.source);
  }

  if (workedExampleState && !workedExampleState.completedExample) {
    if (example && !importedRoles.has("worked_example")) {
      add(example.example.id, "worked_example", `${example.example.sentenceA} / ${example.example.sentenceB}\n${example.example.followUpQuestion}`, sourceFor("worked_example"));
    }
    return {
      concept,
      action: dialoguePlan.action,
      reason: ["worked_example_evidence_only", `worked_example_step_${workedExampleState.exampleStep}`],
      selectedSources: [...new Map(evidence.map((item) => [item.source.id, item.source])).values()],
      usedEvidence: evidence.filter(({ role }) => role === "worked_example").map(({ id, role, content }) => ({ id, role, content })),
    };
  }

  switch (dialoguePlan.action) {
    case "diagnose":
    case "ask":
    case "confirm":
      if (!importedRoles.has("diagnostic_question")) add(`${knowledgeModule?.id ?? concept}:diagnose`, "diagnostic_question", knowledgeModule?.teachingFlow?.[0] ?? dependency?.bridgeQuestion ?? dialoguePlan.requiredFocus, sourceFor("diagnostic_question"));
      if (misconception) add(misconception.misconception.id, "misconception", `${misconception.misconception.correctionStrategy} ${misconception.misconception.nextQuestionStyle}`, sourceFor("misconception"));
      if (reviewMode && example) {
        add(
          `${example.example.id}:review`,
          "worked_example",
          `${example.example.sentenceA} / ${example.example.sentenceB}\n${example.example.followUpQuestion}`,
          sourceFor("worked_example"),
        );
      }
      break;
    case "hint":
      if (dialoguePlan.hintType === "misconception_correction" && misconception) {
        add(
          misconception.misconception.id,
          "misconception",
          misconception.misconception.correctionStrategy,
          sourceFor("misconception"),
        );
        if (activeProfile && activeProfile.frequency >= 2 && example) {
          add(
            example.example.id,
            "worked_example",
            `${example.example.sentenceA} / ${example.example.sentenceB}\n${example.example.followUpQuestion}`,
            sourceFor("worked_example"),
          );
        }
      } else if (!importedRoles.has("hint")) {
        add(`${knowledgeModule?.id ?? concept}:hint`, "hint", dependency?.bridgeQuestion ?? knowledgeModule?.teachingFlow?.[1] ?? dialoguePlan.requiredFocus, sourceFor("hint"));
      }
      break;
    case "explain":
      if (
        dialoguePlan.hintType !== "worked_example" &&
        !importedRoles.has("definition")
      ) {
        add(`${knowledgeModule?.id ?? concept}:definition`, "definition", knowledgeModule?.coreDefinitions ?? dependency?.bridgeExplanation ?? dialoguePlan.requiredFocus, sourceFor("definition"));
      }
      if (
        dialoguePlan.hintType === "worked_example" &&
        example &&
        !importedRoles.has("worked_example")
      ) {
        add(example.example.id, "worked_example", `${example.example.sentenceA} / ${example.example.sentenceB}\n${example.example.followUpQuestion}`, sourceFor("worked_example"));
      }
      break;
    case "bridge":
      if (!importedRoles.has("bridge")) add(`${dependency?.id ?? concept}:bridge`, "bridge", dependency ? `${dependency.bridgeExplanation} ${dependency.bridgeQuestion}` : dialoguePlan.requiredFocus, sourceFor("bridge"));
      break;
    case "complete":
      if (!importedRoles.has("completion_criterion")) add(`${knowledgeModule?.id ?? concept}:completion`, "completion_criterion", knowledgeModule?.completionCriteria ?? dialoguePlan.requiredFocus, sourceFor("completion_criterion"));
      break;
    case "return_to_route":
      if (!importedRoles.has("definition")) add(`${knowledgeModule?.id ?? concept}:route`, "definition", "decisionCriteria" in (knowledgeModule ?? {}) ? (knowledgeModule as { decisionCriteria: unknown }).decisionCriteria : knowledgeModule?.coreDefinitions ?? dialoguePlan.requiredFocus, sourceFor("definition"));
      break;
  }

  return {
    concept,
    action: dialoguePlan.action,
    reason: [
      `action_${dialoguePlan.action}`,
      `active_concept_${concept}`,
      ...(reviewMode ? ["mastery_review_mode"] : []),
      ...evidence.map((item) => `selected_${item.role}`),
    ],
    selectedSources: [...new Map(evidence.map((item) => [item.source.id, item.source])).values()],
    usedEvidence: evidence.map(({ id, role, content }) => ({ id, role, content })),
  };
}

export function buildRetrievalContext(result: KnowledgeRetrievalResult) {
  if (result.usedEvidence.length === 0) return "";
  return `[이번 응답에 사용할 Knowledge Evidence]\n${result.usedEvidence.map((item) => `- ${item.role}: ${item.content}`).join("\n")}\n위 evidence만 이번 응답의 지식 근거로 사용하세요. 전체 Knowledge나 출처 ID·검증 상태·내부 reason을 학생에게 노출하지 마세요.`;
}

export function getEvaluationCompletionCriteria(
  result: KnowledgeRetrievalResult,
) {
  return result.usedEvidence
    .filter(({ role }) => role === "completion_criterion")
    .map(({ content }) => content);
}
