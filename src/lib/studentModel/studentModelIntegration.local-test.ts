import { LocalLearningRepository, createEmptyLearningUserData, repositoryStorageKey } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import { calculateMastery, isMastered } from "@/lib/mastery/masteryEngine";
import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import type { StudentSessionModel } from "@/lib/types/chat";
import { createEmptyRuntimeStudentModel, getStudentConceptState, isStudentConceptMastered, recordExplanation, updateRuntimeStudentModel } from "./studentModelEngine";

function check(value: unknown, message: string) { if (!value) throw new Error(`Student Model integration test failed: ${message}`); }

function sessionModel(profile = createEmptyRuntimeStudentModel()): StudentSessionModel {
  return { currentConcept: "", currentFlowStage: "", understoodConcepts: [], needsSupportConcepts: [], misconceptions: [], lastEvaluation: null, lastNextAction: null, confidence: null, consecutiveSuggestedReplyUses: 0, lastResponseMode: null, hintLevel: 0, consecutiveUnknownResponses: 0, learningStatus: "in_progress", completionEvidence: [], learningMode: "learn", learningGoal: "concept", priorProgressLoaded: false, priorMasteryScore: null, priorConceptStatus: null, activePrerequisite: null, completedPrerequisites: [], prerequisiteReturnConcept: null, learningRoute: null, suspendedConcept: null, studentProfile: profile };
}

