import type {
  LearningGoal,
  LearningMode,
  LearningStatus,
  TutorStrategy,
  AiEvaluation,
} from "@/lib/types/chat";
import type { DependencyResult } from "@/lib/knowledge/dependency/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { HintState } from "@/lib/hint/types";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import type { GoalState } from "@/lib/goal/types";
import type { AdaptiveProfile } from "@/lib/adaptive/types";

export type LearningRouteState = {
  active: boolean;
  targetConcept: string | null;
  currentConcept: string | null;
  remainingConcepts: string[];
  completedConcepts: string[];
};

export type CompletionState = {
  status: LearningStatus;
  evidence: string[];
  complete: boolean;
};

export type LearningState = {
  currentConcept: string;
  evaluation: AiEvaluation | null;
  learningStatus: LearningStatus;
  masteryScore: number;
  tutorStrategy: TutorStrategy;
  learningMode: LearningMode;
  learningGoal: LearningGoal;
  dependencyState: DependencyResult | null;
  learningRouteState: LearningRouteState;
  hintLevel: 0 | 1 | 2 | 3;
  misconception: string;
  completionState: CompletionState;
  reviewRequired: boolean;
  nextRecommendedConcept: string | null;
  reason: string[];
  mastery: MasteryState;
  review: {
    required: boolean;
    concept: string | null;
  };
  nextReview: string | null;
  recommendedReviewConcept: string | null;
  hint: HintState;
  workedExample: WorkedExampleState | null;
  sessionSummaryReady: boolean;
  goal: GoalState | null;
  adaptive: AdaptiveProfile | null;
};
