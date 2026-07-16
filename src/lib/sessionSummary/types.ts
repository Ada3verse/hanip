import type { AnswerEvaluationResult } from "@/lib/evaluation/types";
import type { HintState } from "@/lib/hint/types";
import type { LearningState } from "@/lib/learningState/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import type { GoalState } from "@/lib/goal/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { AdaptiveProfile } from "@/lib/adaptive/types";

export interface SessionEvaluationRecord {
  concept: string;
  evaluation: AnswerEvaluationResult["evaluation"];
  misconception: string;
  confidence: number;
}

export interface SummaryState {
  completedConcepts: string[];
  reviewConcepts: string[];
  masteredConcepts: string[];
  misconceptions: string[];
  workedExamplesUsed: string[];
  hintUsage: string[];
  confidenceSummary: "low" | "medium" | "high";
  recommendedNextConcept: string;
  recommendedReviewDate: string | null;
  sessionDuration: number;
  summary: string[];
  completedGoals: string[];
  nextGoal: string | null;
  missionCompleted: boolean;
  newMisconceptions: string[];
  resolvedMisconceptions: string[];
  remainingMisconceptions: string[];
  learningStyleChanges: string[];
}

export interface SessionSummaryEngineInput {
  learningState: LearningState;
  masteryStates: readonly MasteryState[];
  evaluationHistory: readonly SessionEvaluationRecord[];
  workedExampleStates: readonly WorkedExampleState[];
  hintStates: readonly HintState[];
  understoodConcepts?: readonly string[];
  needsSupportConcepts?: readonly string[];
  sessionStartedAt?: string;
  now?: string;
  goalState?: GoalState | null;
  misconceptionProfiles?: readonly MisconceptionProfile[];
  adaptiveProfile?: AdaptiveProfile | null;
}
