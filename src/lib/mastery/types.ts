import type { AiEvaluation } from "@/lib/types/chat";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { StudentConceptState } from "@/lib/studentModel/types";

export const MASTERY_REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export interface MasteryState {
  conceptId: string;
  masteryScore: number;
  confidence: number;
  correctStreak: number;
  lastReviewedAt: string;
  needsReview: boolean;
  reviewCount: number;
  masteredAt: string | null;
  reviewInterval: number;
  nextReviewAt: string | null;
}

export interface MasteryEngineInput {
  conceptId: string;
  evaluation: AiEvaluation;
  evaluationConfidence: number;
  previous?: MasteryState | null;
  completionEvidence?: readonly string[];
  matchedMisconceptions?: readonly string[];
  now?: string;
  workedExampleSuccess?: boolean;
  misconceptionProfiles?: readonly MisconceptionProfile[];
  studentConceptState?: StudentConceptState;
}
