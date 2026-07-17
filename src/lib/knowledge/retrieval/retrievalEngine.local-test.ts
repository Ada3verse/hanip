import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import type { DialogueAction, DialoguePlan } from "@/lib/dialogue/types";
import type { KnowledgeCandidate } from "@/lib/knowledge/source/types";
import { buildRetrievalContext, retrieveKnowledge } from "./retrievalEngine";
import { partsOfSpeechTextbookDraftPack } from "@/lib/knowledge/partsOfSpeech/textbookDraft/pack";
import { createEmptyRuntimeStudentModel } from "@/lib/studentModel/studentModelEngine";

function check(condition: boolean, message: string) { if (!condition) throw new Error(`Retrieval test failed: ${message}`); }
function plan(action: DialogueAction, concept = "품사", workedExample = false): DialoguePlan {
  return { activeConcept: concept, action, questionPurpose: "개념 확인", requiredFocus: "판단 기준", forbiddenTopics: [], suggestedReplyMode: "choice", maxQuestions: 1, reason: [], hintLevel: workedExample ? 4 : action === "hint" ? 1 : action === "explain" ? 3 : 0, hintType: workedExample ? "worked_example" : action === "hint" ? "observation" : action === "explain" ? "core_criterion" : "none" };
}

export function runRetrievalEngineLocalTests() {
  const diagnose = retrieveKnowledge({ dialoguePlan: plan("diagnose"), recentStudentMessage: "품사가 뭐예요?" });
  check(diagnose.usedEvidence.length === 1 && diagnose.usedEvidence[0].role === "diagnostic_question", "diagnose retrieves only question evidence");
  const hint = retrieveKnowledge({ dialoguePlan: plan("hint", "형태소"), recentStudentMessage: "형태소를 모르겠어" });
  check(hint.usedEvidence.some(({ role }) => role === "hint") && hint.usedEvidence.every(({ role }) => role === "hint" || role === "misconception"), "hint retrieves scoped hint evidence");
  const explain = retrieveKnowledge({ dialoguePlan: plan("explain"), recentStudentMessage: "품사가 뭐예요?" });
  check(explain.usedEvidence.some(({ role }) => role === "definition") && explain.usedEvidence.length <= 5, "explain retrieves minimal definition bundle");
  const workedExample = retrieveKnowledge({ dialoguePlan: plan("explain", "품사", true), recentStudentMessage: "품사 예제를 보여줘" });
  check(workedExample.usedEvidence.length > 0 && workedExample.usedEvidence.every(({ role }) => role === "worked_example"), "level 4 retrieves worked example only");
  const bridge = retrieveKnowledge({ dialoguePlan: plan("bridge", "형태소"), recentStudentMessage: "형태소가 뭐야?" });
  check(bridge.usedEvidence.length === 1 && bridge.usedEvidence[0].role === "bridge", "bridge retrieves prerequisite evidence");
  const complete = retrieveKnowledge({ dialoguePlan: plan("complete", "수사와 수 관형사"), recentStudentMessage: "수사와 수 관형사 구분을 정리해줘" });
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

  const noun = retrieveKnowledge({ dialoguePlan: plan("explain", "명사"), recentStudentMessage: "명사가 뭐야?" });
  check(noun.matchedConcepts.length === 1 && noun.matchedConcepts[0] === "명사" && noun.usedEvidence.every(({ id }) => id.startsWith("noun")), "actual noun chunk only");
  const nounPronoun = retrieveKnowledge({ dialoguePlan: plan("explain", "명사와 대명사"), recentStudentMessage: "명사와 대명사의 차이는 뭐야?" });
  check(nounPronoun.matchedConcepts.includes("명사") && nounPronoun.matchedConcepts.includes("대명사"), "two concept comparison retrieval");
  const particle = retrieveKnowledge({ dialoguePlan: plan("explain", "조사"), recentStudentMessage: "조사는 왜 단어야?" });
  check(particle.matchedConcepts.length === 1 && particle.matchedConcepts[0] === "조사" && particle.usedEvidence.every(({ id }) => id.startsWith("particle")), "particle knowledge only");
  check(diagnose.matchedConcepts.length === 1 && diagnose.matchedConcepts[0] === "품사", "parts-of-speech definition retrieval");

  const firstExampleId = noun.usedEvidence.find(({ role }) => role === "example")?.id ?? "";
  const historyModel = createEmptyRuntimeStudentModel();
  historyModel.explanationHistory = [{ conceptId: "명사", strategy: "DIRECT_EXPLANATION", explanationStrategy: "definition", exampleIds: [firstExampleId], analogyId: null, usedAt: new Date(0).toISOString() }];
  const repeatedNoun = retrieveKnowledge({ dialoguePlan: plan("explain", "명사"), recentStudentMessage: "명사가 뭐야?", studentModel: { studentProfile: historyModel } });
  check(Boolean(firstExampleId) && repeatedNoun.usedEvidence.find(({ role }) => role === "example")?.id !== firstExampleId, "repeated question selects another example");

  const low = retrieveKnowledge({ dialoguePlan: plan("explain", "명사"), recentStudentMessage: "명사가 뭐야?", studentModel: { studentProfile: createEmptyRuntimeStudentModel() } });
  check(low.reason.includes("understanding_0") && low.usedEvidence.some(({ role }) => role === "definition") && low.usedEvidence.some(({ role }) => role === "teacher_strategy"), "low understanding gets easy scaffold");
  const highModel = createEmptyRuntimeStudentModel();
  highModel.concepts.명사 = { understandingLevel: 3, confidence: "HIGH", evidenceCount: 3, consecutiveSuccesses: 2, consecutiveFailures: 0, updatedAt: new Date(0).toISOString() };
  const high = retrieveKnowledge({ dialoguePlan: plan("explain", "명사"), recentStudentMessage: "명사 새 문제를 풀어볼래", studentModel: { studentProfile: highModel } });
  check(high.reason.includes("understanding_3") && high.usedEvidence.some(({ role }) => role === "counterexample") && high.usedEvidence.some(({ role }) => role === "quiz"), "high understanding gets criteria and application");

  const missing = retrieveKnowledge({ dialoguePlan: plan("explain", "기상"), recentStudentMessage: "오늘 날씨가 어때?" });
  check(!missing.knowledgeFound && missing.reason.includes("knowledge_not_found") && missing.usedEvidence.length === 0, "unknown knowledge blocks general inference");
  check(explain.evidenceCharacterCount < JSON.stringify(partsOfSpeechTextbookDraftPack).length / 20 && explain.estimatedTokens < 800, "prompt token reduction");
}
