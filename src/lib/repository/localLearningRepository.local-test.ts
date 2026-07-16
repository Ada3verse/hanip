import { createEmptyLearningProgress } from "@/lib/progress/progressStorage";
import { LocalLearningRepository, createEmptyLearningUserData, repositoryStorageKey } from "./localLearningRepository";
const TEST_USER_ID = "test-local-user";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function check(value: unknown, message: string) {
  if (!value) throw new Error(`Repository local test failed: ${message}`);
}

const model = {
  currentConcept: "품사", currentFlowStage: "진단", understoodConcepts: [], needsSupportConcepts: [], misconceptions: [], lastEvaluation: null,
  lastNextAction: null, confidence: null, consecutiveSuggestedReplyUses: 0, lastResponseMode: null, hintLevel: 0 as const,
  consecutiveUnknownResponses: 0, learningStatus: "in_progress" as const, completionEvidence: [], learningMode: "learn" as const,
  learningGoal: "concept" as const, priorProgressLoaded: false, priorMasteryScore: null, priorConceptStatus: null,
  activePrerequisite: null, completedPrerequisites: [], prerequisiteReturnConcept: null, learningRoute: null, suspendedConcept: null,
};

export async function runLocalLearningRepositoryTests() {
  const storage = new MemoryStorage();
  const repository = new LocalLearningRepository(storage);
  const empty = repository.loadUserDataSync(TEST_USER_ID)!;
  check(empty.settings.tutorName === "한잎" && empty.sessions.length === 0, "A empty creation and S tutor name");
  repository.saveUserDataSync("other-user", createEmptyLearningUserData("other-user"));
  check(storage.getItem(repositoryStorageKey("other-user")) !== storage.getItem(repositoryStorageKey(TEST_USER_ID)), "B user isolation");

  const now = new Date().toISOString();
  await repository.saveSession(TEST_USER_ID, { sessionId: "s1", messages: [{ id: "m1", role: "user", content: "품사" }], studentModel: model, learningMode: "learn", learningGoal: "concept", activeSuggestedReplies: [], lastWorkedExampleId: null, contextSummary: "", createdAt: now, updatedAt: now });
  check((await repository.loadSession(TEST_USER_ID, "s1"))?.messages.length === 1, "C session save/load");
  const data = repository.loadUserDataSync(TEST_USER_ID)!;
  data.progress = { ...createEmptyLearningProgress(), concepts: [{ conceptId: "pos", conceptName: "품사", status: "learning", masteryScore: 40, successfulApplications: 1, misconceptionIds: [], needsSupportCount: 0, completedSessionCount: 0, lastLearningMode: "learn", lastLearningGoal: "concept", lastStudiedAt: now }] };
  data.masteryProfiles = [{ conceptId: "pos", masteryScore: 40, confidence: .7, correctStreak: 1, lastReviewedAt: now, needsReview: false, reviewCount: 0, masteredAt: null, reviewInterval: 1, nextReviewAt: null }];
  data.hintStates = [{ conceptId: "pos", hintLevel: 1, hintHistory: ["observation"], lastHintType: "observation", hintCount: 1, revealedEvidence: [], maintainFocus: true }];
  data.workedExampleStates = [{ conceptId: "pos", exampleId: "e", exampleTitle: "예", exampleStep: 1, exampleAttempts: 0, originQuestion: "q", originConcept: "pos", returnConcept: "pos", completedExample: false, exampleHistory: [] }];
  data.adaptiveProfiles = [{ studentId: "local", concept: "pos", learningStyle: "balanced", preferredQuestionType: "keyword", preferredHintLevel: 1, needsWorkedExample: false, freeInputRate: 0, choiceRate: 0, averageConfidence: 0, averageHintLevel: 0, misconceptionRate: 0, masterySpeed: 0, reviewSuccessRate: 0, styleHistory: ["balanced"] }];
  data.misconceptionProfiles = [{ concept: "pos", misconceptionId: "shape", misconceptionType: "형태", frequency: 1, lastOccurred: now, resolved: false, resolvedAt: null, reviewPriority: 20, relatedExamples: [], relatedHints: [], successStreak: 0 }];
  data.goalState = { currentGoal: "품사 이해", goalReason: [], goalProgress: 10, completedGoals: [], nextGoal: null, missionTitle: "기준 찾기", missionDescription: "기준을 말해 보자.", missionCompleted: false, missionHistory: [], estimatedRemaining: 3 };
  data.sessionSummaries = [{ completedConcepts: [], reviewConcepts: ["품사"], masteredConcepts: [], misconceptions: ["형태"], workedExamplesUsed: [], hintUsage: [], confidenceSummary: "medium", recommendedNextConcept: "품사", recommendedReviewDate: null, sessionDuration: 1, summary: ["품사를 학습했어."], completedGoals: [], nextGoal: "품사 이해", missionCompleted: false, newMisconceptions: ["형태"], resolvedMisconceptions: [], remainingMisconceptions: ["형태"], learningStyleChanges: [] }];
  repository.saveUserDataSync(TEST_USER_ID, data);
  const restored = repository.loadUserDataSync(TEST_USER_ID)!;
  check(restored.progress.concepts.length === 1 && restored.masteryProfiles.length === 1, "D progress/mastery");
  check(restored.hintStates.length === 1 && restored.workedExampleStates.length === 1, "E hint/example");
  check(restored.adaptiveProfiles.length === 1 && restored.misconceptionProfiles.length === 1, "F misconception/adaptive");
  check(restored.goalState?.currentGoal === "품사 이해" && restored.sessionSummaries.length === 1, "G goal/summary");

  await repository.resetCurrentSession(TEST_USER_ID);
  const resetSession = repository.loadUserDataSync(TEST_USER_ID)!;
  check(resetSession.sessions.length === 0 && resetSession.progress.concepts.length === 1, "H current reset keeps long-term state");
  resetSession.settings.tutorName = "선생님";
  repository.saveUserDataSync(TEST_USER_ID, resetSession);
  await repository.resetLearningProgress(TEST_USER_ID);
  check(repository.loadUserDataSync(TEST_USER_ID)!.settings.tutorName === "선생님", "I full reset keeps settings");

  storage.setItem(repositoryStorageKey("broken"), "{");
  check((await repository.loadUserData("broken"))?.sessions.length === 0, "J broken JSON recovery");
  const duplicate = createEmptyLearningUserData("dup");
  duplicate.sessions = Array.from({ length: 35 }, (_, index) => ({ sessionId: index < 2 ? "same" : `s${index}`, messages: [{ id: "same", role: "user", content: "a" }, { id: "same", role: "user", content: "b" }], studentModel: model, learningMode: "learn", learningGoal: "concept", activeSuggestedReplies: [], lastWorkedExampleId: null, contextSummary: "", createdAt: new Date(index).toISOString(), updatedAt: new Date(index).toISOString() }));
  repository.saveUserDataSync("dup", duplicate);
  const normalized = repository.loadUserDataSync("dup")!;
  check(normalized.sessions.length <= 30 && normalized.sessions.every(({ messages }) => messages.length === 1), "K/L duplicate and capacity normalization");

  const exported = await repository.exportUserData(TEST_USER_ID);
  check((await repository.importUserData(TEST_USER_ID, exported)).success, "P export/import");
  check(!(await repository.importUserData(TEST_USER_ID, {})).success, "Q invalid import");
  check((await repository.importUserData(TEST_USER_ID, { schemaVersion: 2 })).error === "UNSUPPORTED_VERSION", "R higher version");
  check(repository.loadUserDataSync(TEST_USER_ID)?.schemaVersion === 1, "T repository-only storage access");
}

export { MemoryStorage };
