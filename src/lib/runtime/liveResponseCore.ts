import type { ChatApiResponse } from "@/lib/types/chat";
import type { RuntimeResponseGenerator, RuntimeResponseGeneratorInput } from "./responseGenerator";

export const SAFE_LIVE_RESPONSE_MESSAGE = "지금은 답변을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";

export interface LiveResponseClient {
  create(input: unknown, options?: { signal?: AbortSignal }): Promise<{ output_text?: string }>;
}

export interface LiveResponseCoreOptions {
  client: LiveResponseClient | null;
  timeoutMs?: number;
  createRequest(input: RuntimeResponseGeneratorInput): unknown;
  log?: (entry: { provider: "openai"; category: string; requestId: string | null; elapsed: number }) => void;
}

function normalizeReplies(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 4)
    : [];
}

export function normalizeLiveOutput(output: string): Pick<ChatApiResponse, "message" | "suggestedReplies"> | null {
  const trimmed = output.trim();
  if (!trimmed) return null;
  try {
    const value = JSON.parse(trimmed) as Record<string, unknown>;
    const message = typeof value.message === "string" ? value.message.trim().slice(0, 4_000) : "";
    return message ? { message, suggestedReplies: normalizeReplies(value.suggestedReplies) } : null;
  } catch {
    return { message: trimmed.slice(0, 4_000), suggestedReplies: [] };
  }
}

export function getLiveErrorCategory(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return "timeout";
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
  if (status === 401) return "authentication";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "provider_unavailable";
  return "request_failed";
}

export function createLiveResponseCore(options: LiveResponseCoreOptions): RuntimeResponseGenerator {
  return {
    provider: "openai",
    async generate(input) {
      if (!options.client) return { message: SAFE_LIVE_RESPONSE_MESSAGE, suggestedReplies: [], meta: input.plannedResponse.meta };
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
      try {
        const response = await options.client.create(options.createRequest(input), { signal: controller.signal });
        const parsed = normalizeLiveOutput(response.output_text ?? "");
        if (!parsed) throw new Error("invalid_response");
        return { ...parsed, meta: input.plannedResponse.meta };
      } catch (error) {
        options.log?.({
          provider: "openai",
          category: getLiveErrorCategory(error),
          requestId: typeof error === "object" && error && "request_id" in error ? String(error.request_id) : null,
          elapsed: Date.now() - started,
        });
        return { message: SAFE_LIVE_RESPONSE_MESSAGE, suggestedReplies: [], meta: input.plannedResponse.meta };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
