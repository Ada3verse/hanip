import {
  normalizeChatStartType,
  selectStoredSessionForStartType,
} from "./sessionStorage";
import { createProgressChatHref } from "@/lib/progress/progressEngine";
import { applyPriorProgressToStudentModel } from "@/lib/progress/progressContext";
import type { PersistedChatSession, StudentSessionModel } from "@/lib/types/chat";

export function runSessionStartLocalTests() {
  const check = (condition: boolean, label: string) => {
    if (!condition) throw new Error(`Session start local test failed: ${label}`);
  };
  const stored = { messages: [{ role: "user", content: "이전 질문" }] } as PersistedChatSession;
  check(selectStoredSessionForStartType(stored, "new") === null, "A: new skips messages");
  const progress = {
    conceptId: "parts-of-speech-overview", conceptName: "품사", status: "learning" as const,
    masteryScore: 40, successfulApplications: 0, misconceptionIds: [], needsSupportCount: 1,
    completedSessionCount: 0, lastLearningMode: "learn" as const, lastLearningGoal: "concept" as const,
    lastStudiedAt: "2026-07-15T00:00:00.000Z",
  };
  const base = {
    understoodConcepts: [], needsSupportConcepts: [], misconceptions: [],
  } as unknown as StudentSessionModel;
  check(applyPriorProgressToStudentModel(base, progress).priorProgressLoaded, "B: new keeps progress context");
  check(selectStoredSessionForStartType(stored, "resume_session") === stored, "C: resume session restores");
  check(selectStoredSessionForStartType(stored, "resume_progress") === null, "D: resume progress skips messages");
  check(normalizeChatStartType(null, true) === "new", "E: home question defaults new");
  check(createProgressChatHref(progress, "continue").includes("startType=resume_progress"), "F: progress resumes progress only");
  check(normalizeChatStartType("new") === "new", "G: new learning remains new");
  return 7;
}
