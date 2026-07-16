import type { AiEvaluation } from "@/lib/types/chat";

export interface MisconceptionProfile {
  concept: string;
  misconceptionId: string;
  misconceptionType: string;
  frequency: number;
  lastOccurred: string;
  resolved: boolean;
  resolvedAt: string | null;
  reviewPriority: number;
  relatedExamples: string[];
  relatedHints: string[];
  successStreak: number;
}

export interface MisconceptionLearningInput {
  concept: string;
  evaluation: AiEvaluation;
  matchedMisconceptions: readonly string[];
  existingProfiles?: readonly MisconceptionProfile[];
  relatedExamples?: readonly string[];
  relatedHints?: readonly string[];
  now?: string;
}

