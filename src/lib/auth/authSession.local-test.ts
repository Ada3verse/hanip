import { LocalLearningRepository, createEmptyLearningUserData, repositoryStorageKey } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import { AuthSession } from "./authSession";
import { LocalAuthProvider, authMigrationMarkerKey } from "./localAuthProvider";

function check(value: unknown, message: string) { if (!value) throw new Error(`Auth session test failed: ${message}`); }

export async function runAuthSessionTests() {
  const storage = new MemoryStorage();
  const session = new AuthSession(new LocalAuthProvider(storage));
  check(session.getState().status === "loading", "N starts loading");
  let blocked = false; try { session.getRequiredUser(); } catch { blocked = true; }
  check(blocked, "N loading blocks repository identity");
  await session.initialize();
  const user = session.getRequiredUser();
  check(user.isGuest && session.getState().status === "guest", "initialize guest");
  const repo = new LocalLearningRepository(storage);
  const data = createEmptyLearningUserData(user.id); data.progress.totalSessions = 3; repo.saveUserDataSync(user.id, data);
  await session.signOut();
  check(repo.loadUserDataSync(user.id)?.progress.totalSessions === 3, "O sign-out retains data");
  const next = await session.signInAsGuest();
  check(next.id !== user.id && repo.loadUserDataSync(next.id)?.progress.totalSessions === 0, "Q external user id ignored/new account isolated");

  const migrationStorage = new MemoryStorage();
  const migrationRepo = new LocalLearningRepository(migrationStorage);
  const legacy = createEmptyLearningUserData("local-user"); legacy.progress.totalSessions = 4;
  migrationStorage.setItem(repositoryStorageKey("local-user"), JSON.stringify(legacy));
  const migrationSession = new AuthSession(new LocalAuthProvider(migrationStorage));
  await migrationSession.initialize();
  const migratedId = migrationSession.getRequiredUser().id;
  check(migrationRepo.loadUserDataSync(migratedId)?.progress.totalSessions === 4, "K legacy migration");
  const before = migrationRepo.loadUserDataSync(migratedId)?.sessions.length;
  await migrationSession.initialize();
  check(migrationRepo.loadUserDataSync(migratedId)?.sessions.length === before && Boolean(migrationStorage.getItem(authMigrationMarkerKey(migratedId))), "L idempotent migration");
  check(Boolean(migrationStorage.getItem(repositoryStorageKey("local-user"))), "M legacy source retained");
}

