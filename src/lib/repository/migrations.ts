import type { LearningProgress } from "@/lib/progress/types";
import type { PersistedChatSession } from "@/lib/types/chat";
import type { LearningUserData, StoredLearningSession } from "./types";
import { isStudentConceptMastered, normalizeRuntimeStudentModel } from "@/lib/studentModel/studentModelEngine";
import type { RuntimeStudentModel, StudentConceptState } from "@/lib/studentModel/types";

export const LEGACY_CHAT_KEY = "HANIP_CHAT_SESSION_V1";
export const LEGACY_PROGRESS_KEY = "HANIP_LEARNING_PROGRESS_V1";
export const REPOSITORY_MIGRATION_ID = "legacy-local-storage-v1";
export const STUDENT_MODEL_MIGRATION_ID = "canonical-student-model-v2";

export function migrationMarkerKey(userId: string) {
  return `HANIP_LEARNING_REPOSITORY_MIGRATION:${userId}:${REPOSITORY_MIGRATION_ID}`;
}

export function studentModelMigrationMarkerKey(userId: string) {
  return `HANIP_LEARNING_REPOSITORY_MIGRATION:${userId}:${STUDENT_MODEL_MIGRATION_ID}`;
}

function deriveCanonicalStudentModel(data: LearningUserData, now: string): RuntimeStudentModel {
  let model = normalizeRuntimeStudentModel(data.studentModel, now);
  for (const progress of data.progress.concepts) {
    if (model.concepts[progress.conceptId]) continue;
    const mastery = data.masteryProfiles.find(({ conceptId }) => conceptId === progress.conceptId) ?? progress.mastery;
    const unresolved = data.misconceptionProfiles.find(({ concept, resolved }) => concept === progress.conceptId && !resolved);
    const evidenceCount = Math.max(0, progress.successfulApplications + progress.completedSessionCount);
    const state: StudentConceptState = {
      understandingLevel: progress.status === "understood" && evidenceCount >= 2 ? 3 : progress.masteryScore >= 50 ? 2 : progress.masteryScore > 0 ? 1 : 0,
      confidence: mastery && mastery.confidence >= 0.8 ? "HIGH" : mastery && mastery.confidence >= 0.5 ? "MEDIUM" : "LOW",
      misconceptionSummary: unresolved?.misconceptionType,
      evidenceCount,
      consecutiveSuccesses: mastery?.correctStreak ?? 0,
      consecutiveFailures: progress.needsSupportCount,
      updatedAt: progress.lastStudiedAt,
    };
    model = { ...model, concepts: { ...model.concepts, [progress.conceptId]: state } };
    if (isStudentConceptMastered(state, Boolean(unresolved))) model.masteredConcepts = [...new Set([...model.masteredConcepts, progress.conceptId])];
  }
  return { ...model, updatedAt: now };
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
  const studentMarker = studentModelMigrationMarkerKey(base.userId);
  const legacyAlreadyMigrated = Boolean(storage.getItem(marker));
  const studentAlreadyMigrated = Boolean(storage.getItem(studentMarker));
  if (legacyAlreadyMigrated && studentAlreadyMigrated) return { data: base, migrated: false };
  const now = new Date().toISOString();
  try {
    const session = legacyAlreadyMigrated ? null : legacySession(parse(storage.getItem(LEGACY_CHAT_KEY)), now);
    const progress = legacyAlreadyMigrated ? null : legacyProgress(parse(storage.getItem(LEGACY_PROGRESS_KEY)));
    const sessions = session && !base.sessions.some(({ sessionId }) => sessionId === session.sessionId)
      ? [...base.sessions, session]
      : base.sessions;
    const useLegacyProgress = progress && Date.parse(progress.updatedAt) > Date.parse(base.progress.updatedAt);
    const model = session?.studentModel;
    const data: LearningUserData = {
      ...base,
      sessions,
      currentSessionId: base.currentSessionId ?? session?.sessionId ?? null,
      studentModel: session?.studentModel.studentProfile ?? base.studentModel,
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
    const withStudentModel = studentAlreadyMigrated ? data : { ...data, studentModel: deriveCanonicalStudentModel(data, now) };
    if (!legacyAlreadyMigrated) storage.setItem(marker, now);
    if (!studentAlreadyMigrated) storage.setItem(studentMarker, now);
    return { data: withStudentModel, migrated: Boolean(session || progress || !studentAlreadyMigrated) };
  } catch {
    return { data: base, migrated: false };
  }
}
