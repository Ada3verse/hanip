import { LocalLearningRepository, repositoryStorageKey } from "./localLearningRepository";
import { LEGACY_CHAT_KEY, LEGACY_PROGRESS_KEY, migrationMarkerKey } from "./migrations";
import { MemoryStorage } from "./localLearningRepository.local-test";
const TEST_USER_ID = "test-migration-user";

function check(value: unknown, message: string) {
  if (!value) throw new Error(`Repository migration test failed: ${message}`);
}

export function runRepositoryMigrationTests() {
  const storage = new MemoryStorage();
  const now = new Date().toISOString();
  storage.setItem(LEGACY_CHAT_KEY, JSON.stringify({ version: 1, savedAt: now, messages: [{ role: "user", content: "품사" }], studentModel: { currentConcept: "품사" }, learningMode: "learn", learningGoal: "concept", activeSuggestedReplies: [], lastWorkedExampleId: null, contextSummary: "" }));
  storage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ version: 1, updatedAt: now, totalSessions: 1, concepts: [] }));
  const repository = new LocalLearningRepository(storage);
  const migrated = repository.loadUserDataSync(TEST_USER_ID)!;
  check(migrated.sessions.length === 1 && migrated.progress.totalSessions === 1, "M legacy migration");
  repository.loadUserDataSync(TEST_USER_ID);
  check(repository.loadUserDataSync(TEST_USER_ID)!.sessions.length === 1, "N idempotent");
  check(Boolean(storage.getItem(migrationMarkerKey(TEST_USER_ID))), "marker saved");
  check(Boolean(storage.getItem(LEGACY_CHAT_KEY)), "legacy retained after success");

  const broken = new MemoryStorage();
  broken.setItem(LEGACY_CHAT_KEY, "{");
  const brokenRepository = new LocalLearningRepository(broken);
  check(brokenRepository.loadUserDataSync("broken")?.sessions.length === 0 && broken.getItem(LEGACY_CHAT_KEY) === "{", "O failure retains legacy");
  check(Boolean(storage.getItem(repositoryStorageKey(TEST_USER_ID))), "new structure persisted");
}