export async function runStudentModelIntegrationTests() {
  const now = "2026-01-01T00:00:00.000Z";
  let model = createEmptyRuntimeStudentModel(now);
  model = updateRuntimeStudentModel({ previous: model, studentAnswer: "이름을 직접 나타내기 때문이에요.", concept: "명사", evaluation: "correct", now });
  const nounLevel = getStudentConceptState(model, "명사").understandingLevel;
  model = updateRuntimeStudentModel({ previous: model, studentAnswer: "모르겠어요.", concept: "형태소", evaluation: "unknown", now });
  check(getStudentConceptState(model, "명사").understandingLevel === nounLevel, "A concept isolation");

  const storage = new MemoryStorage(); const repo = new LocalLearningRepository(storage); const userId = "student-model-integration";
  const data = createEmptyLearningUserData(userId); data.studentModel = model; data.settings.tutorName = "잎새"; repo.saveUserDataSync(userId, data);
  const restoredModel = repo.loadUserDataSync(userId)?.studentModel;
  check(JSON.stringify(restoredModel?.concepts) === JSON.stringify(model.concepts) && restoredModel?.explanationHistory.length === model.explanationHistory.length, "B save/load restore");
  await repo.saveSession(userId, { sessionId: "s", messages: [{ role: "user", content: "명사" }], studentModel: sessionModel(model), learningMode: "learn", learningGoal: "concept", activeSuggestedReplies: [], lastWorkedExampleId: null, contextSummary: "", createdAt: now, updatedAt: now });
  await repo.resetCurrentSession(userId);
  check(Boolean(repo.loadUserDataSync(userId)?.studentModel.concepts.명사), "C new learning retains long-term model");
  await repo.resetLearningProgress(userId);
  check(Object.keys(repo.loadUserDataSync(userId)!.studentModel.concepts).length === 0 && repo.loadUserDataSync(userId)!.settings.tutorName === "잎새", "D full reset clears model and keeps settings");

  const legacyStorage = new MemoryStorage(); const legacyUser = "legacy-student";
  legacyStorage.setItem(repositoryStorageKey(legacyUser), JSON.stringify({ ...createEmptyLearningUserData(legacyUser), schemaVersion: 1, studentModel: undefined, progress: { version: 1, updatedAt: now, totalSessions: 1, concepts: [{ conceptId: "noun", conceptName: "명사", status: "learning", masteryScore: 45, successfulApplications: 1, misconceptionIds: [], needsSupportCount: 0, completedSessionCount: 0, lastLearningMode: "learn", lastLearningGoal: "concept", lastStudiedAt: now }] } }));
  const legacyRepo = new LocalLearningRepository(legacyStorage); const migrated = legacyRepo.loadUserDataSync(legacyUser)!; const firstJson = JSON.stringify(migrated);
  check(migrated.schemaVersion === 2 && migrated.studentModel.concepts.noun?.understandingLevel === 1, "E safe legacy migration");
  check(JSON.stringify(legacyRepo.loadUserDataSync(legacyUser)) === firstJson, "F migration idempotence");

  for (let index = 0; index < 35; index += 1) model = recordExplanation({ model, concept: "명사", strategy: "EXAMPLE", message: `‘예${index}’`, now });
  check(model.explanationHistory.length === 30, "G explanation history limit");
  let masteryModel = createEmptyRuntimeStudentModel(now);
  masteryModel = updateRuntimeStudentModel({ previous: masteryModel, studentAnswer: "명사는 이름이야.", concept: "명사", evaluation: "correct", now });
  check(!masteryModel.masteredConcepts.includes("명사"), "H one answer not mastered");
  masteryModel = updateRuntimeStudentModel({ previous: masteryModel, studentAnswer: "사람이나 사물의 이름을 직접 나타내기 때문이야.", concept: "명사", evaluation: "correct", hasUnresolvedMisconception: true, now });
  check(!masteryModel.masteredConcepts.includes("명사"), "I unresolved misconception blocks mastery");
  const state = { ...getStudentConceptState(masteryModel, "명사"), misconceptionSummary: undefined };
  const mastery = calculateMastery({ conceptId: "noun", evaluation: "correct", evaluationConfidence: .9, previous: { conceptId: "noun", masteryScore: 75, confidence: .8, correctStreak: 1, lastReviewedAt: now, needsReview: false, reviewCount: 0, masteredAt: null, reviewInterval: 1, nextReviewAt: null }, studentConceptState: state, now });
  check(isMastered(mastery) === isStudentConceptMastered(state, false), "J engine consistency");

  const first = createMockChatResponse({ messages: [{ role: "user", content: "명사와 대명사의 차이를 알려줘." }], studentModel: sessionModel() });
  const second = createMockChatResponse({ messages: [{ role: "user", content: "명사와 대명사의 차이를 다시 알려줘." }], studentModel: sessionModel(first.meta?.studentModel) });
  check((second.meta?.studentModel?.explanationHistory.length ?? 0) >= (first.meta?.studentModel?.explanationHistory.length ?? 0), "K Mock preserves explanation history");
  const exportStorage = new MemoryStorage(); const exportRepo = new LocalLearningRepository(exportStorage); const exportData = createEmptyLearningUserData("export-user"); exportData.studentModel = model; exportRepo.saveUserDataSync("export-user", exportData); const exported = await exportRepo.exportUserData("export-user");
  const importRepo = new LocalLearningRepository(new MemoryStorage()); const imported = await importRepo.importUserData("export-user", exported);
  check(imported.success && JSON.stringify(imported.data?.studentModel) === JSON.stringify(exported.data.studentModel), "L export/import model equality");
  let repeatedProfile = createEmptyRuntimeStudentModel();
  const repeatedMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  const strategies = new Set<string>(); const examples = new Set<string>(); const questions = new Set<string>();
  for (let turn = 0; turn < 5; turn += 1) {
    repeatedMessages.push({ role: "user", content: "명사와 대명사의 차이를 알려줘." });
    const repeated = createMockChatResponse({ messages: repeatedMessages, studentModel: sessionModel(repeatedProfile) });
    const plan = repeated.meta?.explanationPlan;
    if (plan) { strategies.add(plan.strategy); if (plan.exampleId) examples.add(plan.exampleId); questions.add(plan.checkQuestion); }
    repeatedMessages.push({ role: "assistant", content: repeated.message });
    repeatedProfile = repeated.meta?.studentModel ?? repeatedProfile;
  }
  check(strategies.size >= 4 && examples.size === 5 && questions.size >= 4, "M Mock five-turn explanation diversity");
  return 13;
}
