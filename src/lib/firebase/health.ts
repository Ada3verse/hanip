import { getConfiguredFirebaseProvider, getFirebaseConfig } from "./config";
import { initializeFirebaseClient } from "./client";
import { createFirebaseAuthGateway, FirebaseAuthProvider } from "@/lib/repository/firebase/firebaseAuthProvider";
import { createFirestoreDocumentGateway, FirestoreLearningRepository } from "@/lib/repository/firebase/firestoreRepository";
import { createEmptyLearningUserData } from "@/lib/repository/localLearningRepository";

export type FirebaseHealthStatus = "READY" | "WARNING" | "FAIL";
export interface FirebaseHealthItem { status: FirebaseHealthStatus; elapsed: number; reason: string[]; warning: string[]; }
export interface FirebaseHealthResult {
  status: FirebaseHealthStatus; provider: "local" | "firebase"; firebaseConfigured: boolean; firebaseInitialized: FirebaseHealthItem;
  auth: FirebaseHealthItem; firestore: FirebaseHealthItem; repository: FirebaseHealthItem; runtime: FirebaseHealthItem;
  ready: boolean; warning: string[]; elapsed: number;
}
export interface FirebaseHealthProbes {
  initialize(): Promise<void>; authenticate(): Promise<string>; firestoreRead(uid: string): Promise<void>; firestoreWrite(uid: string): Promise<void>;
  repositoryLoad(uid: string): Promise<void>; repositorySave(uid: string): Promise<void>; runtime(): Promise<void>;
}

const skipped = (reason: string): FirebaseHealthItem => ({ status: "WARNING", elapsed: 0, reason: [reason], warning: ["live_probe_not_run"] });
async function measure(run: () => Promise<void>): Promise<FirebaseHealthItem> { const started = performance.now(); try { await run(); return { status: "READY", elapsed: Math.round(performance.now() - started), reason: ["probe_succeeded"], warning: [] }; } catch (error) { return { status: "FAIL", elapsed: Math.round(performance.now() - started), reason: [error instanceof Error ? error.message : "probe_failed"], warning: [] }; } }

export async function runFirebaseHealthCheck(probes?: FirebaseHealthProbes): Promise<FirebaseHealthResult> {
  const started = performance.now(); const provider = getConfiguredFirebaseProvider(); const configured = getFirebaseConfig() !== null;
  if (!probes) { const item = skipped(configured ? "manual_live_check_required" : "firebase_config_missing"); return { status: "WARNING", provider, firebaseConfigured: configured, firebaseInitialized: item, auth: item, firestore: item, repository: item, runtime: { status: "READY", elapsed: 0, reason: ["runtime_available"], warning: [] }, ready: provider === "local", warning: [configured ? "manual_live_check_required" : "firebase_config_missing"], elapsed: Math.round(performance.now() - started) }; }
  const firebaseInitialized = await measure(probes.initialize); const auth = firebaseInitialized.status === "READY" ? await measure(async () => { await probes.authenticate(); }) : skipped("initialization_failed");
  let uid = ""; if (auth.status === "READY") { try { uid = await probes.authenticate(); } catch { /* measured above */ } }
  const firestoreRead = uid ? await measure(() => probes.firestoreRead(uid)) : skipped("authentication_required");
  const firestoreWrite = uid ? await measure(() => probes.firestoreWrite(uid)) : skipped("authentication_required");
  const firestore = [firestoreRead, firestoreWrite].every(({ status }) => status === "READY") ? { status: "READY" as const, elapsed: firestoreRead.elapsed + firestoreWrite.elapsed, reason: ["read_succeeded", "write_succeeded"], warning: [] } : { status: "FAIL" as const, elapsed: firestoreRead.elapsed + firestoreWrite.elapsed, reason: [...firestoreRead.reason, ...firestoreWrite.reason], warning: [...firestoreRead.warning, ...firestoreWrite.warning] };
  const repositoryLoad = uid ? await measure(() => probes.repositoryLoad(uid)) : skipped("authentication_required"); const repositorySave = uid ? await measure(() => probes.repositorySave(uid)) : skipped("authentication_required");
  const repository = [repositoryLoad, repositorySave].every(({ status }) => status === "READY") ? { status: "READY" as const, elapsed: repositoryLoad.elapsed + repositorySave.elapsed, reason: ["load_succeeded", "save_succeeded"], warning: [] } : { status: "FAIL" as const, elapsed: repositoryLoad.elapsed + repositorySave.elapsed, reason: [...repositoryLoad.reason, ...repositorySave.reason], warning: [...repositoryLoad.warning, ...repositorySave.warning] };
  const runtime = await measure(probes.runtime); const all = [firebaseInitialized, auth, firestore, repository, runtime]; const status = all.some(({ status }) => status === "FAIL") ? "FAIL" : all.some(({ status }) => status === "WARNING") ? "WARNING" : "READY";
  return { status, provider, firebaseConfigured: configured, firebaseInitialized, auth, firestore, repository, runtime, ready: status === "READY", warning: all.flatMap(({ warning }) => warning), elapsed: Math.round(performance.now() - started) };
}

export function createLiveFirebaseHealthProbes(): FirebaseHealthProbes {
  let authProvider: FirebaseAuthProvider | null = null; let repository: FirestoreLearningRepository | null = null; let gateway: ReturnType<typeof createFirestoreDocumentGateway> | null = null;
  const setup = () => { if (authProvider && repository && gateway) return; const { auth, firestore } = initializeFirebaseClient(); gateway = createFirestoreDocumentGateway(firestore); authProvider = new FirebaseAuthProvider(createFirebaseAuthGateway(auth)); repository = new FirestoreLearningRepository(gateway); };
  return { async initialize() { setup(); }, async authenticate() { setup(); return (await authProvider!.initialize()).id; }, async firestoreRead(uid) { setup(); await gateway!.get(uid); }, async firestoreWrite(uid) { setup(); const current = await gateway!.get(uid); await gateway!.set(uid, (current as Record<string, unknown> | null) ?? { schemaVersion: 1, profile: { userId: uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }); },
    async repositoryLoad(uid) { setup(); await repository!.loadUserData(uid); }, async repositorySave(uid) { setup(); const data = await repository!.loadUserData(uid) ?? createEmptyLearningUserData(uid); await repository!.saveUserData(uid, data); }, async runtime() { await Promise.resolve(); } };
}
