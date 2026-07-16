import { getAuthSession } from "@/lib/auth/authSession";
import { getLocalLearningRepository } from "@/lib/repository/repositoryFactory";
import type { LearningSettings } from "@/lib/repository/types";
import { INPUT_MODES, TEXT_SIZES, type UserSettings } from "./types";

export function normalizeTutorName(value: unknown) {
  const safe = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20) : "";
  if (!safe || /(?:api[_-]?key|system\s*prompt|internalScore|decisionLog)/i.test(safe)) return "한잎";
  return safe;
}
export function createDefaultUserSettings(now = new Date().toISOString()): UserSettings {
  return { tutorName: "한잎", preferredInputMode: "balanced", textSize: "medium", reducedMotion: false, showLearningStatus: true, showSuggestedReplies: true, updatedAt: now };
}
export function normalizeUserSettings(value: unknown): UserSettings {
  const defaults = createDefaultUserSettings();
  const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    tutorName: normalizeTutorName(item.tutorName),
    preferredInputMode: INPUT_MODES.includes(item.preferredInputMode as never) ? item.preferredInputMode as UserSettings["preferredInputMode"] : defaults.preferredInputMode,
    textSize: TEXT_SIZES.includes(item.textSize as never) ? item.textSize as UserSettings["textSize"] : defaults.textSize,
    reducedMotion: typeof item.reducedMotion === "boolean" ? item.reducedMotion : defaults.reducedMotion,
    showLearningStatus: typeof item.showLearningStatus === "boolean" ? item.showLearningStatus : defaults.showLearningStatus,
    showSuggestedReplies: typeof item.showSuggestedReplies === "boolean" ? item.showSuggestedReplies : defaults.showSuggestedReplies,
    updatedAt: typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt)) ? item.updatedAt : defaults.updatedAt,
  };
}
export function mergeUserSettings(current: unknown, patch: Partial<UserSettings>) { return normalizeUserSettings({ ...normalizeUserSettings(current), ...patch, updatedAt: new Date().toISOString() }); }
export function applyUserSettings(settings: UserSettings, root: HTMLElement = document.documentElement) {
  root.dataset.textSize = settings.textSize;
  root.dataset.reducedMotion = String(settings.reducedMotion);
}
export function loadUserSettings() {
  const user = getAuthSession().getRequiredUser();
  const data = getLocalLearningRepository().loadUserDataSync(user.id);
  return normalizeUserSettings(data?.settings);
}
export function saveUserSettings(settings: UserSettings) {
  const user = getAuthSession().getRequiredUser();
  const repository = getLocalLearningRepository();
  const data = repository.loadUserDataSync(user.id);
  if (!data) throw new Error("학습 설정 저장소를 열 수 없습니다.");
  const normalized = normalizeUserSettings(settings);
  const existing = data.settings;
  repository.saveUserDataSync(user.id, { ...data, settings: { ...existing, ...normalized } as LearningSettings });
  applyUserSettings(normalized);
  return normalized;
}
export function resetUserSettings() { return saveUserSettings(createDefaultUserSettings()); }

