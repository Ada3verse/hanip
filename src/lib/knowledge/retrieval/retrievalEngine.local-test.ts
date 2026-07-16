import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import type { DialogueAction, DialoguePlan } from "@/lib/dialogue/types";
import type { KnowledgeCandidate } from "@/lib/knowledge/source/types";
import { buildRetrievalContext, retrieveKnowledge } from "./retrievalEngine";

function check(condition: boolean, message: string) { if (!condition) throw new Error(`Retrieval test failed: ${message}`); }
function plan(action: DialogueAction, concept = "품사", workedExample = false): DialoguePlan {
  return { activeConcept: concept, action, questionPurpose: "개념 확인", requiredFocus: "판단 기준", forbiddenTopics: [], suggestedReplyMode: "choice", maxQuestions: 1, reason: [], hintLevel: workedExample ? 4 : action === "hint" ? 1 : action === "explain" ? 3 : 0, hintType: workedExample ? "worked_example" : action === "hint" ? "observation" : action === "explain" ? "core_criterion" : "none" };
}

export function runRetrievalEngineLocalTests() {
  const diagnose = retrieveKnowledge({ dialoguePlan: plan("diagnose") });
  check(diagnose.usedEvidence.length === 1 && diagnose.usedEvidence[0].role === "diagnostic_question", "diagnose retrieves only question evidence");
  const hint = retrieveKnowledge({ dialoguePlan: plan("hint", "형태소") });
  check(hint.usedEvidence.length === 1 && hint.usedEvidence[0].role === "hint", "hint retrieves hint only");
  const explain = retrieveKnowledge({ dialoguePlan: plan("explain") });
  check(explain.usedEvidence.length > 0 && explain.usedEvidence.every(({ role }) => role === "definition"), "level 3 explain retrieves definition only");
  const workedExample = retrieveKnowledge({ dialoguePlan: plan("explain", "품사", true) });
  check(workedExample.usedEvidence.length > 0 && workedExample.usedEvidence.every(({ role }) => role === "worked_example"), "level 4 retrieves worked example only");
  const bridge = retrieveKnowledge({ dialoguePlan: plan("bridge", "형태소") });
  check(bridge.usedEvidence.length === 1 && bridge.usedEvidence[0].role === "bridge", "bridge retrieves prerequisite evidence");
  const complete = retrieveKnowledge({ dialoguePlan: plan("complete", "수사와 수 관형사") });
  check(complete.usedEvidence.some(({ role }) => role === "completion_criterion"), "complete retrieves completion criterion");
  check(new Set(explain.usedEvidence.map(({ id }) => id)).size === explain.usedEvidence.length, "evidence deduplicated");

  const verifiedSource = { id: "verified-fixture", type: "curriculum" as const, title: "검증 교육과정" };
  const verified: KnowledgeCandidate = { concept: "품사", provenance: { verificationStatus: "verified", sources: [verifiedSource], scope: { curriculumYear: "2022", schoolLevel: "middle", subject: "국어" } } };
  const draft: KnowledgeCandidate = { concept: "품사", provenance: { verificationStatus: "draft", sources: [{ id: "draft-fixture", type: "internal", title: "임시 자료" }], scope: { curriculumYear: "2022", schoolLevel: "middle", subject: "국어" } } };
  const verifiedResult = retrieveKnowledge({ dialoguePlan: plan("explain"), knowledgeCandidates: [draft, verified] });
  check(verifiedResult.selectedSources.some(({ id }) => id === "verified-fixture") && !verifiedResult.selectedSources.some(({ id }) => id === "draft-fixture"), "verified source preferred");
  const context = buildRetrievalContext(explain);
  check(context.includes("definition") && !explain.selectedSources.some(({ id }) => context.includes(id)), "prompt receives evidence without source ids");
  const mock = createMockChatResponse({ messages: [{ role: "user", content: "품사가 뭐예요?" }] });
  check(Boolean(mock.meta?.retrieval) && !/hanip-internal-draft|verified-fixture/.test(mock.message), "mock uses retrieval without exposing sources");
}
