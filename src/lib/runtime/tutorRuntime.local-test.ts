import { LocalLearningRepository, createEmptyLearningUserData } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import type { AuthUser } from "@/lib/auth/types";
import { runTutorRuntime } from "./tutorRuntime";
import { RUNTIME_STEPS } from "./types";
import { selectResponseProvider, type RuntimeResponseGenerator } from "./responseGenerator";
import { createLiveResponseCore, getLiveErrorCategory, SAFE_LIVE_RESPONSE_MESSAGE } from "./liveResponseCore";

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
  check(selectResponseProvider("true") === "mock" && selectResponseProvider("") === "mock" && selectResponseProvider(undefined) === "mock", "U mock and empty setting");
  check(selectResponseProvider("false") === "openai" && selectResponseProvider("true", true, false) === "blocked" && selectResponseProvider("true", true, true) === "openai", "V live selection and manual gate");
  let receivedPlan = false;
  const liveGenerator: RuntimeResponseGenerator = { provider: "openai", async generate({ plannedResponse }) { receivedPlan = Boolean(plannedResponse.meta?.dialoguePlan && plannedResponse.meta?.retrieval); return { message: "명사와 대명사의 차이를 예문 두 개로 설명하는 Live 테스트 응답", suggestedReplies: [], meta: plannedResponse.meta }; } };
  const live = await runTutorRuntime({ request, authUser, repository, responseGenerator: liveGenerator });
  check(receivedPlan && live.response.message.includes("Live 테스트 응답") && !live.response.message.includes("어디에서 막혔는지"), "W Runtime plan reaches Live generator");
  const plannedResponse = result.response;
  const missingKey = createLiveResponseCore({ client: null, createRequest: () => ({}) });
  check((await missingKey.generate({ request, plannedResponse })).message === SAFE_LIVE_RESPONSE_MESSAGE, "X missing API key fallback");
  for (const [status, expected] of [[401, "authentication"], [429, "rate_limit"]] as const) {
    let category = "";
    const failing = createLiveResponseCore({ client: { async create() { throw Object.assign(new Error("provider"), { status }); } }, createRequest: () => ({}), log: (entry) => { category = entry.category; } });
    check((await failing.generate({ request, plannedResponse })).message === SAFE_LIVE_RESPONSE_MESSAGE && category === expected, `Y ${status} fallback`);
  }
  const abortError = new DOMException("timeout", "AbortError");
  check(getLiveErrorCategory(abortError) === "timeout", "Z timeout category");
  const plain = createLiveResponseCore({ client: { async create() { return { output_text: "자연어 응답" }; } }, createRequest: () => ({}) });
  const normalized = await plain.generate({ request, plannedResponse });
  check(normalized.message === "자연어 응답" && normalized.suggestedReplies.length === 0 && normalized.meta === plannedResponse.meta, "AA plain text normalization and response contract");
}
