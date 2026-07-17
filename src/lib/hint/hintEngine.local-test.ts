import { createDialoguePlan } from "@/lib/dialogue/dialoguePlanner";
import { retrieveKnowledge } from "@/lib/knowledge/retrieval/retrievalEngine";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { createInitialMasteryState } from "@/lib/mastery/masteryEngine";
import { calculateHintState, createInitialHintState } from "./hintEngine";

function check(value: boolean, label: string) {
  if (!value) throw new Error(`Hint test failed: ${label}`);
}

export function runHintEngineLocalTests() {
  const conceptId = "numeral-vs-numeral-determiner";
  const mastery = createInitialMasteryState(conceptId, "2026-07-15T00:00:00.000Z");
  const next = (evaluation: "unknown" | "partial_correct" | "misconception" | "apply_fail" | "correct", previous = createInitialHintState(conceptId), learningMode: "learn" | "review" = "learn", confidence = 0.8) =>
    calculateHintState({ conceptId, evaluation, confidence, mastery, learningMode, previous });
  const level1 = next("unknown");
  check(level1.hintLevel === 1 && level1.lastHintType === "observation", "A level 1");
  const level2 = next("unknown", level1);
  check(level2.hintLevel === 2 && level2.lastHintType === "partial_criterion", "B level 2");
  const level3 = next("unknown", level2);
  check(level3.hintLevel === 3 && level3.lastHintType === "core_criterion", "C level 3");
  const level4 = next("unknown", level3);
  check(level4.hintLevel === 4 && level4.lastHintType === "worked_example", "D level 4");
  const level5 = next("apply_fail", level4);
  check(level5.hintLevel === 5 && level5.lastHintType === "answer_reveal", "E level 5 after minimum hints");
  check(level1.hintCount === 1 && level4.hintCount === 4, "F unknown increments");
  const misconception = next("misconception");
  check(misconception.lastHintType === "misconception_correction" && misconception.hintLevel >= 2, "G misconception correction");
  const partial = next("partial_correct", level2);
  check(partial.hintLevel === level2.hintLevel, "H partial keeps level");
  const correct = next("correct", level4);
  check(correct.hintLevel === 0 && correct.hintHistory.length === 0, "I correct resets");
  const review = next("unknown", createInitialHintState(conceptId), "review");
  check(review.hintLevel === 4 && review.lastHintType === "worked_example", "J review prioritizes example");
  const highMastery = { ...mastery, masteryScore: 90, confidence: 0.9 };
  const highHint = calculateHintState({ conceptId, evaluation: "unknown", confidence: 0.9, mastery: highMastery, learningMode: "learn", previous: level2 });
  check(highHint.hintLevel <= 2, "K high mastery minimizes hint");
  const lowConfidence = next("unknown", createInitialHintState(conceptId), "learn", 0.4);
  check(lowConfidence.lastHintType === "observation", "L low confidence observation");
  check(level3.revealedEvidence.includes("핵심 판단 기준"), "M revealed evidence");
  check(level4.maintainFocus, "N maintain focus");
  const learningState = calculateLearningState({ studentModel: { currentConcept: "수사와 수 관형사", lastEvaluation: "unknown" }, masteryState: mastery, hintState: level3 });
  check(learningState.hint.hintLevel === 3, "O LearningState integration");
  const dialoguePlan = createDialoguePlan({ learningState, studentModel: { currentConcept: "수사와 수 관형사", lastEvaluation: "unknown" }, messages: [{ role: "user", content: "모르겠어" }] });
  check(dialoguePlan.hintLevel === 3 && dialoguePlan.hintType === "core_criterion" && dialoguePlan.action === "explain", "P Dialogue integration");
  const retrieval = retrieveKnowledge({ dialoguePlan, recentStudentMessage: "모르겠어" });
  check(retrieval.usedEvidence.length > 0 && retrieval.knowledgeFound && retrieval.usedEvidence.every(({ role }) => ["definition", "example", "teacher_strategy", "misconception"].includes(role)), "Q retrieval level evidence");
  const earlyReveal = next("apply_fail", level2);
  check(earlyReveal.hintLevel < 5 && earlyReveal.lastHintType !== "answer_reveal", "R no early answer reveal");
}
