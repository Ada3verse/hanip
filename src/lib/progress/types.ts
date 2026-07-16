import type { LearningGoal, LearningMode } from "@/lib/types/chat";
import type { MasteryState } from "@/lib/mastery/types";

export const CONCEPT_PROGRESS_STATUSES = [
  "not_started",
  "learning",
  "needs_review",
  "understood",
] as const;

export type ConceptProgressStatus =
  (typeof CONCEPT_PROGRESS_STATUSES)[number];

export interface ConceptProgress {
  conceptId: string;
  conceptName: string;
  status: ConceptProgressStatus;
  masteryScore: number;
  successfulApplications: number;
  misconceptionIds: string[];
  needsSupportCount: number;
  completedSessionCount: number;
  lastLearningMode: LearningMode;
  lastLearningGoal: LearningGoal;
  lastStudiedAt: string;
  mastery?: MasteryState;
}

export interface LearningProgress {
  version: 1;
  updatedAt: string;
  totalSessions: number;
  concepts: ConceptProgress[];
}
