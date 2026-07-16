import { calculateLearningState } from "./learningStateEngine";
import type { LearningProgress } from "@/lib/progress/types";
import type { StudentSessionModel } from "@/lib/types/chat";

const BASE_MODEL: StudentSessionModel = {
  currentConcept: "품사", currentFlowStage: "진단", understoodConcepts: [],
  needsSupportConcepts: [], misconceptions: [], lastEvaluation: null,
  lastNextAction: null, confidence: null, consecutiveSuggestedReplyUses: 0,
  lastResponseMode: null, hintLevel: 0, consecutiveUnknownResponses: 0,
  learningStatus: "in_progress", completionEvidence: [], learningMode: "learn",
  learningGoal: "concept", priorProgressLoaded: false, priorMasteryScore: null,
  priorConceptStatus: null, activePrerequisite: null, completedPrerequisites: [],
  prerequisiteReturnConcept: null, learningRoute: null, suspendedConcept: null,
};

const PROGRESS: LearningProgress = {
  version: 1,
  updatedAt: "2026-07-15T00:00:00.000Z",
  totalSessions: 1,
  concepts: [{
    conceptId: "parts-of-speech-overview", conceptName: "품사",
    status: "learning", masteryScore: 45, successfulApplications: 0,
    misconceptionIds: [], needsSupportCount: 1, completedSessionCount: 0,
    lastLearningMode: "learn", lastLearningGoal: "concept",
    lastStudiedAt: "2026-07-15T00:00:00.000Z",
  }],
};

export function runLearningStateLocalTests() {
  const check = (condition: boolean, label: string) => {
    if (!condition) throw new Error(`Learning State local test failed: ${label}`);
  };
  const initial = calculateLearningState({ studentModel: BASE_MODEL });
  check(initial.currentConcept === "품사", "A: state creation");
  const withProgress = calculateLearningState({ studentModel: BASE_MODEL, learningProgress: PROGRESS });
  check(withProgress.masteryScore === 45, "B: progress change");
  check(withProgress.dependencyState?.missingPrerequisite === "morpheme", "C: dependency");
  const hinted = calculateLearningState({ studentModel: { ...BASE_MODEL, hintLevel: 2 } });
  check(hinted.hintLevel === 2 && hinted.reason.includes("hint_level_2"), "D: hint");
  const misconception = calculateLearningState({ studentModel: { ...BASE_MODEL, misconceptions: ["meaning-only"], lastEvaluation: "misconception" } });
  check(misconception.reviewRequired && misconception.tutorStrategy === "review", "E: misconception");
  const completed = calculateLearningState({ studentModel: { ...BASE_MODEL, learningStatus: "completed", understoodConcepts: ["품사"], completionEvidence: ["기준 설명", "새 예문 적용"], lastEvaluation: "correct", confidence: 0.9 }, adaptiveLevel: 3 });
  check(completed.completionState.complete && completed.tutorStrategy === "mastery", "F: completion");
  const review = calculateLearningState({ studentModel: { ...BASE_MODEL, needsSupportConcepts: ["품사"] } });
  check(review.reviewRequired, "G: review");
  const routed = calculateLearningState({ studentModel: { ...BASE_MODEL, learningRoute: { targetConcept: "numeral-vs-numeral-determiner", route: ["morpheme", "word", "numeral-vs-numeral-determiner"], currentIndex: 1, completedConcepts: ["morpheme"], startedAt: "2026-07-15T00:00:00.000Z" } } });
  check(routed.learningRouteState.currentConcept === "word" && routed.nextRecommendedConcept === "numeral-vs-numeral-determiner", "H: route");
  check(initial.masteryScore === 0 && initial.tutorStrategy === "discover", "I: new session");
  check(withProgress.reason.includes("needs_support") || withProgress.masteryScore === 45, "J: long progress");
  const currentWins = calculateLearningState({ studentModel: { ...BASE_MODEL, lastEvaluation: "unknown", priorConceptStatus: "understood" }, learningProgress: PROGRESS });
  check(currentWins.tutorStrategy === "discover", "K: current session priority");
  const combined = calculateLearningState({ studentModel: { ...BASE_MODEL, hintLevel: 2, misconceptions: ["meaning-only"], needsSupportConcepts: ["형태소"], lastEvaluation: "misconception" }, learningProgress: PROGRESS });
  check(combined.reviewRequired && combined.dependencyState !== null && combined.reason.length >= 3, "L: simultaneous changes");
  return 12;
}
