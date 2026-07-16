import { LocalLearningRepository, createEmptyLearningUserData } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import type { AuthUser } from "@/lib/auth/types";
import { runTutorRuntime } from "./tutorRuntime";
import { RUNTIME_STEPS } from "./types";

function check(value: unknown, message: string) { if (!value) throw new Error(`Tutor Runtime test failed: ${message}`); }
export async function runTutorRuntimeTests() {
  const storage = new MemoryStorage(); const repository = new LocalLearningRepository(storage);
  const now = new Date().toISOString(); const authUser: AuthUser = { id: "runtime-user", displayName: "학생", email: null, isGuest: true, provider: "local", createdAt: now, lastLoginAt: now };
  repository.saveUserDataSync(authUser.id, createEmptyLearningUserData(authUser.id));
  const request = { messages: [{ role: "user" as const, content: "품사가 뭐예요?" }], learningMode: "learn" as const, learningGoal: "concept" as const };
  const result = await runTutorRuntime({ request, authUser, repository });
  check(Boolean(result.response.message), "A normal execution");
  const order = result.events.filter(({ step }) => step !== "ERROR").map(({ step }) => step);
  check(RUNTIME_STEPS.every((step, index) => order[index] === step), "B engine order");
  const recovered = await runTutorRuntime({ request, authUser, repository, failSteps: ["RETRIEVAL", "HINT"] });
  check(Boolean(recovered.response.message) && recovered.events.some(({ step, result }) => step === "ERROR" && result === "recovered"), "C/D/Q skip and recovery");
  check(result.events.length >= RUNTIME_STEPS.length && result.events[0].step === "START", "E runtime events");
  check(result.logs.length === result.events.length && result.logs.every(({ engine, elapsed }) => engine && elapsed >= 0), "F runtime log");
  check(result.events.some(({ step, result }) => step === "SAVE" && result === "success"), "G/P repository save");
  check(result.events.some(({ step, result }) => step === "RESTORE" && result === "success"), "H restore");
  check(result.context.goal && result.context.evaluation && result.context.retrieval, "I/J/K goal/evaluation/retrieval");
  check(result.context.workedExample === null || typeof result.context.workedExample.exampleStep === "number", "L worked example state");
  check(result.context.hintState && result.context.summary === null || result.context.summary, "M/N hint/summary contract");
  check(result.response.meta?.tutorPersona && result.context.chatHistory.length === 1, "O/S persona/runtime context");
  check(recovered.events.some(({ warning }) => warning.includes("engine_skipped")), "R warning");
  check(!JSON.stringify(result.response).includes("runtime-user") && !JSON.stringify(result.response).includes("repository"), "T minimal public response");
}
