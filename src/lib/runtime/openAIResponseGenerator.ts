import "server-only";

import OpenAI from "openai";
import systemPrompt from "@/lib/prompts/systemPrompt";
import type { RuntimeResponseGenerator, RuntimeResponseGeneratorInput } from "./responseGenerator";
import { createLiveResponseCore, type LiveResponseClient } from "./liveResponseCore";

const MAX_RECENT_MESSAGES = 8;
const MAX_EVIDENCE = 4;

export interface OpenAIResponseClient extends LiveResponseClient {
  create(input: Parameters<OpenAI["responses"]["create"]>[0], options?: { signal?: AbortSignal }): Promise<{ output_text?: string; _request_id?: string | null }>;
}

export interface OpenAIResponseGeneratorOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  client?: OpenAIResponseClient;
  log?: (entry: { provider: "openai"; category: string; requestId: string | null; elapsed: number }) => void;
}

function text(value: unknown, max = 600) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export function buildLiveResponseInput({ request, plannedResponse }: RuntimeResponseGeneratorInput) {
  const meta = plannedResponse.meta; const plan = meta?.dialoguePlan; const persona = meta?.tutorPersona;
  const evidence = meta?.retrieval?.usedEvidence?.slice(0, MAX_EVIDENCE).map((item) => ({ role: item.role, content: text(item.content) })) ?? [];
  return {
    instructions: [systemPrompt, "아래 Runtime 결정은 이미 계산된 결과입니다. 다시 평가하거나 변경하지 말고 학생에게 보여 줄 자연스러운 답변만 생성하세요.", JSON.stringify({ activeConcept: plan?.activeConcept ?? meta?.concept ?? "", action: plan?.action ?? meta?.nextAction ?? "ask", questionPurpose: plan?.questionPurpose ?? "", requiredFocus: plan?.requiredFocus ?? "", suggestedReplyMode: plan?.suggestedReplyMode ?? "none", evaluation: meta?.evaluation ?? "unknown", persona: persona ? { tone: persona.tone, responseShape: persona.responseShape } : null, hint: meta?.hintState ? { hintLevel: meta.hintState.hintLevel, hintType: meta.hintState.lastHintType } : null, workedExample: meta?.workedExampleState ? { exampleTitle: meta.workedExampleState.exampleTitle, exampleStep: meta.workedExampleState.exampleStep } : null, evidence })].join("\n\n"),
    messages: request.messages.slice(-MAX_RECENT_MESSAGES).map(({ role, content }) => ({ role, content: content.slice(0, 2_000) })),
  };
}

export function createOpenAIResponseGenerator(options: OpenAIResponseGeneratorOptions = {}): RuntimeResponseGenerator {
  const apiKey = options.apiKey?.trim();
  const client = options.client ?? (apiKey ? new OpenAI({ apiKey, maxRetries: 0 }).responses as unknown as OpenAIResponseClient : null);
  const model = options.model?.trim() || "gpt-5.6";
  return createLiveResponseCore({
    client,
    timeoutMs: options.timeoutMs,
    log: options.log,
    createRequest(input) {
      const liveInput = buildLiveResponseInput(input);
      return { model, instructions: liveInput.instructions, input: liveInput.messages, text: { format: { type: "json_schema", name: "hanip_student_response", strict: true, schema: { type: "object", additionalProperties: false, properties: { message: { type: "string" }, suggestedReplies: { type: "array", maxItems: 4, items: { type: "string" } } }, required: ["message", "suggestedReplies"] } } } };
    },
  });
}
