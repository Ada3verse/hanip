import { createEmptyLearningProgress, sanitizeLearningProgress } from "@/lib/progress/progressStorage";
import type { ChatMessage, StudentSessionModel } from "@/lib/types/chat";
import type { LearningRepository } from "./learningRepository";
import { migrateLegacyData } from "./migrations";
import {
  LEARNING_REPOSITORY_SCHEMA_VERSION,
  type LearningDataExport,
  type LearningSettings,
  type LearningUserData,
  type RepositoryImportResult,
  type StoredLearningSession,
} from "./types";

const MAX_SESSIONS = 30;
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 5_000;
const MAX_SUMMARIES = 30;
const MAX_PROFILES = 100;
const MAX_STRING = 500;

export function repositoryStorageKey(userId: string) {
  return `HANIP_LEARNING_REPOSITORY_V1:${userId}`;
}

export function createDefaultSettings(): LearningSettings {
  return {
    tutorName: "한잎",
    learningMode: "learn",
    learningGoal: "concept",
    preferredInputMode: "balanced",
    reducedMotion: false,
    textSize: "medium",
    showLearningStatus: true,
    showSuggestedReplies: true,
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyLearningUserData(userId: string): LearningUserData {
  const now = new Date().toISOString();
  return {
    schemaVersion: LEARNING_REPOSITORY_SCHEMA_VERSION,
    userId,
    currentSessionId: null,
    sessions: [],
    studentModel: null,
    progress: createEmptyLearningProgress(),
    masteryProfiles: [],
    hintStates: [],
    workedExampleStates: [],
    misconceptionProfiles: [],
    adaptiveProfiles: [],
    goalState: null,
    sessionSummaries: [],
    settings: createDefaultSettings(),
    createdAt: now,
    updatedAt: now,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function date(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function text(value: unknown, fallback = "", max = MAX_STRING) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function messages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(-MAX_MESSAGES).flatMap((item) => {
    if (!record(item) || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
    const id = typeof item.id === "string" ? item.id.slice(0, 200) : undefined;
    if (id && ids.has(id)) return [];
    if (id) ids.add(id);
    return [{ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH), ...(id ? { id } : {}) }];
  });
}

function profileList<T>(value: unknown, key: (item: T) => string): T[] {
  if (!Array.isArray(value)) return [];
  const map = new Map<string, T>();
  for (const item of value.slice(-MAX_PROFILES)) {
    if (!record(item)) continue;
    const typed = item as T;
    const id = key(typed);
    if (id) map.set(id, typed);
  }
  return [...map.values()].slice(-MAX_PROFILES);
}

function normalizeSession(value: unknown, fallbackNow: string): StoredLearningSession | null {
  if (!record(value) || !record(value.studentModel)) return null;
  const sessionId = text(value.sessionId, "", 200);
  if (!sessionId) return null;
  const learningMode = ["learn", "review", "practice"].includes(String(value.learningMode))
    ? value.learningMode as StoredLearningSession["learningMode"] : "learn";
  const learningGoal = ["concept", "exam", "practice", "review"].includes(String(value.learningGoal))
    ? value.learningGoal as StoredLearningSession["learningGoal"] : "concept";
  return {
    sessionId,
    messages: messages(value.messages),
    studentModel: value.studentModel as unknown as StudentSessionModel,
    learningMode,
    learningGoal,
    activeSuggestedReplies: Array.isArray(value.activeSuggestedReplies)
      ? [...new Set(value.activeSuggestedReplies.filter((item): item is string => typeof item === "string"))].slice(0, 4).map((item) => item.slice(0, 100))
      : [],
    lastWorkedExampleId: value.lastWorkedExampleId === null ? null : text(value.lastWorkedExampleId, "", 200) || null,
    contextSummary: text(value.contextSummary, "", 5_000),
    createdAt: date(value.createdAt, fallbackNow),
    updatedAt: date(value.updatedAt, fallbackNow),
  };
}

export function normalizeLearningUserData(value: unknown, userId: string): LearningUserData {
  const empty = createEmptyLearningUserData(userId);
  if (!record(value) || value.schemaVersion !== 1 || value.userId !== userId) return empty;
  const now = new Date().toISOString();
  const sessionMap = new Map<string, StoredLearningSession>();
  if (Array.isArray(value.sessions)) {
    for (const raw of value.sessions) {
      const session = normalizeSession(raw, now);
      if (!session) continue;
      const previous = sessionMap.get(session.sessionId);
      if (!previous || Date.parse(session.updatedAt) >= Date.parse(previous.updatedAt)) sessionMap.set(session.sessionId, session);
    }
  }
  const currentSessionId = typeof value.currentSessionId === "string" && sessionMap.has(value.currentSessionId)
    ? value.currentSessionId : null;
  const ordered = [...sessionMap.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const current = currentSessionId ? sessionMap.get(currentSessionId) : undefined;
  const sessions = [
    ...(current ? [current] : []),
    ...ordered.filter(({ sessionId }) => sessionId !== currentSessionId).slice(0, MAX_SESSIONS - (current ? 1 : 0)),
  ];
  const settings = record(value.settings) ? value.settings : {};
  const data: LearningUserData = {
    ...empty,
    currentSessionId,
    sessions,
    studentModel: record(value.studentModel) ? value.studentModel as unknown as StudentSessionModel : current?.studentModel ?? null,
    progress: record(value.progress) ? sanitizeLearningProgress(value.progress as unknown as LearningUserData["progress"]) : empty.progress,
    masteryProfiles: profileList(value.masteryProfiles, (item) => (item as { conceptId?: string }).conceptId ?? ""),
    hintStates: profileList(value.hintStates, (item) => (item as { conceptId?: string }).conceptId ?? ""),
    workedExampleStates: profileList(value.workedExampleStates, (item) => (item as { conceptId?: string }).conceptId ?? ""),
    misconceptionProfiles: profileList(value.misconceptionProfiles, (item) => {
      const profile = item as { concept?: string; misconceptionId?: string };
      return `${profile.concept ?? ""}:${profile.misconceptionId ?? ""}`;
    }),
    adaptiveProfiles: profileList(value.adaptiveProfiles, (item) => (item as { concept?: string }).concept ?? ""),
    goalState: record(value.goalState) ? value.goalState as unknown as LearningUserData["goalState"] : null,
    sessionSummaries: Array.isArray(value.sessionSummaries) ? value.sessionSummaries.filter(record).slice(-MAX_SUMMARIES) as unknown as LearningUserData["sessionSummaries"] : [],
    settings: {
      tutorName: text(settings.tutorName, "한잎", 100) || "한잎",
      learningMode: ["learn", "review", "practice"].includes(String(settings.learningMode)) ? settings.learningMode as LearningSettings["learningMode"] : "learn",
      learningGoal: ["concept", "exam", "practice", "review"].includes(String(settings.learningGoal)) ? settings.learningGoal as LearningSettings["learningGoal"] : "concept",
      preferredInputMode: ["balanced", "choice_preferred", "free_input_preferred"].includes(String(settings.preferredInputMode)) ? settings.preferredInputMode as LearningSettings["preferredInputMode"] : "balanced",
      reducedMotion: typeof settings.reducedMotion === "boolean" ? settings.reducedMotion : false,
      textSize: ["small", "medium", "large"].includes(String(settings.textSize)) ? settings.textSize as LearningSettings["textSize"] : "medium",
      showLearningStatus: typeof settings.showLearningStatus === "boolean" ? settings.showLearningStatus : true,
      showSuggestedReplies: typeof settings.showSuggestedReplies === "boolean" ? settings.showSuggestedReplies : true,
      updatedAt: date(settings.updatedAt, now),
    },
    createdAt: date(value.createdAt, now),
    updatedAt: date(value.updatedAt, now),
  };
  return data;
}

export class LocalLearningRepository implements LearningRepository {
  readonly provider = "local" as const;
  constructor(private readonly storage: Storage) {}

  loadUserDataSync(userId: string): LearningUserData | null {
    const key = repositoryStorageKey(userId);
    const raw = this.storage.getItem(key);
    let data: LearningUserData;
    if (!raw) data = createEmptyLearningUserData(userId);
    else {
      try { data = normalizeLearningUserData(JSON.parse(raw), userId); }
      catch { data = createEmptyLearningUserData(userId); }
    }
    const migrated = migrateLegacyData(this.storage, data);
    const normalized = normalizeLearningUserData(migrated.data, userId);
    this.storage.setItem(key, JSON.stringify(normalized));
    return normalized;
  }

  saveUserDataSync(userId: string, data: LearningUserData) {
    const normalized = normalizeLearningUserData({ ...data, userId, updatedAt: new Date().toISOString() }, userId);
    this.storage.setItem(repositoryStorageKey(userId), JSON.stringify(normalized));
    return normalized;
  }

  async loadUserData(userId: string) { return this.loadUserDataSync(userId); }
  async saveUserData(userId: string, data: LearningUserData) { this.saveUserDataSync(userId, data); }
  async loadSession(userId: string, sessionId: string) { return this.loadUserDataSync(userId)?.sessions.find((item) => item.sessionId === sessionId) ?? null; }
  async saveSession(userId: string, session: StoredLearningSession) {
    const data = this.loadUserDataSync(userId) ?? createEmptyLearningUserData(userId);
    const sessions = [...data.sessions.filter(({ sessionId }) => sessionId !== session.sessionId), session];
    this.saveUserDataSync(userId, {
      ...data, sessions, currentSessionId: session.sessionId, studentModel: session.studentModel,
      masteryProfiles: Object.values(session.studentModel.masteryStates ?? {}),
      hintStates: Object.values(session.studentModel.hintStates ?? {}),
      workedExampleStates: Object.values(session.studentModel.workedExampleStates ?? {}),
      misconceptionProfiles: session.studentModel.misconceptionProfiles ?? data.misconceptionProfiles,
      adaptiveProfiles: session.studentModel.adaptiveProfile ? [session.studentModel.adaptiveProfile] : data.adaptiveProfiles,
      goalState: session.studentModel.goalState ?? data.goalState,
      sessionSummaries: session.studentModel.sessionSummaries ?? data.sessionSummaries,
    });
  }
  async listSessions(userId: string) { return this.loadUserDataSync(userId)?.sessions ?? []; }
  async deleteSession(userId: string, sessionId: string) {
    const data = this.loadUserDataSync(userId); if (!data) return;
    this.saveUserDataSync(userId, { ...data, sessions: data.sessions.filter((item) => item.sessionId !== sessionId), currentSessionId: data.currentSessionId === sessionId ? null : data.currentSessionId });
  }
  async resetCurrentSession(userId: string) {
    const data = this.loadUserDataSync(userId); if (!data) return;
    this.saveUserDataSync(userId, { ...data, sessions: data.sessions.filter(({ sessionId }) => sessionId !== data.currentSessionId), currentSessionId: null, studentModel: null, goalState: null });
  }
  async resetLearningProgress(userId: string) {
    const data = this.loadUserDataSync(userId); if (!data) return;
    this.saveUserDataSync(userId, { ...data, sessions: [], currentSessionId: null, studentModel: null, progress: createEmptyLearningProgress(), masteryProfiles: [], hintStates: [], workedExampleStates: [], misconceptionProfiles: [], adaptiveProfiles: [], goalState: null, sessionSummaries: [] });
  }
  async exportUserData(userId: string): Promise<LearningDataExport> {
    return { schemaVersion: 1, exportedAt: new Date().toISOString(), data: this.loadUserDataSync(userId) ?? createEmptyLearningUserData(userId) };
  }
  async importUserData(userId: string, value: unknown): Promise<RepositoryImportResult> {
    if (!record(value)) return { success: false, error: "INVALID_DATA" };
    const version = value.schemaVersion;
    if (typeof version === "number" && version > 1) return { success: false, error: "UNSUPPORTED_VERSION" };
    if (version !== 1 || !record(value.data) || value.data.schemaVersion !== 1 || value.data.userId !== userId) return { success: false, error: "INVALID_DATA" };
    const before = this.storage.getItem(repositoryStorageKey(userId));
    try {
      const normalized = normalizeLearningUserData(value.data, userId);
      this.saveUserDataSync(userId, normalized);
      return { success: true, data: normalized };
    } catch {
      if (before === null) this.storage.removeItem(repositoryStorageKey(userId));
      else this.storage.setItem(repositoryStorageKey(userId), before);
      return { success: false, error: "SAVE_FAILED" };
    }
  }
}
