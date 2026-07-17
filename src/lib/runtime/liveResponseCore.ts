import type { ChatApiResponse } from "@/lib/types/chat";
import type { RuntimeResponseGenerator, RuntimeResponseGeneratorInput } from "./responseGenerator";

export const SAFE_LIVE_RESPONSE_MESSAGE = "지금은 답변을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";

export class RuntimeProviderError extends Error {
  constructor(
    public readonly category: string,
    public readonly requestId: string | null,
    public readonly retryable: boolean,
  ) {
    super(category);
    this.name = "RuntimeProviderError";
  }
}

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
    .map((item) => item.slice(0, 40)).slice(0, 3)
    : [];
}

const INTERNAL_ID_PATTERN = /\b(?:sourceId|documentId|chunkId|pageRange|reviewer|checksum)\b|(?:source|document|chunk)[_-]?[a-z0-9:-]{6,}/i;
const API_KEY_PATTERN = /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/;

export function normalizeLiveOutput(
  output: string,
  evidence: string[] = [],
): Pick<ChatApiResponse, "message" | "suggestedReplies"> | null {
  const trimmed = output.trim();
  if (!trimmed) return null;
  try {
    const value = JSON.parse(trimmed) as Record<string, unknown>;
    const rawMessage = typeof value.answer === "string" ? value.answer : value.message;
    const message = typeof rawMessage === "string"
      ? rawMessage.trim().replace(/```[\s\S]*?```/g, "").replace(/^(?:#{1,6}\s*)/gm, "").slice(0, 4_000)
      : "";
    if (!message || INTERNAL_ID_PATTERN.test(message) || API_KEY_PATTERN.test(message)) return null;
    const suspiciousCopy = evidence.some((item) => item.length >= 240 && message.includes(item.slice(0, 240)));
    return suspiciousCopy ? null : { message, suggestedReplies: normalizeReplies(value.suggestedReplies) };
  } catch {
    return null;
  }
}

export function getLiveErrorCategory(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return "timeout";
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
  const value = typeof error === "object" && error ? error as Record<string, unknown> : {};
  const code = String(value.code ?? value.type ?? "").toLowerCase();
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (status === 401) return code.includes("api_key") ? "invalid_api_key" : "authentication_error";
  if (status === 429 && (code.includes("quota") || message.includes("quota"))) return "quota_exceeded";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "provider_unavailable";
  if (/network|fetch|econn|enotfound/.test(message)) return "network_error";
  if (message === "invalid_response") return "invalid_response";
  return "unknown_error";
}

function isRetryableCategory(category: string) {
  return ["timeout", "network_error", "provider_unavailable"].includes(category);
}

export function createLiveResponseCore(options: LiveResponseCoreOptions): RuntimeResponseGenerator {
  return {
    provider: "openai",
    async generate(input) {
      if (!options.client) throw new RuntimeProviderError("missing_api_key", null, false);
      const started = Date.now();
      let lastError: RuntimeProviderError | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
        try {
          const response = await options.client.create(options.createRequest(input), { signal: controller.signal });
          const evidence = input.plannedResponse.meta?.retrieval?.usedEvidence.map(({ content }) => content) ?? [];
          const parsed = normalizeLiveOutput(response.output_text ?? "", evidence);
          if (!parsed) throw new Error("invalid_response");
          return { ...parsed, meta: input.plannedResponse.meta };
        } catch (error) {
          const category = getLiveErrorCategory(error);
          const requestId = typeof error === "object" && error && "request_id" in error ? String(error.request_id) : null;
          lastError = new RuntimeProviderError(category, requestId, isRetryableCategory(category));
          if (!lastError.retryable || attempt === 1) break;
        } finally {
          clearTimeout(timer);
        }
      }
      options.log?.({ provider: "openai", category: lastError?.category ?? "unknown_error", requestId: lastError?.requestId ?? null, elapsed: Date.now() - started });
      throw lastError ?? new RuntimeProviderError("unknown_error", null, false);
    },
  };
}
