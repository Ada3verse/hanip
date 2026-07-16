import { runFirebaseHealthCheck, type FirebaseHealthProbes } from "./health";
function check(value: unknown, message: string) { if (!value) throw new Error(`Firebase health test failed: ${message}`); }
function probes(fail?: keyof FirebaseHealthProbes) { let calls = 0; const make = <T extends unknown[]>(name: keyof FirebaseHealthProbes, value?: string) => async (...args: T) => { void args; calls++; if (fail === name) throw new Error(`${name}_failed`); return value; }; return { value: { initialize: make("initialize"), authenticate: make("authenticate", "test-uid"), firestoreRead: make<[string]>("firestoreRead"), firestoreWrite: make<[string]>("firestoreWrite"), repositoryLoad: make<[string]>("repositoryLoad"), repositorySave: make<[string]>("repositorySave"), runtime: make("runtime") } as FirebaseHealthProbes, calls: () => calls }; }
export async function runFirebaseHealthLocalTests() {
  const readyProbe = probes(); const ready = await runFirebaseHealthCheck(readyProbe.value);
  check(ready.status === "READY", "A ready status"); check(ready.ready, "B ready boolean"); check(ready.firebaseInitialized.status === "READY", "C initialize");
  check(ready.auth.status === "READY", "D anonymous auth"); check(ready.firestore.status === "READY", "E Firestore"); check(ready.repository.status === "READY", "F repository"); check(ready.runtime.status === "READY", "G runtime");
  check(ready.elapsed >= 0, "H elapsed"); check(ready.warning.length === 0, "I no warning"); check(readyProbe.calls() === 8, "J deterministic probes");
  const initFail = await runFirebaseHealthCheck(probes("initialize").value); check(initFail.status === "FAIL", "K init fail"); check(initFail.auth.status === "WARNING", "L auth skipped");
  const authFail = await runFirebaseHealthCheck(probes("authenticate").value); check(authFail.status === "FAIL", "M auth fail"); check(authFail.firestore.status === "FAIL", "N Firestore blocked");
  const readFail = await runFirebaseHealthCheck(probes("firestoreRead").value); check(readFail.firestore.status === "FAIL", "O read fail");
  const writeFail = await runFirebaseHealthCheck(probes("firestoreWrite").value); check(writeFail.firestore.status === "FAIL", "P write fail");
  const loadFail = await runFirebaseHealthCheck(probes("repositoryLoad").value); check(loadFail.repository.status === "FAIL", "Q load fail");
  const saveFail = await runFirebaseHealthCheck(probes("repositorySave").value); check(saveFail.repository.status === "FAIL", "R save fail");
  const runtimeFail = await runFirebaseHealthCheck(probes("runtime").value); check(runtimeFail.runtime.status === "FAIL", "S runtime fail");
  const passive = await runFirebaseHealthCheck(); check(passive.status === "WARNING", "T passive warning"); check(!passive.warning.includes("api_key"), "U no secret leak");
  check(["local", "firebase"].includes(passive.provider), "V provider"); check(typeof passive.firebaseConfigured === "boolean", "W config status");
  check(JSON.stringify(ready).includes("test-uid") === false, "X uid hidden"); check(ready.auth.reason.includes("probe_succeeded"), "Y reasons"); check(readyProbe.calls() > 0, "Z mock only execution");
}
