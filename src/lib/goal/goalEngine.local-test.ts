import { createDialoguePlan } from "@/lib/dialogue/dialoguePlanner";
import { createInitialHintState } from "@/lib/hint/hintEngine";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { createInitialMasteryState } from "@/lib/mastery/masteryEngine";
import { createSessionSummary } from "@/lib/sessionSummary/sessionSummaryEngine";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import { calculateGoalState } from "./goalEngine";

function check(value: boolean, label: string) {
  if (!value) throw new Error(`Goal test failed: ${label}`);
}

export function runGoalEngineLocalTests() {
  const conceptId = "numeral-vs-numeral-determiner";
  const mastery = { ...createInitialMasteryState(conceptId, "2026-07-15T00:00:00.000Z"), masteryScore: 20, confidence: 0.6 };
  const hint = createInitialHintState(conceptId);
  const base = {
    currentConcept: "수사와 수 관형사 구분", routeCurrentConcept: conceptId,
    routeRemainingConcepts: [conceptId, "particle"], routeCompletedConcepts: ["numeral"],
    mastery, reviewRequired: false, reviewConcept: null, evaluation: "unknown" as const,
    hint, workedExample: null, completionConfirmed: false,
  };
  const initial = calculateGoalState(base);
  check(initial.currentGoal.includes("수사와 수 관형사") && initial.currentGoal.includes("구분하기"), "A goal generated");
  check(initial.missionTitle === "현재 생각 확인하기", "B mission generated");
  check(initial.missionHistory.length === 1, "C one active mission recorded");
  check(initial.goalProgress >= 0 && initial.goalProgress <= 100, "D progress range");
  check(initial.nextGoal === "조사 이해하기", "E next goal");
  check(initial.estimatedRemaining > 0, "F remaining steps");

  const partial = calculateGoalState({ ...base, evaluation: "partial_correct", previous: initial });
  check(partial.goalProgress >= initial.goalProgress, "G progress does not decrease");
  const correct = calculateGoalState({ ...base, evaluation: "correct", mastery: { ...mastery, masteryScore: 60 }, previous: partial });
  check(correct.goalProgress > partial.goalProgress, "H evaluation and mastery increase progress");
  check(correct.missionTitle === "새 예문에 적용하기", "I mission changes after correct");

  const review = calculateGoalState({ ...base, reviewRequired: true, reviewConcept: "조사", previous: correct });
  check(review.currentGoal === "조사 다시 확인하기", "J review goal priority");
  check(review.missionTitle.includes("헷갈린"), "K review mission");
  const worked: WorkedExampleState = { conceptId, exampleId: "ex", exampleTitle: "두 학생", exampleStep: 2, exampleAttempts: 1, originQuestion: "질문", originConcept: conceptId, returnConcept: "수사와 수 관형사 구분", completedExample: false, exampleHistory: ["ex"] };
  const exampleGoal = calculateGoalState({ ...base, workedExample: worked });
  check(exampleGoal.missionTitle.includes("비슷한 예제"), "L worked example mission");

  const mastered = { ...mastery, masteryScore: 90, confidence: 0.9, correctStreak: 3, masteredAt: "2026-07-15T00:00:00.000Z" };
  const completed = calculateGoalState({ ...base, mastery: mastered, evaluation: "correct", completionConfirmed: true, previous: correct });
  check(completed.goalProgress === 100 && completed.missionCompleted, "M goal completed");
  check(completed.completedGoals.includes(completed.currentGoal), "N completed goal stored");
  const learningState = calculateLearningState({ currentConcept: "수사와 수 관형사 구분", studentModel: { goalState: initial }, masteryState: mastery, goalState: initial });
  check(learningState.goal?.currentGoal === initial.currentGoal, "O LearningState integration");
  const plan = createDialoguePlan({ learningState, studentModel: {}, goalState: initial });
  check(plan.reason.includes("goal_and_mission_locked"), "P Dialogue integration");
  const summary = createSessionSummary({ learningState, masteryStates: [mastered], evaluationHistory: [], workedExampleStates: [worked], hintStates: [hint], goalState: completed });
  check(summary.completedGoals.includes(completed.currentGoal) && summary.nextGoal === completed.nextGoal, "Q Session Summary integration");
  const next = calculateGoalState({ ...base, routeCurrentConcept: "particle", routeRemainingConcepts: ["particle"], routeCompletedConcepts: [conceptId], previous: completed });
  check(next.currentGoal === "조사 이해하기" && next.currentGoal !== completed.currentGoal, "R next goal transition");
}

