import { createEmptyLearningProgress } from "@/lib/progress/progressStorage";
import { createEmptyLearningUserData, normalizeLearningUserData } from "@/lib/repository/localLearningRepository";
import type { LearningRepository } from "@/lib/repository/learningRepository";
import type { LearningDataExport, LearningUserData, RepositoryImportResult, StoredLearningSession } from "@/lib/repository/types";
import type { FirebaseRepositoryMigrationResult, FirebaseRepositoryOptions } from "./types";
import { createEmptyRuntimeStudentModel, normalizeRuntimeStudentModel } from "@/lib/studentModel/studentModelEngine";

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

export class FirebaseLearningRepository implements LearningRepository {
  readonly provider = "firebase" as const;
  readonly networkCalls = 0;
  private readonly documents: Map<string, unknown>;
  constructor(readonly options: FirebaseRepositoryOptions) { this.documents = options.seed ?? new Map(); }
  private read(userId: string) { const value = this.documents.get(userId); return value ? normalizeLearningUserData(value, userId) : null; }
  async loadUserData(userId: string) { return this.read(userId); }
  async saveUserData(userId: string, data: LearningUserData) { this.documents.set(userId, normalizeLearningUserData({ ...data, userId }, userId)); }
  async loadSession(userId: string, sessionId: string) { return this.read(userId)?.sessions.find((item) => item.sessionId === sessionId) ?? null; }
  async saveSession(userId: string, session: StoredLearningSession) { const data = this.read(userId) ?? createEmptyLearningUserData(userId); await this.saveUserData(userId, { ...data, currentSessionId: session.sessionId, studentModel: normalizeRuntimeStudentModel(session.studentModel.studentProfile ?? data.studentModel), sessions: [...data.sessions.filter((item) => item.sessionId !== session.sessionId), session] }); }
  async listSessions(userId: string) { return this.read(userId)?.sessions ?? []; }
  async deleteSession(userId: string, sessionId: string) { const data = this.read(userId); if (data) await this.saveUserData(userId, { ...data, currentSessionId: data.currentSessionId === sessionId ? null : data.currentSessionId, sessions: data.sessions.filter((item) => item.sessionId !== sessionId) }); }
  async resetCurrentSession(userId: string) { const data = this.read(userId); if (data) await this.saveUserData(userId, { ...data, sessions: data.sessions.filter(({ sessionId }) => sessionId !== data.currentSessionId), currentSessionId: null, goalState: null }); }
  async resetLearningProgress(userId: string) { const data = this.read(userId); if (data) await this.saveUserData(userId, { ...data, sessions: [], currentSessionId: null, studentModel: createEmptyRuntimeStudentModel(), progress: createEmptyLearningProgress(), masteryProfiles: [], hintStates: [], workedExampleStates: [], misconceptionProfiles: [], adaptiveProfiles: [], goalState: null, sessionSummaries: [] }); }
  async exportUserData(userId: string): Promise<LearningDataExport> { return { schemaVersion: 2, exportedAt: new Date().toISOString(), data: this.read(userId) ?? createEmptyLearningUserData(userId) }; }
  async importUserData(userId: string, value: unknown): Promise<RepositoryImportResult> {
    if (!record(value)) return { success: false, error: "INVALID_DATA" };
    if (typeof value.schemaVersion === "number" && value.schemaVersion > 2) return { success: false, error: "UNSUPPORTED_VERSION" };
    if (![1, 2].includes(Number(value.schemaVersion)) || !record(value.data) || value.data.userId !== userId) return { success: false, error: "INVALID_DATA" };
    const data = normalizeLearningUserData(value.data, userId); await this.saveUserData(userId, data); return { success: true, data };
  }
  async migrate(): Promise<FirebaseRepositoryMigrationResult> { return { migrated: false, reason: "stub_no_remote_migration" }; }
}
