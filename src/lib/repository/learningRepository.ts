import type {
  LearningDataExport,
  LearningUserData,
  RepositoryImportResult,
  StoredLearningSession,
} from "./types";
import type { RepositoryProvider } from "./types";

export interface LearningRepository {
  readonly provider: RepositoryProvider;
  loadUserData(userId: string): Promise<LearningUserData | null>;
  saveUserData(userId: string, data: LearningUserData): Promise<void>;
  loadSession(userId: string, sessionId: string): Promise<StoredLearningSession | null>;
  saveSession(userId: string, session: StoredLearningSession): Promise<void>;
  listSessions(userId: string): Promise<StoredLearningSession[]>;
  deleteSession(userId: string, sessionId: string): Promise<void>;
  resetCurrentSession(userId: string): Promise<void>;
  resetLearningProgress(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<LearningDataExport>;
  importUserData(userId: string, data: unknown): Promise<RepositoryImportResult>;
}
