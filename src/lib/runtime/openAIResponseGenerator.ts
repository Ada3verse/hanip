import "server-only";

import OpenAI from "openai";
import type { RuntimeResponseGenerator, RuntimeResponseGeneratorInput } from "./responseGenerator";
import { createLiveResponseCore, type LiveResponseClient } from "./liveResponseCore";
import { buildRuntimeKnowledgePayload } from "./knowledgePrompt";

const MAX_RECENT_MESSAGES = 8;

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

export function buildLiveResponseInput({ request, plannedResponse }: RuntimeResponseGeneratorInput) {
  const meta = plannedResponse.meta; const plan = meta?.dialoguePlan; const persona = meta?.tutorPersona;
  const knowledge = buildRuntimeKnowledgePayload(plannedResponse);
  const studentConceptState = plan?.studentModel?.concepts?.[plan.activeConcept];
  const explanationHistory = plan?.studentModel?.explanationHistory.filter(({ conceptId }) => conceptId === plan.activeConcept) ?? [];
  const runtimeDecision = {
    currentQuestion: request.messages.at(-1)?.content.slice(0, 2_000) ?? "",
    activeConcept: plan?.activeConcept ?? meta?.concept ?? "",
    action: plan?.action ?? meta?.nextAction ?? "ask",
    teachingGoal: plan?.teachingGoal ?? "",
    teachingLevel: plan?.teachingLevel ?? 2,
    teachingStrategy: plan?.teachingStrategy ?? "DIRECT_EXPLANATION",
    responseMode: plan?.responseMode ?? "direct_answer_then_check",
    requestedExampleCount: Math.min(3, Math.max(0, plan?.requestedExampleCount ?? 0)),
    comparisonTargets: plan?.requestedComparisonTargets?.slice(0, 2) ?? [],
    originalQuestion: plan?.originalQuestion?.slice(0, 500) ?? "",
    routeReturn: plan?.suspendedConcept ? { suspendedConcept: plan.suspendedConcept, currentConcept: plan.activeConcept } : null,
    studentConcept: studentConceptState ? {
      understandingLevel: studentConceptState.understandingLevel,
      confidence: studentConceptState.confidence,
      misconception: studentConceptState.misconceptionSummary?.slice(0, 200) ?? "",
      usedExamples: explanationHistory.flatMap(({ exampleIds }) => exampleIds).slice(-8),
    } : null,
    knowledgeStrategy: knowledge.strategy,
    evidence: knowledge.evidence,
  };
  return {
    instructions: [
      "당신은 중학교 1학년 국어 문법 교사 AI 한잎입니다.",
      "학생의 현재 질문에 먼저 직접 답하세요. 제공된 evidence만 지식 근거로 사용하고, 범위 밖 일반 지식을 보충하지 마세요.",
      "짧고 자연스러운 한국어로 설명하고 질문은 최대 하나만 사용하세요. 같은 예문과 확인 질문은 반복하지 마세요.",
      "출처 ID, 페이지, 검토 정보, 내부 상태와 점수를 학생에게 노출하거나 교과서 문장을 길게 복제하지 마세요.",
      "Runtime 결정은 이미 계산되었습니다. 평가와 전략을 다시 계산하지 말고 표현만 생성하세요.",
      persona ? `말투: ${persona.tone}. 응답 형태: ${persona.responseShape}.` : "",
      JSON.stringify(runtimeDecision),
    ].filter(Boolean).join("\n\n"),
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
      return { model, instructions: liveInput.instructions, input: liveInput.messages, text: { format: { type: "json_schema", name: "hanip_student_response", strict: true, schema: { type: "object", additionalProperties: false, properties: { answer: { type: "string" }, suggestedReplies: { type: "array", maxItems: 3, items: { type: "string" } } }, required: ["answer", "suggestedReplies"] } } } };
    },
  });
}
