import type { LearningProgress } from "@/lib/progress/types";
import type { PersistedChatSession } from "@/lib/types/chat";
import type { LearningUserData, StoredLearningSession } from "./types";

export const LEGACY_CHAT_KEY = "HANIP_CHAT_SESSION_V1";
export const LEGACY_PROGRESS_KEY = "HANIP_LEARNING_PROGRESS_V1";
export const REPOSITORY_MIGRATION_ID = "legacy-local-storage-v1";

export function migrationMarkerKey(userId: string) {
  return `HANIP_LEARNING_REPOSITORY_MIGRATION:${userId}:${REPOSITORY_MIGRATION_ID}`;
}

function parse(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function validDate(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function legacySession(value: unknown, now: string): StoredLearningSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Partial<PersistedChatSession>;
  if (item.version !== 1 || !Array.isArray(item.messages) || !item.studentModel) return null;
  return {
    sessionId: "migrated-session-v1",
    messages: item.messages,
    studentModel: item.studentModel,
    learningMode: item.learningMode ?? "learn",
    learningGoal: item.learningGoal ?? "concept",
    activeSuggestedReplies: item.activeSuggestedReplies ?? [],
    lastWorkedExampleId: item.lastWorkedExampleId ?? null,
    contextSummary: item.contextSummary ?? "",
    createdAt: validDate(item.savedAt) ? item.savedAt! : now,
    updatedAt: validDate(item.savedAt) ? item.savedAt! : now,
  };
}

function legacyProgress(value: unknown): LearningProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const progress = value as Partial<LearningProgress>;
  return progress.version === 1 && Array.isArray(progress.concepts)
    ? progress as LearningProgress
    : null;
}

export function migrateLegacyData(
  storage: Storage,
  base: LearningUserData,
): { data: LearningUserData; migrated: boolean } {
  const marker = migrationMarkerKey(base.userId);
  if (storage.getItem(marker)) return { data: base, migrated: false };
  const now = new Date().toISOString();
  try {
    const session = legacySession(parse(storage.getItem(LEGACY_CHAT_KEY)), now);
    const progress = legacyProgress(parse(storage.getItem(LEGACY_PROGRESS_KEY)));
    const sessions = session && !base.sessions.some(({ sessionId }) => sessionId === session.sessionId)
      ? [...base.sessions, session]
      : base.sessions;
    const useLegacyProgress = progress && Date.parse(progress.updatedAt) > Date.parse(base.progress.updatedAt);
    const model = session?.studentModel;
    const data: LearningUserData = {
      ...base,
      sessions,
      currentSessionId: base.currentSessionId ?? session?.sessionId ?? null,
      studentModel: base.studentModel ?? session?.studentModel ?? null,
      progress: useLegacyProgress ? progress : base.progress,
      masteryProfiles: model?.masteryStates
        ? Object.values(model.masteryStates)
        : base.masteryProfiles,
      hintStates: model?.hintStates
        ? Object.values(model.hintStates)
        : base.hintStates,
      workedExampleStates: model?.workedExampleStates
        ? Object.values(model.workedExampleStates)
        : base.workedExampleStates,
      misconceptionProfiles:
        model?.misconceptionProfiles ?? base.misconceptionProfiles,
      adaptiveProfiles: model?.adaptiveProfile
        ? [model.adaptiveProfile]
        : base.adaptiveProfiles,
      goalState: model?.goalState ?? base.goalState,
      sessionSummaries:
        model?.sessionSummaries ?? base.sessionSummaries,
      updatedAt: now,
    };
    storage.setItem(marker, now);
    return { data, migrated: Boolean(session || progress) };
  } catch {
    return { data: base, migrated: false };
  }
}
