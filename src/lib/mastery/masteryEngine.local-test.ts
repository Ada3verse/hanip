import { calculateMastery, createInitialMasteryState, isMastered } from "./masteryEngine";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { createDialoguePlan } from "@/lib/dialogue/dialoguePlanner";

function check(value: boolean, label: string) {
  if (!value) throw new Error(`Mastery test failed: ${label}`);
}

const NOW = "2026-07-15T00:00:00.000Z";

export function runMasteryEngineLocalTests() {
  const initial = createInitialMasteryState("품사", NOW);
  const correct = calculateMastery({ conceptId: "품사", evaluation: "correct", evaluationConfidence: 0.9, previous: initial, now: NOW });
  check(correct.masteryScore > 0, "A correct increases score");
  const partial = calculateMastery({ conceptId: "품사", evaluation: "partial_correct", evaluationConfidence: 0.8, previous: initial, now: NOW });
  check(partial.masteryScore > 0 && partial.masteryScore < correct.masteryScore, "B partial small increase");
  const misconception = calculateMastery({ conceptId: "품사", evaluation: "misconception", evaluationConfidence: 0.9, previous: { ...initial, masteryScore: 50 }, now: NOW });
  check(misconception.masteryScore < 50 && misconception.needsReview, "C misconception decrease");
  const unknown = calculateMastery({ conceptId: "품사", evaluation: "unknown", evaluationConfidence: 0.8, previous: { ...initial, masteryScore: 30 }, now: NOW });
  check(unknown.masteryScore < 30, "D unknown decrease");
  const applyFail = calculateMastery({ conceptId: "품사", evaluation: "apply_fail", evaluationConfidence: 0.8, previous: { ...initial, masteryScore: 30 }, now: NOW });
  check(applyFail.masteryScore < unknown.masteryScore, "E apply fail decreases more");
  const streak = calculateMastery({ conceptId: "품사", evaluation: "correct", evaluationConfidence: 0.9, previous: correct, now: NOW });
  check(streak.correctStreak === 2 && streak.masteryScore - correct.masteryScore > correct.masteryScore, "F streak bonus");
  const mastered = calculateMastery({ conceptId: "품사", evaluation: "correct", evaluationConfidence: 0.9, previous: { ...initial, masteryScore: 75, correctStreak: 1 }, completionEvidence: ["판단 기준 설명 성공", "새 예문 적용 성공"], now: NOW });
  check(isMastered(mastered) && mastered.nextReviewAt !== null, "G mastered conditions");
  check(mastered.reviewInterval === 1, "H first review interval");
  const reviewSuccess = calculateMastery({ conceptId: "품사", evaluation: "correct", evaluationConfidence: 0.9, previous: mastered, now: "2026-07-16T00:00:00.000Z" });
  check(reviewSuccess.reviewInterval === 3, "I interval grows");
  const reviewFail = calculateMastery({ conceptId: "품사", evaluation: "apply_fail", evaluationConfidence: 0.9, previous: reviewSuccess, now: "2026-07-19T00:00:00.000Z" });
  check(reviewFail.needsReview && reviewFail.reviewInterval === 1, "J review failure returns");
  check(reviewFail.correctStreak === 0, "K failure resets streak");
  check(reviewSuccess.reviewCount > mastered.reviewCount, "L review count");
  check(reviewSuccess.lastReviewedAt === "2026-07-16T00:00:00.000Z", "M review timestamp");
  check(reviewSuccess.confidence === 0.9 && reviewSuccess.nextReviewAt === "2026-07-19T00:00:00.000Z", "N confidence and next review stored");
  const learningState = calculateLearningState({ studentModel: { currentConcept: "품사", lastEvaluation: "correct" }, masteryState: reviewFail });
  check(learningState.review.required && learningState.tutorStrategy === "review", "O LearningState review integration");
  const dialoguePlan = createDialoguePlan({ learningState, studentModel: { currentConcept: "품사", lastEvaluation: "correct" }, messages: [{ role: "user", content: "관형사요" }] });
  check(dialoguePlan.reason.includes("mastery_review_priority"), "P Dialogue review priority");
}
