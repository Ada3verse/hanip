import { createDialoguePlan } from "@/lib/dialogue/dialoguePlanner";
import { calculateHintState, createInitialHintState } from "@/lib/hint/hintEngine";
import { retrieveKnowledge } from "@/lib/knowledge/retrieval/retrievalEngine";
import { toKnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { calculateMastery, createInitialMasteryState } from "@/lib/mastery/masteryEngine";
import { createSessionSummary } from "@/lib/sessionSummary/sessionSummaryEngine";
import { calculateWorkedExampleState } from "@/lib/workedExample/workedExampleEngine";
import { getActiveMisconceptionProfile, updateMisconceptionProfiles } from "./misconceptionLearningEngine";

function check(value: boolean, label: string) {
  if (!value) throw new Error(`Misconception Learning test failed: ${label}`);
}

export function runMisconceptionLearningEngineLocalTests() {
  const concept = "numeral-vs-numeral-determiner";
  const id = "numeral-determiner-position-rule";
  const now = "2026-07-16T00:00:00.000Z";
  const first = updateMisconceptionProfiles({ concept, evaluation: "misconception", matchedMisconceptions: [id], relatedExamples: ["ex-1"], relatedHints: ["hint-1"], now });
  check(first.length === 1, "A profile created");
  check(first[0].frequency === 1 && !first[0].resolved, "B first occurrence");
  check(first[0].misconceptionType.length > 0, "C type inferred");
  check(first[0].relatedExamples.includes("ex-1") && first[0].relatedHints.includes("hint-1"), "D relations stored");
  const repeated = updateMisconceptionProfiles({ concept, evaluation: "misconception", matchedMisconceptions: [id], existingProfiles: first, relatedExamples: ["ex-2"], now: "2026-07-16T00:05:00.000Z" });
  check(repeated.length === 1, "E duplicate profile prevented");
  check(repeated[0].frequency === 2, "F frequency accumulates");
  check(repeated[0].reviewPriority > first[0].reviewPriority, "G priority increases");
  const active = getActiveMisconceptionProfile(repeated, "수사와 수 관형사 구분");
  check(active?.misconceptionId === id, "H active unresolved selected");

  const masteryBase = { ...createInitialMasteryState(concept, now), masteryScore: 68 };
  const limitedMastery = calculateMastery({ conceptId: concept, evaluation: "correct", evaluationConfidence: 0.95, previous: masteryBase, misconceptionProfiles: repeated });
  check(limitedMastery.masteryScore <= 69 && limitedMastery.needsReview, "I mastery capped");
  const hint = calculateHintState({ conceptId: concept, evaluation: "unknown", confidence: 0.5, mastery: limitedMastery, learningMode: "learn", previous: createInitialHintState(concept), activeMisconceptionProfile: active });
  check(hint.lastHintType === "misconception_correction" && hint.hintLevel >= 2, "J comparison hint prioritized");
  const learningState = calculateLearningState({ currentConcept: "수사와 수 관형사 구분", studentModel: { lastEvaluation: "misconception", misconceptions: [id] }, masteryState: limitedMastery, hintState: hint });
  const plan = createDialoguePlan({ learningState, studentModel: {}, activeMisconceptionProfile: active });
  check(plan.reason.includes("unresolved_misconception_priority"), "K dialogue linked");
  const retrieval = retrieveKnowledge({ dialoguePlan: plan, recentStudentMessage: "수 관형사는 수사 뒤에 오는 말", misconceptionProfiles: repeated });
  check(retrieval.usedEvidence.some(({ role }) => role === "misconception"), "L misconception retrieval");
  check(retrieval.usedEvidence.some(({ role }) => role === "worked_example"), "M related example retrieval");
  const example = calculateWorkedExampleState({ conceptId: concept, evaluation: "misconception", hintState: hint, mastery: limitedMastery, retrievedEvidence: toKnowledgeEvidenceBundle(retrieval), originQuestion: "어떻게 구분해?", returnConcept: "수사와 수 관형사 구분", activeMisconceptionProfile: active });
  check(example !== null, "N repeated misconception starts example");

  const oneCorrect = updateMisconceptionProfiles({ concept, evaluation: "correct", matchedMisconceptions: [], existingProfiles: repeated, now: "2026-07-16T00:10:00.000Z" });
  check(!oneCorrect[0].resolved, "O one success does not resolve");
  const resolved = updateMisconceptionProfiles({ concept, evaluation: "correct", matchedMisconceptions: [], existingProfiles: oneCorrect, now: "2026-07-16T00:15:00.000Z" });
  check(resolved[0].resolved && Boolean(resolved[0].resolvedAt), "P repeated success resolves");
  check(resolved[0].reviewPriority < repeated[0].reviewPriority, "Q priority decreases");
  check(getActiveMisconceptionProfile(resolved, concept) === null, "R resolved excluded");
  const summary = createSessionSummary({ learningState, masteryStates: [limitedMastery], evaluationHistory: [], workedExampleStates: example ? [example] : [], hintStates: [hint], misconceptionProfiles: resolved, sessionStartedAt: now, now: "2026-07-16T01:00:00.000Z" });
  check(summary.newMisconceptions.includes(id), "S summary new misconception");
  check(summary.resolvedMisconceptions.includes(id) && !summary.remainingMisconceptions.includes(id), "T summary resolution");
}
