import { createEmptyLearningUserData, LocalLearningRepository } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import { applyUserSettings, createDefaultUserSettings, mergeUserSettings, normalizeTutorName, normalizeUserSettings } from "./settingsEngine";

function check(value: unknown, message: string) { if (!value) throw new Error(`Settings test failed: ${message}`); }
export function runSettingsEngineTests() {
  const defaults = createDefaultUserSettings("2026-01-01T00:00:00.000Z");
  check(defaults.tutorName === "한잎" && defaults.showSuggestedReplies, "A/B defaults");
  const changed = mergeUserSettings(defaults, { tutorName: "  잎새  " });
  check(changed.tutorName === "잎새", "C tutor save/restore");
  check(normalizeTutorName("  ") === "한잎", "D empty fallback");
  check(normalizeTutorName("<b>봄</b>\u0000") === "<b>봄</b>", "E plain HTML text/control removal");
  check(normalizeTutorName("OPENAI_API_KEY") === "한잎", "unsafe internal name blocked");
  const storage = new MemoryStorage(); const repository = new LocalLearningRepository(storage);
  const a = createEmptyLearningUserData("settings-a"); const b = createEmptyLearningUserData("settings-b");
  a.settings.tutorName = "가"; b.settings.tutorName = "나"; repository.saveUserDataSync(a.userId, a); repository.saveUserDataSync(b.userId, b);
  check(repository.loadUserDataSync(a.userId)?.settings.tutorName === "가" && repository.loadUserDataSync(b.userId)?.settings.tutorName === "나", "F user isolation");
  check(a.settings.tutorName !== "학생", "G student/tutor identity separated");
  check(changed.preferredInputMode === "balanced" && mergeUserSettings(changed, { preferredInputMode: "choice_preferred" }).preferredInputMode === "choice_preferred", "J/K input priority");
  check(mergeUserSettings(changed, { preferredInputMode: "free_input_preferred" }).preferredInputMode === "free_input_preferred", "L free input");
  check(!mergeUserSettings(changed, { showSuggestedReplies: false }).showSuggestedReplies, "M hide replies");
  check(!mergeUserSettings(changed, { showLearningStatus: false }).showLearningStatus, "N hide status");
  const element = document.createElement("div"); applyUserSettings({ ...defaults, textSize: "large", reducedMotion: true }, element);
  check(element.dataset.textSize === "large", "O root text size"); check(element.dataset.reducedMotion === "true", "P reduced motion");
  const progressBefore = a.progress; a.settings = { ...a.settings, ...defaults }; check(a.progress === progressBefore, "Q/R reset retains learning data");
  const repaired = normalizeUserSettings({ tutorName: 3, preferredInputMode: "bad", textSize: [], reducedMotion: "no" });
  check(repaired.tutorName === "한잎" && repaired.textSize === "medium", "S damaged repair");
  check(normalizeUserSettings({ tutorName: "기존" }).tutorName === "기존", "T partial migration");
}

