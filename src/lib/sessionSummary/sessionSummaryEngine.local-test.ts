import { createDialoguePlan } from "@/lib/dialogue/dialoguePlanner";
import { evaluateStudentAnswer } from "@/lib/evaluation/evaluationEngine";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { createInitialMasteryState } from "@/lib/mastery/masteryEngine";
import { createInitialHintState } from "@/lib/hint/hintEngine";
import type { MasteryState } from "@/lib/mastery/types";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import { createSessionSummary, isSessionEndIntent } from "./sessionSummaryEngine";

function check(value: boolean, label: string) {
  if (!value) throw new Error(`Session Summary test failed: ${label}`);
}

export function runSessionSummaryEngineLocalTests() {
  const now = "2026-07-15T01:00:00.000Z";
  const mastered: MasteryState = {
    ...createInitialMasteryState("numeral", now), masteryScore: 90, confidence: 0.9,
    correctStreak: 3, masteredAt: now, nextReviewAt: "2026-07-18T01:00:00.000Z",
    reviewInterval: 3,
  };
  const review: MasteryState = {
    ...createInitialMasteryState("particle", now), masteryScore: 45, confidence: 0.6,
    needsReview: true, nextReviewAt: "2026-07-16T01:00:00.000Z",
  };
  const learningState = calculateLearningState({
    currentConcept: "수사와 수 관형사 구분",
    studentModel: {
      learningStatus: "completed", lastEvaluation: "correct",
      completionEvidence: ["판별 기준", "새 예문 적용"], understoodConcepts: ["수사"],
    },
    masteryState: mastered,
  });
  const worked: WorkedExampleState = {
    conceptId: "numeral", exampleId: "example-1", exampleTitle: "두 학생",
    exampleStep: 5, exampleAttempts: 3, originQuestion: "두는 무엇일까?",
    originConcept: "수사", returnConcept: "수사", completedExample: true,
    exampleHistory: ["example-1", "1:correct"],
  };
  const summary = createSessionSummary({
    learningState,
    masteryStates: [mastered, review],
    evaluationHistory: [
      { concept: "수사", evaluation: "correct", misconception: "", confidence: 0.9 },
      { concept: "조사", evaluation: "misconception", misconception: "조사-어미-혼동", confidence: 0.7 },
    ],
    workedExampleStates: [worked],
    hintStates: [{ ...createInitialHintState("numeral"), hintLevel: 4, hintCount: 4, lastHintType: "worked_example", hintHistory: ["observation", "worked_example"] }],
    understoodConcepts: ["수사"], needsSupportConcepts: ["조사"],
    sessionStartedAt: "2026-07-15T00:30:00.000Z", now,
  });
  check(isSessionEndIntent("오늘은 여기까지"), "A end intent");
  check(isSessionEndIntent("오늘 끝"), "B alternate end intent");
  check(summary.completedConcepts.includes("수사"), "C completed concept");
  check(summary.masteredConcepts.includes("수사"), "D mastery complete");
  check(summary.reviewConcepts.includes("조사"), "E review exists");
  check(summary.misconceptions.includes("조사-어미-혼동"), "F misconception included");
  check(summary.workedExamplesUsed.includes("example-1"), "G worked example included");
  check(summary.hintUsage.includes("worked_example"), "H hint included");
  check(summary.recommendedNextConcept === "복습: 조사", "I review recommended first");
  check(Boolean(summary.recommendedReviewDate?.startsWith("2026-07-16")), "J earliest review date");
  check(summary.sessionDuration === 1800, "K duration");
  check(summary.summary.length <= 5, "L five lines max");
  check(!summary.summary.join(" ").includes("0.9"), "M confidence hidden");
  check(!summary.summary.join(" ").includes("masteryScore"), "N internal state hidden");

  const noReview = createSessionSummary({
    learningState: { ...learningState, review: { required: false, concept: null }, reviewRequired: false, learningRouteState: { active: true, targetConcept: "particle", currentConcept: "numeral", remainingConcepts: ["numeral", "particle"], completedConcepts: ["numeral"] } },
    masteryStates: [mastered], evaluationHistory: [], workedExampleStates: [], hintStates: [], now,
  });
  check(noReview.recommendedNextConcept === "조사", "O route next recommendation");
  const finished = createSessionSummary({ learningState: { ...learningState, review: { required: false, concept: null }, reviewRequired: false, learningRouteState: { active: false, targetConcept: null, currentConcept: null, remainingConcepts: [], completedConcepts: [] }, nextRecommendedConcept: null }, masteryStates: [mastered], evaluationHistory: [], workedExampleStates: [], hintStates: [], now });
  check(finished.recommendedNextConcept === "이번 학습 완료", "P route complete message");
  const plan = createDialoguePlan({ learningState, studentModel: {}, messages: [{ role: "user", content: "여기까지" }] });
  check(plan.action === "complete", "Q dialogue completion action");
  const evaluation = evaluateStudentAnswer({ studentAnswer: "오늘 끝", activeConcept: "수사", dialoguePlan: plan, retrievedEvidence: { reason: [], selectedSources: [], usedEvidence: [] }, misconceptionLibrary: [], completionCriteria: [], previousEvaluation: "correct" });
  check(evaluation.evaluation === "correct" && evaluation.reason.includes("session_end_intent_not_evaluated"), "R end intent preserves evaluation");
}
