import type { AiEvaluation, LearningMode } from "@/lib/types/chat";
import type { MasteryState } from "@/lib/mastery/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { AdaptiveTurnStrategy } from "@/lib/adaptive/types";

export const HINT_TYPES = [
  "none",
  "observation",
  "partial_criterion",
  "core_criterion",
  "worked_example",
  "answer_reveal",
  "misconception_correction",
] as const;

export type HintType = (typeof HINT_TYPES)[number];
export type AdaptiveHintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface HintState {
  conceptId: string;
  hintLevel: AdaptiveHintLevel;
  hintHistory: HintType[];
  lastHintType: HintType;
  hintCount: number;
  revealedEvidence: string[];
  maintainFocus: boolean;
}

export interface HintEngineInput {
  conceptId: string;
  evaluation: AiEvaluation;
  confidence: number;
  mastery: MasteryState;
  learningMode: LearningMode;
  previous?: HintState | null;
  workedExampleActive?: boolean;
  activeMisconceptionProfile?: MisconceptionProfile | null;
  adaptiveStrategy?: AdaptiveTurnStrategy | null;
}
