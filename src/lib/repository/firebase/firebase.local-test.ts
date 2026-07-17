import type { AuthUser } from "@/lib/auth/types";
import { FirebaseAuthProviderStub } from "./firebaseProvider";
import { assertFirebaseNetworkDisabled } from "@/lib/firebase/client";
import type { FirebasePublicConfig } from "@/lib/firebase/types";
import { LocalLearningRepository, createEmptyLearningUserData } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import { createLearningRepository } from "@/lib/repository/repositoryFactory";
import { runTutorRuntime } from "@/lib/runtime/tutorRuntime";
import { FirebaseLearningRepository } from "./firebaseLearningRepository";

const CONFIG: FirebasePublicConfig = {
  apiKey: "test-api-key",
  authDomain: "test.firebaseapp.com",
  projectId: "hanip-test",
  storageBucket: "hanip-test.appspot.com",
  appId: "test-app-id",
};

function check(value: unknown, message: string) {
  if (!value) throw new Error(`Firebase Repository local test failed: ${message}`);
}

export async function runFirebaseRepositoryLocalTests() {
  const storage = new MemoryStorage();
  const defaultRepository = createLearningRepository({ provider: "local", storage });
  check(defaultRepository instanceof LocalLearningRepository, "A Local provider remains available");
  check(createLearningRepository({ provider: "local", storage }) instanceof LocalLearningRepository, "B explicit local selection");

  const firebaseRepository = createLearningRepository({ provider: "firebase", firebaseConfig: CONFIG, firebaseImplementation: "stub" });
  check(firebaseRepository instanceof FirebaseLearningRepository, "C configured Firebase stub selection");
  check(createLearningRepository({ provider: "firebase", firebaseConfig: null, storage }) instanceof LocalLearningRepository, "D missing config fallback");

  const userId = "firebase-local-test-user";
  const data = createEmptyLearningUserData(userId);
  const now = new Date().toISOString();
  data.settings.tutorName = "잎새";
  data.masteryProfiles = [{ conceptId: "품사", masteryScore: 45, confidence: 0.7, correctStreak: 1, lastReviewedAt: now, needsReview: false, reviewCount: 0, masteredAt: null, reviewInterval: 1, nextReviewAt: null }];
  await firebaseRepository.saveUserData(userId, data);
  check((await firebaseRepository.loadUserData(userId))?.settings.tutorName === "잎새", "E settings and mastery restore");

  const model = {
    currentConcept: "품사", currentFlowStage: "진단", understoodConcepts: [], needsSupportConcepts: [], misconceptions: [], lastEvaluation: null,
    lastNextAction: null, confidence: null, consecutiveSuggestedReplyUses: 0, lastResponseMode: null, hintLevel: 0 as const,
    consecutiveUnknownResponses: 0, learningStatus: "in_progress" as const, completionEvidence: [], learningMode: "learn" as const,
    learningGoal: "concept" as const, priorProgressLoaded: false, priorMasteryScore: null, priorConceptStatus: null,
    activePrerequisite: null, completedPrerequisites: [], prerequisiteReturnConcept: null, learningRoute: null, suspendedConcept: null,
  };
  await firebaseRepository.saveSession(userId, { sessionId: "session-1", messages: [{ id: "m1", role: "user", content: "품사" }], studentModel: model, learningMode: "learn", learningGoal: "concept", activeSuggestedReplies: [], lastWorkedExampleId: null, contextSummary: "", createdAt: now, updatedAt: now });
  check((await firebaseRepository.listSessions(userId)).length === 1, "F session save and list");

  const exported = await firebaseRepository.exportUserData(userId);
  const imported = createLearningRepository({ provider: "firebase", firebaseConfig: CONFIG, firebaseImplementation: "stub" });
  check((await imported.importUserData(userId, exported)).success && (await imported.loadUserData(userId))?.masteryProfiles.length === 1, "G export/import full aggregate");

  const concrete = firebaseRepository as FirebaseLearningRepository;
  check(concrete.networkCalls === 0 && assertFirebaseNetworkDisabled(concrete.options.client), "H SDK and network remain disabled");

  const authUser: AuthUser = { id: userId, displayName: "학생", email: null, isGuest: true, provider: "firebase", createdAt: now, lastLoginAt: now };
  const runtime = await runTutorRuntime({ request: { messages: [{ role: "user", content: "품사가 뭐예요?" }], learningMode: "learn", learningGoal: "concept" }, authUser, repository: firebaseRepository });
  check(Boolean(runtime.response.message) && runtime.events.some(({ step }) => step === "SAVE"), "I runtime uses repository interface");
  check(typeof defaultRepository.loadUserData === typeof firebaseRepository.loadUserData, "J providers share repository contract");
  check((await concrete.migrate()).reason === "stub_no_remote_migration", "K migration stub");

  const auth = new FirebaseAuthProviderStub();
  let notImplemented = false;
  try { await auth.getCurrentUser(); } catch { notImplemented = true; }
  check(notImplemented && concrete.networkCalls === 0, "L auth placeholder performs no Firebase call");
}
