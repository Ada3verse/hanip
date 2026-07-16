import { normalizeLearningUserData } from "@/lib/repository/localLearningRepository";
import type { LearningUserData } from "@/lib/repository/types";

type FirestoreScalar = null | boolean | number | string;
export type FirestoreValue = FirestoreScalar | FirestoreValue[] | { [key: string]: FirestoreValue };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toFirestoreValue(value: unknown): FirestoreValue | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return undefined;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return { __hanipType: "Date", value: value.toISOString() };
  if (value instanceof Map) return { __hanipType: "Map", entries: [...value.entries()].map(([key, item]) => [toFirestoreValue(key) ?? null, toFirestoreValue(item) ?? null]) };
  if (value instanceof Set) return { __hanipType: "Set", values: [...value].map((item) => toFirestoreValue(item) ?? null) };
  if (Array.isArray(value)) return value.map((item) => toFirestoreValue(item) ?? null);
  if (isRecord(value)) {
    const result: Record<string, FirestoreValue> = {};
    for (const [key, item] of Object.entries(value)) { const mapped = toFirestoreValue(item); if (mapped !== undefined) result[key] = mapped; }
    return result;
  }
  return String(value);
}

export function fromFirestoreValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fromFirestoreValue);
  if (!isRecord(value)) return value;
  if (typeof value.toDate === "function") return (value.toDate as () => Date)().toISOString();
  if (value.__hanipType === "Date" && typeof value.value === "string") return value.value;
  if (value.__hanipType === "Map" && Array.isArray(value.entries)) return new Map(value.entries.map((entry) => Array.isArray(entry) ? [fromFirestoreValue(entry[0]), fromFirestoreValue(entry[1])] : ["", null]));
  if (value.__hanipType === "Set" && Array.isArray(value.values)) return new Set(value.values.map(fromFirestoreValue));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fromFirestoreValue(item)]));
}

export function toFirestoreUserDocument(data: LearningUserData) {
  return toFirestoreValue({
    schemaVersion: data.schemaVersion, profile: { userId: data.userId, createdAt: data.createdAt, updatedAt: data.updatedAt },
    settings: data.settings, sessions: data.sessions, currentSessionId: data.currentSessionId, studentModel: data.studentModel,
    progress: data.progress, mastery: data.masteryProfiles, adaptive: data.adaptiveProfiles, misconceptions: data.misconceptionProfiles,
    summary: data.sessionSummaries, goal: data.goalState, hints: data.hintStates, workedExamples: data.workedExampleStates,
  }) as Record<string, FirestoreValue>;
}

export function fromFirestoreUserDocument(value: unknown, userId: string): LearningUserData {
  const decoded = fromFirestoreValue(value);
  if (!isRecord(decoded)) return normalizeLearningUserData({}, userId);
  const profile = isRecord(decoded.profile) ? decoded.profile : {};
  return normalizeLearningUserData({ schemaVersion: decoded.schemaVersion, userId, currentSessionId: decoded.currentSessionId,
    sessions: decoded.sessions, studentModel: decoded.studentModel, progress: decoded.progress, masteryProfiles: decoded.mastery,
    adaptiveProfiles: decoded.adaptive, misconceptionProfiles: decoded.misconceptions, sessionSummaries: decoded.summary,
    goalState: decoded.goal, hintStates: decoded.hints, workedExampleStates: decoded.workedExamples, settings: decoded.settings,
    createdAt: profile.createdAt, updatedAt: profile.updatedAt }, userId);
}
