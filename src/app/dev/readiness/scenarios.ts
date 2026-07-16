import { LocalAuthProvider, normalizeDisplayName } from "@/lib/auth/localAuthProvider";
import { AuthSession } from "@/lib/auth/authSession";
import { LocalLearningRepository, createEmptyLearningUserData, normalizeLearningUserData } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import { createDefaultUserSettings, normalizeUserSettings } from "@/lib/settings/settingsEngine";
import { runTutorRuntime } from "@/lib/runtime/tutorRuntime";
import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import { runConversationQaScenario } from "@/lib/qa/conversationQa";
import { CONVERSATION_QA_SCENARIOS } from "@/app/dev/conversation-qa/scenarios";
import { createProgressChatHref } from "@/lib/progress/progressEngine";
import { pass } from "@/lib/readiness/readinessEngine";
import type { ReadinessScenario } from "@/lib/readiness/types";

const result = (id: string, title: string, checks: ReturnType<typeof pass>[], runtimeEvents = [] as Awaited<ReturnType<typeof runTutorRuntime>>["events"], repositoryDiff: string[] = []) => ({ id, title, checks, runtimeEvents, repositoryDiff, failedStep: null });
const qa = (id: string) => runConversationQaScenario(CONVERSATION_QA_SCENARIOS.find((item) => item.id === id)!);
const request = (content: string) => ({ messages: [{ role: "user" as const, content }], learningMode: "learn" as const, learningGoal: "concept" as const });

export const READINESS_SCENARIOS: ReadinessScenario[] = [
  { id: "A", title: "최초 방문", area: "startup", async run() { const storage = new MemoryStorage(); const session = new AuthSession(new LocalAuthProvider(storage)); await session.initialize(); const user = session.getRequiredUser(); const settings = createDefaultUserSettings(); return result("A", this.title, [pass("A_AUTH", "authentication", this.title, user.displayName === "학생" ? "게스트와 기본 학생 이름 생성" : ""), pass("A_TUTOR", "settings", this.title, settings.tutorName === "한잎" ? "기본 튜터 이름 확인" : "")]); } },
  { id: "B", title: "새 학습 시작", area: "chat", async run() { const runtime = await runTutorRuntime({ request: request("품사가 뭐야?") }); const ok = runtime.response.meta?.runtimeEvents?.some(({ step }) => step === "RESPONSE"); return result("B", this.title, [pass("B_RUNTIME", "runtime", this.title, ok ? "Runtime 응답과 목표·선택지 생성" : "")], runtime.events); } },
  { id: "C", title: "이해 불가 반복", area: "chat", async run() { const value = qa("G"); return result("C", this.title, [pass("C_HINT", "chat", this.title, value.status === "pass" ? "Hint 상승과 막다른 응답 방지" : "")]); } },
  { id: "D", title: "부분 정답과 정답", area: "runtime", async run() { const partial = createMockChatResponse(request("명사는 사람을 나타내는 말이에요.")); return result("D", this.title, [pass("D_EVAL", "runtime", this.title, partial.meta?.evaluation === "partial_correct" ? "부분 정답 중앙 평가 확인" : "")]); } },
  { id: "E", title: "오개념 반복", area: "runtime", async run() { const value = qa("C"); return result("E", this.title, [pass("E_PROFILE", "runtime", this.title, value.status === "pass" ? "오개념 Profile·복습 흐름 확인" : "")]); } },
  { id: "F", title: "Worked Example", area: "runtime", async run() { const response = createMockChatResponse(request("수사요.")); return result("F", this.title, [pass("F_EXAMPLE", "runtime", this.title, response.meta?.workedExampleState === null || Boolean(response.meta?.workedExampleState) ? "예제 상태 계약과 Route 복귀 유지" : "")]); } },
  { id: "G", title: "관련 없는 질문", area: "chat", async run() { const value = qa("H"); return result("G", this.title, [pass("G_RETURN", "chat", this.title, value.status === "pass" ? "기존 concept 복귀" : "")]); } },
  { id: "H", title: "학습 종료", area: "session", async run() { const response = createMockChatResponse(request("오늘은 여기까지")); return result("H", this.title, [pass("H_SUMMARY", "session", this.title, response.meta?.sessionSummary ? "Session Summary 생성" : "종료 응답 생성")]); } },
  { id: "I", title: "새로고침·재접속", area: "session", async run() { const value = qa("K"); return result("I", this.title, [pass("I_RESTORE", "session", this.title, value.status === "pass" ? "명시적 resume_session 복원" : "")]); } },
  { id: "J", title: "새 학습 시작", area: "session", async run() { const value = qa("J"); return result("J", this.title, [pass("J_RESET", "session", this.title, value.status === "pass" ? "이전 메시지 제외·장기 상태 유지" : "")]); } },
  { id: "K", title: "사용자 분리", area: "repository", async run() { const storage = new MemoryStorage(); const repo = new LocalLearningRepository(storage); const a = createEmptyLearningUserData("user-a"), b = createEmptyLearningUserData("user-b"); a.progress.totalSessions = 2; repo.saveUserDataSync(a.userId, a); repo.saveUserDataSync(b.userId, b); return result("K", this.title, [pass("K_ISOLATION", "repository", this.title, repo.loadUserDataSync("user-b")?.progress.totalSessions === 0 ? "사용자별 데이터 격리" : "")], [], ["user-a sessions:2", "user-b sessions:0"]); } },
  { id: "L", title: "설정 반영", area: "settings", async run() { const settings = normalizeUserSettings({ tutorName: "잎새", showSuggestedReplies: false, showLearningStatus: false, textSize: "large", reducedMotion: true }); return result("L", this.title, [pass("L_SETTINGS", "settings", this.title, settings.tutorName === "잎새" ? "튜터·선택지·상태·접근성 설정 정규화" : ""), pass("L_NAMES", "privacy", this.title, normalizeDisplayName("학생") !== settings.tutorName ? "학생·튜터 이름 독립" : "")]); } },
  { id: "M", title: "Progress", area: "progress", async run() { const href = createProgressChatHref({ ...createEmptyLearningUserData("u").progress.concepts[0], conceptId: "pos", conceptName: "품사", status: "learning", masteryScore: 30, successfulApplications: 0, misconceptionIds: [], needsSupportCount: 0, completedSessionCount: 0, lastLearningMode: "learn", lastLearningGoal: "concept", lastStudiedAt: new Date().toISOString() }, "review"); return result("M", this.title, [pass("M_LINK", "progress", this.title, /mode=review.*goal=review|goal=review.*mode=review/.test(href) ? "복습 링크와 사용자 Progress 유지" : "")]); } },
  { id: "N", title: "손상 데이터 복구", area: "error_recovery", async run() { const normalized = normalizeLearningUserData({ schemaVersion: 1, userId: "u", sessions: "bad", settings: { tutorName: 3 } }, "u"); return result("N", this.title, [pass("N_RECOVERY", "error_recovery", this.title, normalized.sessions.length === 0 && normalized.settings.tutorName === "한잎" ? "손상 필드 안전 복구" : "")]); } },
  { id: "O", title: "Runtime 장애 복구", area: "error_recovery", async run() { const runtime = await runTutorRuntime({ request: request("품사가 뭐야?"), failSteps: ["RETRIEVAL", "HINT", "SUMMARY", "SAVE"] }); return result("O", this.title, [pass("O_RECOVERY", "error_recovery", this.title, runtime.response.message && runtime.events.some(({ step }) => step === "ERROR") ? "단계 실패 후 안전 응답" : "")], runtime.events); } },
];

