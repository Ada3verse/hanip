import type { AiEvaluation, StudentResponseMode } from "@/lib/types/chat";
import type { HintState } from "@/lib/hint/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { WorkedExampleState } from "@/lib/workedExample/types";

export type AdaptiveLearningStyle =
  | "choice_preferred"
  | "free_input_preferred"
  | "scaffold_needed"
  | "example_preferred"
  | "concise_preferred"
  | "balanced";

export type AdaptiveQuestionType =
  | "choice"
  | "keyword"
  | "short_reason"
  | "application";

export interface AdaptiveProfile {
  studentId: string;
  concept: string;
  learningStyle: AdaptiveLearningStyle;
  preferredQuestionType: AdaptiveQuestionType;
  preferredHintLevel: 0 | 1 | 2 | 3 | 4;
  needsWorkedExample: boolean;
  freeInputRate: number;
  choiceRate: number;
  averageConfidence: number;
  averageHintLevel: number;
  misconceptionRate: number;
  masterySpeed: number;
  reviewSuccessRate: number;
  styleHistory: AdaptiveLearningStyle[];
}

export interface AdaptiveEngineInput {
  studentId?: string;
  concept: string;
  responseModes?: readonly StudentResponseMode[];
  evaluations?: readonly { evaluation: AiEvaluation; confidence: number }[];
  hintStates?: readonly HintState[];
  workedExamples?: readonly WorkedExampleState[];
  masteryStates?: readonly MasteryState[];
  previous?: AdaptiveProfile | null;
}

export interface AdaptiveTurnStrategy {
  personalized: boolean;
  questionType: AdaptiveQuestionType;
  includeChoices: boolean;
  maxExplanationSentences: 1 | 2 | 3;
  hintPacing: "slow" | "standard" | "supportive";
  workedExampleThreshold: "early" | "standard";
  confirmationTurns: 1 | 2;
}
