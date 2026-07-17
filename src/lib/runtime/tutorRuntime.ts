import { createMockChatResponseEngine } from "@/lib/testing/mockChatResponse";
import { createDefaultUserSettings, normalizeUserSettings } from "@/lib/settings/settingsEngine";
import type { RuntimeContext, RuntimeEvent, RuntimeLog, RuntimeStep, TutorRuntimeInput, TutorRuntimeResult } from "./types";
import { RUNTIME_STEPS } from "./types";
import { mockResponseGenerator } from "./mockResponseGenerator";
import { EMPTY_RUNTIME_STUDENT_MODEL, normalizeRuntimeStudentModel } from "@/lib/studentModel/studentModelEngine";
import { RuntimeProviderError, SAFE_LIVE_RESPONSE_MESSAGE } from "./liveResponseCore";

function emptyContext(input: TutorRuntimeInput): RuntimeContext {
  return { authUser: input.authUser ?? null, repository: input.repository ?? null, learningState: input.request.learningState ?? null, mastery: null, adaptiveProfile: null, misconceptionProfile: null, hintState: null, goal: null, evaluation: null, retrieval: null, workedExample: null, summary: null, tutorSettings: null, chatHistory: input.request.messages, studentModel: input.request.studentModel?.studentProfile ?? EMPTY_RUNTIME_STUDENT_MODEL };
}
function event(step: RuntimeStep, started: number, result: RuntimeEvent["result"], reason: string[] = [], warning: string[] = []): RuntimeEvent {
  return { step, elapsed: Date.now() - started, engine: step.toLowerCase(), result, reason, warning };
}
function hydrateContext(context: RuntimeContext, response: TutorRuntimeResult["response"]) {
  const meta = response.meta; if (!meta) return;
  context.learningState = meta.learningState ?? context.learningState;
  context.mastery = meta.mastery ?? null; context.adaptiveProfile = meta.adaptiveProfile ?? null;
  context.misconceptionProfile = meta.misconceptionProfiles?.find(({ resolved }) => !resolved) ?? null;
  context.hintState = meta.hintState ?? null; context.goal = meta.goalState ?? null;
  context.evaluation = meta.answerEvaluation ?? null; context.retrieval = meta.retrieval ?? null;
  context.workedExample = meta.workedExampleState ?? null; context.summary = meta.sessionSummary ?? null;
  context.studentModel = meta.studentModel ?? context.studentModel;
}

export async function runTutorRuntime(input: TutorRuntimeInput): Promise<TutorRuntimeResult> {
  const started = Date.now(); const events: RuntimeEvent[] = []; const context = emptyContext(input); const failures = new Set(input.failSteps ?? []);
  const push = (step: RuntimeStep, result: RuntimeEvent["result"] = "success", reason: string[] = [], warning: string[] = []) => events.push(event(step, started, result, reason, warning));
  push("START");
  if (input.repository && input.authUser && !failures.has("RESTORE")) {
    try {
      const data = await input.repository.loadUserData(input.authUser.id);
      context.tutorSettings = normalizeUserSettings(data?.settings);
      const stored = data?.studentModel;
      const requestModel = input.request.studentModel?.studentProfile;
      context.studentModel = normalizeRuntimeStudentModel(
        stored && requestModel
          ? Date.parse(requestModel.updatedAt) > Date.parse(stored.updatedAt) ? requestModel : stored
          : requestModel ?? stored,
      );
      push("RESTORE");
    }
    catch { context.tutorSettings = createDefaultUserSettings(); push("RESTORE", "recovered", ["repository_restore_failed"], ["default_settings_used"]); }
  } else { context.tutorSettings = createDefaultUserSettings(); push("RESTORE", "skipped", [failures.has("RESTORE") ? "forced_failure" : "repository_not_available"]); }
  let response: TutorRuntimeResult["response"] = { message: "한 가지만 더 확인해 볼게. 지금 가장 가까운 답을 짧게 말해 볼래?", suggestedReplies: [] };
  const runtimeRequest = {
    ...input.request,
    studentModel: { ...input.request.studentModel, studentProfile: context.studentModel },
  };
  for (const step of RUNTIME_STEPS.slice(2, -2)) {
    if (failures.has(step)) { push("ERROR", "recovered", [`${step.toLowerCase()}_failed`], ["engine_skipped"]); continue; }
    push(step);
  }
  let providerFailure: TutorRuntimeResult["providerFailure"];
  if (!failures.has("RESPONSE")) {
    try {
      const plannedResponse = createMockChatResponseEngine(runtimeRequest);
      const knowledgeMissing = plannedResponse.meta?.retrieval?.reason.includes("knowledge_not_found") ?? false;
      response = knowledgeMissing ? plannedResponse : await (input.responseGenerator ?? mockResponseGenerator).generate({ request: runtimeRequest, plannedResponse });
      hydrateContext(context, response);
      push("RESPONSE", knowledgeMissing ? "skipped" : "success", knowledgeMissing ? ["knowledge_not_found", "provider_call_blocked"] : []);
    }
    catch (error) {
      if (error instanceof RuntimeProviderError) {
        providerFailure = { category: error.category, requestId: error.requestId, retryable: error.retryable };
        response = { message: SAFE_LIVE_RESPONSE_MESSAGE, suggestedReplies: [] };
        push("ERROR", "recovered", [error.category], ["provider_failure"]);
      } else {
        push("ERROR", "recovered", ["response_generation_failed"], ["fallback_response_used"]);
      }
    }
  } else push("ERROR", "recovered", ["response_failed"], ["fallback_response_used"]);
  if (input.repository && input.authUser && !failures.has("SAVE")) {
    try {
      const data = await input.repository.loadUserData(input.authUser.id);
      if (data) await input.repository.saveUserData(input.authUser.id, { ...data, studentModel: response.meta?.studentModel ?? context.studentModel, updatedAt: new Date().toISOString() });
      push("SAVE", data ? "success" : "skipped", data ? [] : ["user_data_not_found"]);
    } catch { push("ERROR", "recovered", ["repository_save_failed"], ["response_returned_without_save"]); }
  } else push("SAVE", "skipped", [failures.has("SAVE") ? "forced_failure" : "repository_not_available"]);
  const logs: RuntimeLog[] = process.env.NODE_ENV === "production" ? [] : events.map((item) => ({ ...item, timestamp: new Date().toISOString() }));
  if (response.meta) { response.meta.runtimeEvents = events; response.meta.runtimeLog = logs; }
  return { response, events, logs, context, providerFailure };
}
