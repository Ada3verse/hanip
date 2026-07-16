import { createDialoguePlan } from "@/lib/dialogue/dialoguePlanner";
import { calculateHintState, createInitialHintState } from "@/lib/hint/hintEngine";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { calculateMastery, createInitialMasteryState } from "@/lib/mastery/masteryEngine";
import { retrieveKnowledge } from "@/lib/knowledge/retrieval/retrievalEngine";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import { calculateWorkedExampleState } from "./workedExampleEngine";

function check(value: boolean, label: string) {
  if (!value) throw new Error(`Worked Example test failed: ${label}`);
}

export function runWorkedExampleEngineLocalTests() {
  const conceptId = "numeral-vs-numeral-determiner";
  const mastery = createInitialMasteryState(conceptId, "2026-07-15T00:00:00.000Z");
  const hint = { ...createInitialHintState(conceptId), hintLevel: 4 as const, lastHintType: "worked_example" as const, hintCount: 4 };
  const evidence: KnowledgeEvidenceBundle = {
    reason: ["verified_first"],
    selectedSources: [{ id: "verified-example", type: "curriculum", title: "검증 예제" }],
    usedEvidence: [{ id: "example-two-students", role: "worked_example", content: "두 학생 / 학생이 둘 왔다" }],
  };
  const base = { conceptId, evaluation: "unknown" as const, hintState: hint, mastery, retrievedEvidence: evidence, originQuestion: "두는 수사일까?", returnConcept: "수사와 수 관형사 구분" };
  const started = calculateWorkedExampleState(base);
  check(started?.exampleStep === 1, "A example starts");
  check(started?.exampleId === "example-two-students", "B retrieved example selected");
  check(started?.originQuestion === "두는 수사일까?", "C origin retained");
  check(started?.returnConcept === "수사와 수 관형사 구분", "D return concept retained");
  const held = calculateWorkedExampleState({ ...base, previous: started, evaluation: "unknown" });
  check(held?.exampleStep === 1 && held.exampleAttempts === 1, "E failed attempt stays");
  const step2 = calculateWorkedExampleState({ ...base, previous: held, evaluation: "correct" });
  check(step2?.exampleStep === 2, "F criterion step");
  const step3 = calculateWorkedExampleState({ ...base, previous: step2, evaluation: "correct" });
  check(step3?.exampleStep === 3, "G student applies");
  const step4 = calculateWorkedExampleState({ ...base, previous: step3, evaluation: "correct" });
  check(step4?.exampleStep === 4, "H answer confirmation");
  const completed = calculateWorkedExampleState({ ...base, previous: step4, evaluation: "correct" });
  check(completed?.exampleStep === 5 && completed.completedExample, "I example completes");
  check((completed?.exampleHistory.length ?? 0) >= 4, "J history stored");

  const frozenHint = calculateHintState({ conceptId, evaluation: "unknown", confidence: 0.4, mastery, learningMode: "learn", previous: hint, workedExampleActive: true });
  check(frozenHint.hintLevel === 4 && frozenHint.hintCount === 4, "K hint escalation blocked");
  const learningState = calculateLearningState({ currentConcept: "수사와 수 관형사 구분", studentModel: { lastEvaluation: "unknown" }, masteryState: mastery, hintState: frozenHint });
  const activePlan = createDialoguePlan({ learningState, studentModel: {}, workedExampleState: step2 });
  check(activePlan.activeConcept === "수사와 수 관형사 구분", "L concept remains");
  check(activePlan.action === "confirm" && activePlan.reason.includes("worked_example_active_concept_locked"), "M dialogue locked");
  check(activePlan.hintType === "worked_example", "N other hints blocked");
  const returnPlan = createDialoguePlan({ learningState, studentModel: {}, workedExampleState: completed });
  check(returnPlan.action === "return_to_route", "O returns after completion");
  const retrieval = retrieveKnowledge({ dialoguePlan: activePlan, workedExampleState: step2, recentStudentMessage: "모르겠어" });
  check(retrieval.usedEvidence.every(({ role }) => role === "worked_example"), "P retrieval example only");
  const successfulMastery = calculateMastery({ conceptId, evaluation: "correct", evaluationConfidence: 0.9, previous: mastery, workedExampleSuccess: true });
  check(successfulMastery.masteryScore > 0 && successfulMastery.masteryScore < 10, "Q mastery increases minimally");
  const lowMasteryStart = calculateWorkedExampleState({ ...base, hintState: createInitialHintState(conceptId) });
  check(lowMasteryStart !== null, "R very low mastery enters");
  const applyFailStart = calculateWorkedExampleState({ ...base, hintState: createInitialHintState(conceptId), mastery: { ...mastery, masteryScore: 40 }, evaluation: "apply_fail", applyFailCount: 2 });
  check(applyFailStart !== null, "S repeated apply fail enters");
  const misconceptionStart = calculateWorkedExampleState({ ...base, hintState: createInitialHintState(conceptId), mastery: { ...mastery, masteryScore: 40 }, evaluation: "misconception", misconceptionCount: 2 });
  check(misconceptionStart !== null, "T repeated misconception enters");
}

