import { LocalLearningRepository, createEmptyLearningUserData } from "@/lib/repository/localLearningRepository";
import { MemoryStorage } from "@/lib/repository/localLearningRepository.local-test";
import type { AuthUser } from "@/lib/auth/types";
import { runTutorRuntime } from "./tutorRuntime";
import { RUNTIME_STEPS } from "./types";
import { selectResponseProvider, type RuntimeResponseGenerator } from "./responseGenerator";
import { createLiveResponseCore, getLiveErrorCategory, RuntimeProviderError } from "./liveResponseCore";
import { buildRuntimeKnowledgePayload } from "./knowledgePrompt";

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
  check(result.response.meta?.tutorPersona && result.context.chatHistory.length === 1 && result.context.studentModel, "O/S persona/runtime context");
  check(recovered.events.some(({ warning }) => warning.includes("engine_skipped")), "R warning");
  check(!JSON.stringify(result.response).includes("runtime-user") && !JSON.stringify(result.response).includes("repository"), "T minimal public response");
  check(selectResponseProvider("true") === "mock" && selectResponseProvider("") === "mock" && selectResponseProvider(undefined) === "mock", "U mock and empty setting");
  check(selectResponseProvider("false") === "openai" && selectResponseProvider("true", true, false) === "blocked" && selectResponseProvider("true", true, true) === "blocked" && selectResponseProvider("false", true, true) === "openai", "V live selection and manual gate");
  let receivedPlan = false;
  const liveGenerator: RuntimeResponseGenerator = { provider: "openai", async generate({ plannedResponse }) { receivedPlan = Boolean(plannedResponse.meta?.dialoguePlan && plannedResponse.meta?.retrieval); return { message: "명사와 대명사의 차이를 예문 두 개로 설명하는 Live 테스트 응답", suggestedReplies: [], meta: plannedResponse.meta }; } };
  const live = await runTutorRuntime({ request, authUser, repository, responseGenerator: liveGenerator });
  check(receivedPlan && live.response.message.includes("Live 테스트 응답") && !live.response.message.includes("어디에서 막혔는지"), "W Runtime plan reaches Live generator");
  const plannedResponse = result.response;
  const missingKey = createLiveResponseCore({ client: null, createRequest: () => ({}) });
  try { await missingKey.generate({ request, plannedResponse }); check(false, "X missing API key error"); }
  catch (error) { check(error instanceof RuntimeProviderError && error.category === "missing_api_key", "X missing API key error"); }
  for (const [status, expected] of [[401, "authentication_error"], [429, "rate_limit"]] as const) {
    let category = "";
    const failing = createLiveResponseCore({ client: { async create() { throw Object.assign(new Error("provider"), { status }); } }, createRequest: () => ({}), log: (entry) => { category = entry.category; } });
    try { await failing.generate({ request, plannedResponse }); check(false, `Y ${status} classified failure`); }
    catch (error) { check(error instanceof RuntimeProviderError && error.category === expected && category === expected, `Y ${status} classified failure`); }
  }
  const abortError = new DOMException("timeout", "AbortError");
  check(getLiveErrorCategory(abortError) === "timeout", "Z timeout category");
  const plain = createLiveResponseCore({ client: { async create() { return { output_text: JSON.stringify({ answer: "자연어 응답", suggestedReplies: [] }) }; } }, createRequest: () => ({}) });
  const normalized = await plain.generate({ request, plannedResponse });
  check(normalized.message === "자연어 응답" && normalized.suggestedReplies.length === 0 && normalized.meta === plannedResponse.meta, "AA plain text normalization and response contract");
  const directRequest = { messages: [{ role: "user" as const, content: "명사와 대명사의 차이를 예문 두 개로 설명해줘." }], learningMode: "learn" as const, learningGoal: "concept" as const };
  const direct = await runTutorRuntime({ request: directRequest });
  check(direct.response.meta?.dialoguePlan?.responseMode === "direct_answer_then_check" && (direct.response.message.match(/\n[12]\./g)?.length ?? 0) >= 2 && !direct.response.message.startsWith("먼저 형태소"), "AB scenario A direct comparison with two examples");
  const firstFailure = await runTutorRuntime({ request: { ...directRequest, messages: [...directRequest.messages, { role: "assistant" as const, content: direct.response.message }, { role: "user" as const, content: "잘 모르겠어" }], studentModel: { consecutiveUnknownResponses: 1 } } });
  check(firstFailure.response.meta?.dialoguePlan?.responseMode === "same_concept_reexplain" && /명사|대명사/.test(firstFailure.response.message) && !/형태소/.test(firstFailure.response.message), "AC scenario B same-concept reexplanation");
  const secondFailure = await runTutorRuntime({ request: { ...directRequest, messages: [...directRequest.messages, { role: "assistant" as const, content: direct.response.message }, { role: "user" as const, content: "잘 모르겠어" }, { role: "assistant" as const, content: firstFailure.response.message }, { role: "user" as const, content: "아직도 모르겠어" }], studentModel: { consecutiveUnknownResponses: 2 } } });
  check(secondFailure.response.meta?.dialoguePlan?.responseMode === "bridge_to_prerequisite" && /품사/.test(secondFailure.response.message), "AD scenario C one-step prerequisite bridge");
  const resumed = await runTutorRuntime({ request: { ...directRequest, messages: [...directRequest.messages, { role: "assistant" as const, content: "명사와 대명사를 이해하려면 먼저 품사가 단어의 종류라는 점을 확인해 보자." }, { role: "user" as const, content: "둘 다 단어의 종류야" }] } });
  check(/원래 질문으로 돌아갈게/.test(resumed.response.message) && /명사/.test(resumed.response.message) && /대명사/.test(resumed.response.message), "AE scenario D return to original question");
  const definition = await runTutorRuntime({ request: { messages: [{ role: "user", content: "품사가 뭐야?" }] } });
  check(definition.response.message.startsWith("**품사**") && !definition.response.message.startsWith("먼저 형태소"), "AF scenario E definition first");
  const particle = await runTutorRuntime({ request: { messages: [{ role: "user", content: "조사는 왜 단어야?" }] } });
  check(/문법적 관계/.test(particle.response.message) && !particle.response.message.startsWith("먼저 형태소"), "AG scenario F in-scope route interruption answered");
  const weather = await runTutorRuntime({ request: { messages: [{ role: "user", content: "오늘 날씨 어때?" }] } });
  check(/문법 학습 범위 밖/.test(weather.response.message) && !/맑|비가|기온/.test(weather.response.message), "AH scenario G out-of-scope safe return");
  const teachingCompare = await runTutorRuntime({ request: { messages: [{ role: "user", content: "명사와 대명사의 차이를 알려줘." }] } });
  check(teachingCompare.response.meta?.dialoguePlan?.teachingStrategy === "COMPARE", "AI compare teaching strategy");
  check(teachingCompare.response.meta?.dialoguePlan?.teachingLevel === 2, "AI default teaching level");
  check(teachingCompare.response.suggestedReplies.length >= 2, "AI compare strategy replies");
  const teachingDirect = await runTutorRuntime({ request: { messages: [{ role: "user", content: "조사가 뭐야?" }] } });
  check(teachingDirect.response.meta?.dialoguePlan?.teachingStrategy === "DIRECT_EXPLANATION" && /문법적 관계/.test(teachingDirect.response.meta.dialoguePlan.teachingGoal ?? "") && teachingDirect.response.suggestedReplies.includes("이해했어"), "AJ direct teaching strategy and replies");
  const teachingNeed = await runTutorRuntime({ request: { messages: [{ role: "user", content: "왜 대명사가 필요해?" }] } });
  check(/민지를 대신/.test(teachingNeed.response.message) && /반복을 피하고/.test(teachingNeed.response.meta?.dialoguePlan?.teachingGoal ?? ""), "AK necessity teaching goal drives answer");
  const remembered = await runTutorRuntime({ request: {
    messages: [{ role: "user", content: "명사와 대명사의 차이를 알려줘." }],
    studentModel: { studentProfile: teachingCompare.response.meta?.studentModel },
  } });
  check(remembered.response.message !== teachingCompare.response.message, `AL same example is not repeated: ${teachingCompare.response.message} || ${remembered.response.message}`);
  check((remembered.response.meta?.studentModel?.explanationHistory.length ?? 0) > (teachingCompare.response.meta?.studentModel?.explanationHistory.length ?? 0), "AM explanation history grows");
  check(remembered.response.meta?.dialoguePlan?.studentModel?.updatedAt === remembered.response.meta?.studentModel?.updatedAt, "AN dialogue plan receives student model");
  const groundedInput = buildRuntimeKnowledgePayload(direct.response);
  const retrievedContents = direct.response.meta?.retrieval?.usedEvidence.map(({ content }) => content) ?? [];
  const serializedKnowledge = JSON.stringify(groundedInput);
  check(retrievedContents.length > 0 && retrievedContents.slice(0, 4).every((content) => serializedKnowledge.includes(content)), "AO selected evidence reaches provider contract");
  check(!serializedKnowledge.includes("hanip-parts-of-speech-textbook-draft") && !serializedKnowledge.includes('"concepts":['), "AP whole Knowledge Pack never reaches prompt");
  let missingKnowledgeProviderCalls = 0;
  const countingGenerator: RuntimeResponseGenerator = { provider: "openai", async generate({ plannedResponse: value }) { missingKnowledgeProviderCalls += 1; return value; } };
  const missingKnowledge = await runTutorRuntime({ request: { messages: [{ role: "user", content: "화성의 날씨를 알려줘" }] }, responseGenerator: countingGenerator });
  check(missingKnowledgeProviderCalls === 0 && missingKnowledge.response.meta?.retrieval?.reason.includes("knowledge_not_found") && missingKnowledge.events.some(({ step, reason }) => step === "RESPONSE" && reason.includes("provider_call_blocked")), "AQ missing Knowledge blocks OpenAI provider");
}
