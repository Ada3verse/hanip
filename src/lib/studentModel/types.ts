import type { TeachingStrategy } from "@/lib/dialogue/types";
import type { AiEvaluation } from "@/lib/types/chat";

export type UnderstandingLevel = 0 | 1 | 2 | 3;
export type StudentConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface StudentConceptState {
  understandingLevel: UnderstandingLevel;
  confidence: StudentConfidence;
  misconceptionSummary?: string;
  evidenceCount: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastEvaluation?: AiEvaluation;
  updatedAt: string;
}

export interface ExplanationHistoryEntry {
  conceptId: string;
  strategy: TeachingStrategy;
  explanationStrategy?: import("@/lib/explanation/types").ExplanationStrategy;
  exampleIds: string[];
  analogyId: string | null;
  usedAt: string;
}

export interface RuntimeStudentModel {
  schemaVersion: 1;
  concepts: Record<string, StudentConceptState>;
  masteredConcepts: string[];
  explanationHistory: ExplanationHistoryEntry[];
  recentConcepts: string[];
  updatedAt: string;
}
