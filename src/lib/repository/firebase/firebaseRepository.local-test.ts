import type { User } from "firebase/auth";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import { LocalLearningRepository, createEmptyLearningUserData } from "@/lib/repository/localLearningRepository";
import { createLearningRepository } from "@/lib/repository/repositoryFactory";
import { FirebaseAuthProvider, type FirebaseAuthGateway } from "./firebaseAuthProvider";
import { FirestoreLearningRepository, type FirestoreDocumentGateway } from "./firestoreRepository";
import { fromFirestoreUserDocument, fromFirestoreValue, toFirestoreUserDocument, toFirestoreValue } from "./firestoreMapper";
import type { FirebasePublicConfig } from "@/lib/firebase/types";

const CONFIG: FirebasePublicConfig = { apiKey: "test", authDomain: "test.firebaseapp.com", projectId: "test", storageBucket: "test.appspot.com", appId: "test" };
function check(value: unknown, message: string) { if (!value) throw new Error(`Firebase production repository test failed: ${message}`); }
function fakeUser(uid = "firebase-user") { return { uid, displayName: null, email: null, isAnonymous: true, metadata: { creationTime: "2026-01-01T00:00:00.000Z", lastSignInTime: "2026-01-01T00:00:00.000Z" } } as unknown as User; }

class MemoryGateway implements FirestoreDocumentGateway {
  values = new Map<string, Record<string, unknown>>(); calls = 0; fail = false;
  async get(uid: string) { this.calls++; if (this.fail) throw new Error("permission-denied"); return this.values.get(uid) ?? null; }
  async set(uid: string, value: Record<string, unknown>) { this.calls++; if (this.fail) throw new Error("permission-denied"); this.values.set(uid, value); }
  async delete(uid: string) { this.calls++; if (this.fail) throw new Error("permission-denied"); this.values.delete(uid); }
}

export async function runFirebaseProductionRepositoryLocalTests() {
  const gateway = new MemoryGateway(); const repository = new FirestoreLearningRepository(gateway); const uid = "firebase-user";
  const empty = createEmptyLearningUserData(uid); empty.settings.tutorName = "잎새"; empty.progress.totalSessions = 2;
  await repository.saveUserData(uid, empty);
  check(gateway.calls === 1, "A Firestore save adapter");
  check((await repository.loadUserData(uid))?.settings.tutorName === "잎새", "B Firestore restore");
  check((await repository.loadUserData(uid))?.progress.totalSessions === 2, "C progress restore");
  const document = toFirestoreUserDocument(empty);
  check(document.schemaVersion === 1 && "settings" in document && "sessions" in document, "D document sections");
  check(fromFirestoreUserDocument(document, uid).userId === uid, "E document mapper round trip");
  const special = { date: new Date("2026-01-01T00:00:00Z"), map: new Map([["a", 1]]), set: new Set(["x"]), missing: undefined };
  const mapped = toFirestoreValue(special)!; const restored = fromFirestoreValue(mapped) as Record<string, unknown>;
  check(restored.date === "2026-01-01T00:00:00.000Z", "F Date conversion");
  check(restored.map instanceof Map && restored.set instanceof Set, "G Map/Set conversion");
  check(!("missing" in (mapped as Record<string, unknown>)), "H undefined removal");
  check(fromFirestoreUserDocument({ ...document, schemaVersion: 99 }, uid).schemaVersion === 1, "I schema normalization");
  const exported = await repository.exportUserData(uid); check(exported.data.userId === uid, "J export");
  const gateway2 = new MemoryGateway(); const imported = new FirestoreLearningRepository(gateway2);
  check((await imported.importUserData(uid, exported)).success, "K import");
  check((await imported.importUserData(uid, { schemaVersion: 2 })).error === "UNSUPPORTED_VERSION", "L future schema rejection");
  check((await imported.importUserData(uid, {})).error === "INVALID_DATA", "M invalid import rejection");
  await repository.resetLearningProgress(uid); check((await repository.loadUserData(uid))?.progress.totalSessions === 0, "N progress reset");
  check(repository.provider === "firebase", "O repository interface provider");

  const storage = new MemoryStorage(); const local = new LocalLearningRepository(storage); await local.saveUserData(uid, empty);
  const failing = new MemoryGateway(); failing.fail = true; const fallback = new FirestoreLearningRepository(failing, local);
  check((await fallback.loadUserData(uid))?.settings.tutorName === "잎새", "P permission/load fallback");
  empty.settings.tutorName = "새싹"; await fallback.saveUserData(uid, empty); check((await local.loadUserData(uid))?.settings.tutorName === "새싹", "Q save fallback");
  check(createLearningRepository({ provider: "firebase", firebaseConfig: null, storage }) instanceof LocalLearningRepository, "R missing config fallback");
  check(createLearningRepository({ provider: "local", storage }) instanceof LocalLearningRepository, "S explicit local remains");
  check(createLearningRepository({ provider: "firebase", firebaseConfig: CONFIG, firebaseImplementation: "stub" }).provider === "firebase", "T stub remains selectable");

  let current: User | null = null; let authCalls = 0;
  const authGateway: FirebaseAuthGateway = { currentUser: () => current, async signInAnonymously() { authCalls++; current = fakeUser(); return current; }, async signOut() { current = null; }, async updateDisplayName(name) { current = { ...fakeUser(), displayName: name } as User; return current; }, subscribe(listener) { listener(current); return () => undefined; } };
  const auth = new FirebaseAuthProvider(authGateway);
  check((await auth.initialize()).id === uid && authCalls === 1, "U anonymous initialize");
  check((await auth.getCurrentUser())?.id === uid && authCalls === 1, "V uid persistence");
  check((await auth.updateDisplayName("  학생  ")).displayName === "학생", "W profile mapping");
  await auth.signOut(); check(await auth.getCurrentUser() === null, "X sign out");
  const failedAuth: FirebaseAuthGateway = { ...authGateway, async signInAnonymously() { throw new Error("auth failure"); } };
  const localAuthUser = fakeUser("local-fallback");
  const fallbackAuth = new FirebaseAuthProvider(failedAuth, { provider: "local", async getCurrentUser() { return null; }, async signInAsGuest() { return { id: localAuthUser.uid, displayName: "학생", email: null, isGuest: true, provider: "local", createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() }; }, async signOut() {}, async updateDisplayName() { throw new Error("unused"); }, subscribe() { return () => undefined; } });
  check((await fallbackAuth.signInAsGuest()).provider === "local", "Y auth failure fallback");
  check(gateway.calls > 0 && authCalls === 1, "Z adapters are deterministic and no external network was used");
}
