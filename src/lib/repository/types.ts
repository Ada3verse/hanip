import type { AdaptiveProfile } from "@/lib/adaptive/types";
import type { GoalState } from "@/lib/goal/types";
import type { HintState } from "@/lib/hint/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { LearningProgress } from "@/lib/progress/types";
import type { SummaryState } from "@/lib/sessionSummary/types";
import type {
  ChatMessage,
  LearningGoal,
  LearningMode,
  StudentSessionModel,
} from "@/lib/types/chat";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import type { UserSettings } from "@/lib/settings/types";

export const LEARNING_REPOSITORY_SCHEMA_VERSION = 1 as const;

export interface LearningSettings extends UserSettings {
  learningMode: LearningMode;
  learningGoal: LearningGoal;
}

export interface StoredLearningSession {
  sessionId: string;
  messages: ChatMessage[];
  studentModel: StudentSessionModel;
  learningMode: LearningMode;
  learningGoal: LearningGoal;
  activeSuggestedReplies: string[];
  lastWorkedExampleId: string | null;
  contextSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningUserData {
  schemaVersion: 1;
  userId: string;
  currentSessionId: string | null;
  sessions: StoredLearningSession[];
  studentModel: StudentSessionModel | null;
  progress: LearningProgress;
  masteryProfiles: MasteryState[];
  hintStates: HintState[];
  workedExampleStates: WorkedExampleState[];
  misconceptionProfiles: MisconceptionProfile[];
  adaptiveProfiles: AdaptiveProfile[];
  goalState: GoalState | null;
  sessionSummaries: SummaryState[];
  settings: LearningSettings;
  createdAt: string;
  updatedAt: string;
}

export interface LearningDataExport {
  schemaVersion: 1;
  exportedAt: string;
  data: LearningUserData;
}

export interface RepositoryImportResult {
  success: boolean;
  error?: "INVALID_DATA" | "UNSUPPORTED_VERSION" | "SAVE_FAILED";
  data?: LearningUserData;
}

export type RepositoryProvider = "local" | "firebase";
