import { deleteDoc, doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { createEmptyLearningProgress } from "@/lib/progress/progressStorage";
import { createEmptyLearningUserData, normalizeLearningUserData } from "@/lib/repository/localLearningRepository";
import type { LearningRepository } from "@/lib/repository/learningRepository";
import type { LearningDataExport, LearningUserData, RepositoryImportResult, StoredLearningSession } from "@/lib/repository/types";
import { fromFirestoreUserDocument, toFirestoreUserDocument } from "./firestoreMapper";

export interface FirestoreDocumentGateway { get(uid: string): Promise<unknown | null>; set(uid: string, value: Record<string, unknown>): Promise<void>; delete(uid: string): Promise<void>; }
export function createFirestoreDocumentGateway(firestore: Firestore): FirestoreDocumentGateway {
  return { async get(uid) { const snapshot = await getDoc(doc(firestore, "users", uid)); return snapshot.exists() ? snapshot.data() : null; },
    async set(uid, value) { await setDoc(doc(firestore, "users", uid), value); }, async delete(uid) { await deleteDoc(doc(firestore, "users", uid)); } };
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

export class FirestoreLearningRepository implements LearningRepository {
  readonly provider = "firebase" as const;
  private pendingSaves = new Map<string, { data: LearningUserData; resolve: Array<() => void>; reject: Array<(error: unknown) => void> }>();
  constructor(private readonly gateway: FirestoreDocumentGateway, private readonly fallback?: LearningRepository, private readonly batchDelayMs = 75) {}
  private async recover<T>(remote: () => Promise<T>, local: () => Promise<T>): Promise<T> { try { return await remote(); } catch { if (!this.fallback) throw new Error("Firebase Repository 작업에 실패했습니다."); return local(); } }
  async loadUserData(userId: string) { return this.recover(async () => { const value = await this.gateway.get(userId); return value ? fromFirestoreUserDocument(value, userId) : null; }, () => this.fallback!.loadUserData(userId)); }
  async saveUserData(userId: string, data: LearningUserData) {
    return new Promise<void>((resolve, reject) => {
      const current = this.pendingSaves.get(userId);
      if (current) { current.data = data; current.resolve.push(resolve); current.reject.push(reject); return; }
      const pending = { data, resolve: [resolve], reject: [reject] };
      setTimeout(async () => {
        this.pendingSaves.delete(userId);
        try { const latest = pending.data; await this.recover(() => this.gateway.set(userId, toFirestoreUserDocument(normalizeLearningUserData({ ...latest, userId, updatedAt: new Date().toISOString() }, userId))), () => this.fallback!.saveUserData(userId, latest)); pending.resolve.forEach((done) => done()); }
        catch (error) { pending.reject.forEach((fail) => fail(error)); }
      }, this.batchDelayMs);
      this.pendingSaves.set(userId, pending);
    });
  }
  async loadSession(userId: string, sessionId: string) { return (await this.loadUserData(userId))?.sessions.find((item) => item.sessionId === sessionId) ?? null; }
  async saveSession(userId: string, session: StoredLearningSession) { const data = await this.loadUserData(userId) ?? createEmptyLearningUserData(userId); await this.saveUserData(userId, { ...data, currentSessionId: session.sessionId, studentModel: session.studentModel, sessions: [...data.sessions.filter((item) => item.sessionId !== session.sessionId), session] }); }
  async listSessions(userId: string) { return (await this.loadUserData(userId))?.sessions ?? []; }
  async deleteSession(userId: string, sessionId: string) { const data = await this.loadUserData(userId); if (data) await this.saveUserData(userId, { ...data, currentSessionId: data.currentSessionId === sessionId ? null : data.currentSessionId, sessions: data.sessions.filter((item) => item.sessionId !== sessionId) }); }
  async resetCurrentSession(userId: string) { const data = await this.loadUserData(userId); if (data) await this.saveUserData(userId, { ...data, sessions: data.sessions.filter(({ sessionId }) => sessionId !== data.currentSessionId), currentSessionId: null, studentModel: null, goalState: null }); }
  async resetLearningProgress(userId: string) { const data = await this.loadUserData(userId); if (data) await this.saveUserData(userId, { ...data, sessions: [], currentSessionId: null, studentModel: null, progress: createEmptyLearningProgress(), masteryProfiles: [], hintStates: [], workedExampleStates: [], misconceptionProfiles: [], adaptiveProfiles: [], goalState: null, sessionSummaries: [] }); }
  async exportUserData(userId: string): Promise<LearningDataExport> { return { schemaVersion: 1, exportedAt: new Date().toISOString(), data: await this.loadUserData(userId) ?? createEmptyLearningUserData(userId) }; }
  async importUserData(userId: string, value: unknown): Promise<RepositoryImportResult> { if (!record(value)) return { success: false, error: "INVALID_DATA" }; if (typeof value.schemaVersion === "number" && value.schemaVersion > 1) return { success: false, error: "UNSUPPORTED_VERSION" }; if (value.schemaVersion !== 1 || !record(value.data) || value.data.userId !== userId) return { success: false, error: "INVALID_DATA" }; try { const data = normalizeLearningUserData(value.data, userId); await this.saveUserData(userId, data); return { success: true, data }; } catch { return { success: false, error: "SAVE_FAILED" }; } }
  async deleteUserData(userId: string) { return this.recover(() => this.gateway.delete(userId), async () => { await this.fallback!.resetLearningProgress(userId); }); }
}
