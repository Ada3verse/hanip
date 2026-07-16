import { createMockChatResponseEngine } from "@/lib/testing/mockChatResponse";
import { createDefaultUserSettings, normalizeUserSettings } from "@/lib/settings/settingsEngine";
import type { RuntimeContext, RuntimeEvent, RuntimeLog, RuntimeStep, TutorRuntimeInput, TutorRuntimeResult } from "./types";
import { RUNTIME_STEPS } from "./types";
import { mockResponseGenerator } from "./mockResponseGenerator";

function emptyContext(input: TutorRuntimeInput): RuntimeContext {
  return { authUser: input.authUser ?? null, repository: input.repository ?? null, learningState: input.request.learningState ?? null, mastery: null, adaptiveProfile: null, misconceptionProfile: null, hintState: null, goal: null, evaluation: null, retrieval: null, workedExample: null, summary: null, tutorSettings: null, chatHistory: input.request.messages };
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
}

export async function runTutorRuntime(input: TutorRuntimeInput): Promise<TutorRuntimeResult> {
  const started = Date.now(); const events: RuntimeEvent[] = []; const context = emptyContext(input); const failures = new Set(input.failSteps ?? []);
  const push = (step: RuntimeStep, result: RuntimeEvent["result"] = "success", reason: string[] = [], warning: string[] = []) => events.push(event(step, started, result, reason, warning));
  push("START");
  if (input.repository && input.authUser && !failures.has("RESTORE")) {
    try { const data = await input.repository.loadUserData(input.authUser.id); context.tutorSettings = normalizeUserSettings(data?.settings); push("RESTORE"); }
    catch { context.tutorSettings = createDefaultUserSettings(); push("RESTORE", "recovered", ["repository_restore_failed"], ["default_settings_used"]); }
  } else { context.tutorSettings = createDefaultUserSettings(); push("RESTORE", "skipped", [failures.has("RESTORE") ? "forced_failure" : "repository_not_available"]); }
  let response: TutorRuntimeResult["response"] = { message: "한 가지만 더 확인해 볼게. 지금 가장 가까운 답을 짧게 말해 볼래?", suggestedReplies: [] };
  for (const step of RUNTIME_STEPS.slice(2, -2)) {
    if (failures.has(step)) { push("ERROR", "recovered", [`${step.toLowerCase()}_failed`], ["engine_skipped"]); continue; }
    push(step);
  }
  if (!failures.has("RESPONSE")) {
    try { const plannedResponse = createMockChatResponseEngine(input.request); response = await (input.responseGenerator ?? mockResponseGenerator).generate({ request: input.request, plannedResponse }); hydrateContext(context, response); push("RESPONSE"); }
    catch { push("ERROR", "recovered", ["response_generation_failed"], ["fallback_response_used"]); }
  } else push("ERROR", "recovered", ["response_failed"], ["fallback_response_used"]);
  if (input.repository && input.authUser && !failures.has("SAVE")) {
    try {
      const data = await input.repository.loadUserData(input.authUser.id);
      if (data) await input.repository.saveUserData(input.authUser.id, { ...data, studentModel: input.request.studentModel ? { ...data.studentModel, ...input.request.studentModel } as never : data.studentModel, updatedAt: new Date().toISOString() });
      push("SAVE", data ? "success" : "skipped", data ? [] : ["user_data_not_found"]);
    } catch { push("ERROR", "recovered", ["repository_save_failed"], ["response_returned_without_save"]); }
  } else push("SAVE", "skipped", [failures.has("SAVE") ? "forced_failure" : "repository_not_available"]);
  const logs: RuntimeLog[] = process.env.NODE_ENV === "production" ? [] : events.map((item) => ({ ...item, timestamp: new Date().toISOString() }));
  if (response.meta) { response.meta.runtimeEvents = events; response.meta.runtimeLog = logs; }
  return { response, events, logs, context };
}
