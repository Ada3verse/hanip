import type { AiEvaluation } from "@/lib/types/chat";
import type { HintState } from "@/lib/hint/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { WorkedExampleState } from "@/lib/workedExample/types";

export interface GoalState {
  currentGoal: string;
  goalReason: string[];
  goalProgress: number;
  completedGoals: string[];
  nextGoal: string | null;
  missionTitle: string;
  missionDescription: string;
  missionCompleted: boolean;
  missionHistory: string[];
  estimatedRemaining: number;
}

export interface GoalEngineInput {
  currentConcept: string;
  routeCurrentConcept: string | null;
  routeRemainingConcepts: readonly string[];
  routeCompletedConcepts: readonly string[];
  mastery: MasteryState;
  reviewRequired: boolean;
  reviewConcept: string | null;
  evaluation: AiEvaluation | null;
  hint: HintState;
  workedExample: WorkedExampleState | null;
  completionConfirmed: boolean;
  previous?: GoalState | null;
}

