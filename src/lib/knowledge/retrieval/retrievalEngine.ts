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
import { selectAuthoringEvidence } from "@/lib/knowledge/authoring/registry";
import { partsOfSpeechTextbookDraftPack } from "@/lib/knowledge/partsOfSpeech/textbookDraft/pack";
import type { AuthoringConcept } from "@/lib/knowledge/authoring/types";
import type { ExplanationStrategy } from "@/lib/explanation/types";
import type { DialogueAction } from "@/lib/dialogue/types";

const MAX_DRAFT_EVIDENCE = 5;
const MAX_DRAFT_EVIDENCE_CHARS = 2_400;
const normalizeSearch = (value: string) => value.toLowerCase().replace(/[\s·과와의은는이가을를,?!.]/g, "");
const phraseMatches = (text: string, phrase: string) => {
  const normalizedText = normalizeSearch(text);
  const normalizedPhrase = normalizeSearch(phrase);
  return normalizedPhrase.length > 0 && normalizedText.includes(normalizedPhrase);
};

function conceptSearchKeys(concept: AuthoringConcept) {
  return [concept.title, ...concept.aliases].filter((key) => !["품사", "단어"].includes(key) || concept.conceptId === (key === "품사" ? "parts-of-speech" : "word"));
}

function findDraftConcepts(input: KnowledgeRetrievalInput) {
  const explicit = input.recentStudentMessage?.trim() ?? "";
  const planText = [input.dialoguePlan.activeConcept, input.currentGoal, input.currentMission].filter(Boolean).join(" ");
  const query = explicit || planText;
  const compound: string[] = [];
  if (/명사.*대명사|대명사.*명사/.test(query)) compound.push("noun", "pronoun");
  if (/수사.*(수\s*관형사|관형사)|(수\s*관형사|관형사).*수사/.test(query)) compound.push("numeral", "determiner", "numeral-determiner");
  if (/품사.*문장\s*성분|문장\s*성분.*품사/.test(query)) compound.push("parts-of-speech-vs-sentence-component");
  if (/나타낸다는?\s*말|무엇을\s*나타내|의미(?:가|는)?\s*(?:뭐|무슨\s*뜻)/.test(query)) compound.push("parts-of-speech-criteria");
  const direct = partsOfSpeechTextbookDraftPack.concepts.filter((concept) => conceptSearchKeys(concept).some((key) => phraseMatches(query, key)));
  const explicitMatches = [...new Set([...compound, ...direct.map(({ conceptId }) => conceptId)])];
  const asksNewQuestion = Boolean(explicit) && /[?？]|뭐|무엇|왜|어떻게|알려\s*줘|차이|구분/.test(explicit);
  const contextualFollowUp = /(?:에서|의)\s*[‘'“"]?[가-힣-]{1,6}[’'”"]?(?:은|는|이|가)?\s*(?:뭐|무엇)/.test(explicit);
  const selectedIds = explicitMatches.length > 0
    ? explicitMatches
    : asksNewQuestion && !contextualFollowUp
      ? []
      : partsOfSpeechTextbookDraftPack.concepts.filter((concept) => conceptSearchKeys(concept).some((key) => phraseMatches(planText, key))).map(({ conceptId }) => conceptId);
  const specific = selectedIds.filter((id) => !["parts-of-speech", "word"].includes(id) || selectedIds.length === 1);
  const resultIds = specific.length > 0 ? specific : selectedIds;
  return resultIds.slice(0, 3).map((id) => partsOfSpeechTextbookDraftPack.concepts.find((concept) => concept.conceptId === id)).filter((concept): concept is AuthoringConcept => Boolean(concept));
}

function getUnderstanding(input: KnowledgeRetrievalInput, concepts: AuthoringConcept[]) {
  const profile = input.studentModel?.studentProfile;
  const levels = concepts.map((concept) => profile?.concepts[concept.title]?.understandingLevel ?? profile?.concepts[concept.conceptId]?.understandingLevel).filter((value): value is 0 | 1 | 2 | 3 => typeof value === "number");
  if (levels.length) return Math.min(...levels);
  if ((input.studentModel?.confidence ?? 0) >= .75 || input.studentModel?.lastEvaluation === "correct") return 3;
  if (input.studentModel?.lastEvaluation === "partial_correct") return 2;
  return 0;
}

function draftSource(concept: AuthoringConcept, evidenceIndex = 0): KnowledgeSource {
  const sourceId = concept.provenanceIds[evidenceIndex % concept.provenanceIds.length];
  const source = partsOfSpeechTextbookDraftPack.provenance.find(({ sourceId: id }) => id === sourceId);
  return { id: sourceId, type: "teacher_guide", title: source?.title ?? "교사용 교과서 품사 자료", publisher: source?.publisher, pageRange: source?.pageRange, documentId: source?.documentId };
}

function selectDraftStrategy(action: DialogueAction, understanding: number, comparison: boolean): ExplanationStrategy {
  if (action === "hint") return understanding <= 1 ? "step_by_step" : "rule_discovery";
  if (action === "complete") return "student_explanation";
  if (comparison) return understanding >= 2 ? "contrast" : "comparison";
  if (understanding <= 1) return "definition";
  if (understanding >= 3) return "direct_application";
  return "teacher_feedback";
}

export function retrieveTextbookDraftKnowledge(input: KnowledgeRetrievalInput): KnowledgeRetrievalResult {
  const concepts = findDraftConcepts(input);
  const understanding = getUnderstanding(input, concepts);
  const comparison = concepts.length > 1 || /비교|차이|구분/.test(input.recentStudentMessage ?? input.dialoguePlan.requiredFocus);
  const strategy = concepts.length ? selectDraftStrategy(input.dialoguePlan.action, understanding, comparison) : null;
  const explanationHistory = input.studentModel?.studentProfile?.explanationHistory ?? [];
  const usedExampleIds = new Set(explanationHistory.flatMap(({ exampleIds }) => exampleIds));
  const candidates: RetrievedEvidence[] = [];
  const add = (concept: AuthoringConcept, id: string, role: RetrievalRole, content: string) => {
    const normalized = content.trim();
    if (!normalized || candidates.some((item) => item.id === id || (item.role === role && item.content === normalized))) return;
    candidates.push({ id, role, content: normalized.slice(0, 600), source: draftSource(concept, candidates.length) });
  };
  for (const concept of concepts) {
    const conceptHistoryCount = explanationHistory.filter(({ conceptId }) => phraseMatches(conceptId, concept.title) || phraseMatches(input.dialoguePlan.activeConcept, concept.title)).length;
    const unusedExamples = concept.examples.filter(({ exampleId }) => !usedExampleIds.has(exampleId));
    const unusedExample = unusedExamples[conceptHistoryCount % Math.max(unusedExamples.length, 1)] ?? concept.examples[0];
    const action = input.dialoguePlan.action;
    const hasRepeatedMisconception = input.misconceptionProfiles?.some((profile) => {
      if (profile.resolved || profile.frequency < 2) return false;
      const profileId = normalizeSearch(profile.concept).replace(/^numeralvs/, "");
      const conceptId = normalizeSearch(concept.conceptId);
      return profile.concept === concept.conceptId || profileId.includes(conceptId) || conceptId.includes(profileId) || phraseMatches(profile.concept, concept.title) || phraseMatches(input.dialoguePlan.activeConcept, profile.concept);
    });
    if (input.dialoguePlan.hintType === "worked_example") {
      const worked = concept.workedExamples.find(({ workedExampleId }) => !usedExampleIds.has(workedExampleId)) ?? concept.workedExamples[0];
      if (worked) add(concept, worked.workedExampleId, "worked_example", `${worked.question} ${worked.steps.join(" ")} ${worked.explanation}`);
      continue;
    }
    if (action === "diagnose" || action === "ask" || action === "confirm") {
      const check = concept.checks.find(({ difficulty }) => difficulty <= (understanding <= 1 ? 2 : 4)) ?? concept.checks[0];
      add(concept, check.checkId, "diagnostic_question", check.prompt);
      continue;
    }
    if (action === "hint") {
      const explanation = concept.explanations.find(({ strategy: value }) => understanding <= 1 ? value === "step_by_step" || value === "definition" : value === "teacher_feedback") ?? concept.explanations[0];
      add(concept, explanation.id, "hint", explanation.content);
      if (understanding <= 1 && concept.misconceptions[0]) add(concept, concept.misconceptions[0].misconceptionId, "misconception", concept.misconceptions[0].correctionStrategy);
      if (hasRepeatedMisconception && concept.workedExamples[0]) {
        const worked = concept.workedExamples[0];
        add(concept, worked.workedExampleId, "worked_example", `${worked.question} ${worked.steps.join(" ")} ${worked.explanation}`);
      }
      continue;
    }
    if (action === "bridge") {
      add(concept, `${concept.conceptId}:bridge`, "bridge", concept.definition.easy);
      continue;
    }
    if (action === "complete") {
      add(concept, `${concept.conceptId}:completion`, "completion_criterion", concept.completionCriteria.join(" "));
      continue;
    }
    if (action === "return_to_route") {
      add(concept, `${concept.conceptId}:rule`, "comparison", concept.discriminationRules[0]);
      if (unusedExample) add(concept, unusedExample.exampleId, "example", `${unusedExample.sentence} — ${unusedExample.analysis}`);
      continue;
    }
    if (understanding <= 1) {
      add(concept, `${concept.conceptId}:definition:easy`, "definition", concept.definition.easy);
      if (unusedExample) add(concept, unusedExample.exampleId, "example", `${unusedExample.sentence} — ${unusedExample.explanation}`);
      const teacher = concept.teacherStrategies?.find(({ purpose }) => purpose === "진단") ?? concept.teacherStrategies?.[0];
      if (teacher) add(concept, `${concept.conceptId}:teacher:${teacher.purpose}`, "teacher_strategy", `${teacher.strategy} ${teacher.caution}`);
      if (concept.misconceptions[0]) add(concept, concept.misconceptions[0].misconceptionId, "misconception", `${concept.misconceptions[0].description} ${concept.misconceptions[0].correctionStrategy}`);
      if (hasRepeatedMisconception && concept.workedExamples[0]) {
        const worked = concept.workedExamples[0];
        add(concept, worked.workedExampleId, "worked_example", `${worked.question} ${worked.steps.join(" ")} ${worked.explanation}`);
      }
    } else {
      add(concept, `${concept.conceptId}:rule`, comparison ? "comparison" : "definition", concept.discriminationRules[0]);
      if (concept.counterexamples[0]) add(concept, concept.counterexamples[0].counterexampleId, "counterexample", `${concept.counterexamples[0].sentence} — ${concept.counterexamples[0].reason}`);
      if (unusedExample) add(concept, unusedExample.exampleId, "example", `${unusedExample.sentence} — ${unusedExample.analysis}`);
      if (understanding >= 3 && concept.checks[3]) add(concept, concept.checks[3].checkId, "quiz", concept.checks[3].prompt);
    }
  }
  const selected: RetrievedEvidence[] = [];
  let chars = 0;
  for (const item of candidates) {
    if (selected.length >= MAX_DRAFT_EVIDENCE || chars + item.content.length > MAX_DRAFT_EVIDENCE_CHARS) continue;
    selected.push(item); chars += item.content.length;
  }
  return {
    concept: input.dialoguePlan.activeConcept,
    action: input.dialoguePlan.action,
    knowledgeFound: concepts.length > 0 && selected.length > 0,
    matchedConcepts: concepts.map(({ title }) => title),
    recommendedStrategy: strategy,
    evidenceCharacterCount: chars,
    estimatedTokens: Math.ceil(chars / 3),
    reason: concepts.length === 0 ? ["knowledge_not_found", "general_knowledge_blocked"] : ["textbook_draft_pack", `understanding_${understanding}`, `strategy_${strategy}`, `action_${input.dialoguePlan.action}`, "minimal_evidence_only", ...(usedExampleIds.size ? ["used_examples_excluded"] : [])],
    selectedSources: [...new Map(selected.map((item) => [item.source.id, item.source])).values()],
    usedEvidence: selected.map(({ id, role, content }) => ({ id, role, content })),
  };
}

function compact(value: unknown) { return typeof value === "string" ? value : JSON.stringify(value); }

export function retrieveKnowledge(input: KnowledgeRetrievalInput): KnowledgeRetrievalResult {
  const { dialoguePlan, studentModel = {}, recentStudentMessage = "", conversationMessages = [], knowledgeCandidates, workedExampleState, misconceptionProfiles = [] } = input;
  const concept = dialoguePlan.activeConcept;
  const textbookDraft = retrieveTextbookDraftKnowledge(input);
  if (!knowledgeCandidates && getImportedConceptEntries(concept).length === 0) return textbookDraft;
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
  const authoring = selectAuthoringEvidence({
    concept,
    action: dialoguePlan.action,
    production: process.env.NODE_ENV === "production",
    allowReviewed: process.env.HANIP_ALLOW_REVIEWED_KNOWLEDGE === "true",
    allowDevelopmentDraft: process.env.NODE_ENV !== "production" && process.env.HANIP_USE_MOCK_AI !== "false",
  });
  if (authoring) {
    const role: RetrievalRole = dialoguePlan.action === "hint" ? "hint" : dialoguePlan.action === "bridge" ? "bridge" : dialoguePlan.action === "complete" ? "completion_criterion" : dialoguePlan.action === "explain" ? "definition" : "diagnostic_question";
    const source: KnowledgeSource = { id: `authoring:${authoring.packId}`, type: "internal", title: "검증된 Knowledge Pack 자료" };
    authoring.evidence.forEach((content, index) => add(`${authoring.conceptId}:${role}:${index}`, role, content, source));
    importedRoles.add(role);
  }

  if (workedExampleState && !workedExampleState.completedExample) {
    if (example && !importedRoles.has("worked_example")) {
      add(example.example.id, "worked_example", `${example.example.sentenceA} / ${example.example.sentenceB}\n${example.example.followUpQuestion}`, sourceFor("worked_example"));
    }
    return {
      concept,
      action: dialoguePlan.action,
      knowledgeFound: evidence.some(({ role }) => role === "worked_example"),
      matchedConcepts: [concept],
      recommendedStrategy: "direct_application",
      evidenceCharacterCount: evidence.filter(({ role }) => role === "worked_example").reduce((sum, { content }) => sum + content.length, 0),
      estimatedTokens: Math.ceil(evidence.filter(({ role }) => role === "worked_example").reduce((sum, { content }) => sum + content.length, 0) / 3),
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
    knowledgeFound: evidence.length > 0,
    matchedConcepts: evidence.length ? [concept] : [],
    recommendedStrategy: dialoguePlan.action === "hint" ? "step_by_step" : dialoguePlan.action === "complete" ? "student_explanation" : "definition",
    evidenceCharacterCount: evidence.reduce((sum, { content }) => sum + content.length, 0),
    estimatedTokens: Math.ceil(evidence.reduce((sum, { content }) => sum + content.length, 0) / 3),
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
