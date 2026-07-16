import { LocalLearningRepository, createEmptyLearningUserData } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import { createAuthProvider } from "./authFactory";
import { LOCAL_AUTH_USER_KEY, LocalAuthProvider, normalizeDisplayName } from "./localAuthProvider";

function check(value: unknown, message: string) { if (!value) throw new Error(`Local auth test failed: ${message}`); }

export async function runLocalAuthProviderTests() {
  const storage = new MemoryStorage();
  const provider = new LocalAuthProvider(storage);
  const first = await provider.signInAsGuest();
  check(first.id.startsWith("local-") && first.displayName === "학생", "A guest creation");
  check((await new LocalAuthProvider(storage).getCurrentUser())?.id === first.id, "B reload restoration");
  await provider.signOut();
  const second = await provider.signInAsGuest();
  check(second.id !== first.id, "C new identity after sign-out");
  check(normalizeDisplayName("  학생\u0000<script>  ") === "학생<script>", "D/S display normalization and plain text");
  check(normalizeDisplayName("   ") === "학생", "E empty name fallback");
  storage.setItem(LOCAL_AUTH_USER_KEY, "{");
  check(await provider.getCurrentUser() === null && storage.getItem(LOCAL_AUTH_USER_KEY) === null, "F broken auth recovery");

  const repo = new LocalLearningRepository(storage);
  const a = createEmptyLearningUserData("local-A12345678");
  const b = createEmptyLearningUserData("local-B12345678");
  a.progress.totalSessions = 1; b.progress.totalSessions = 2;
  repo.saveUserDataSync(a.userId, a); repo.saveUserDataSync(b.userId, b);
  check(repo.loadUserDataSync(a.userId)?.progress.totalSessions === 1 && repo.loadUserDataSync(b.userId)?.progress.totalSessions === 2, "G-I user data isolation");
  check((await repo.exportUserData(a.userId)).data.userId !== (await repo.exportUserData(b.userId)).data.userId, "R export isolation");
  const fallback = createAuthProvider({ provider: "firebase", storage, firebaseConfig: null });
  check(fallback instanceof LocalAuthProvider, "P missing Firebase config falls back to local auth");
}
