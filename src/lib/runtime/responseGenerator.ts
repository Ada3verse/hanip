import type { ChatApiRequest, ChatApiResponse } from "@/lib/types/chat";

export interface RuntimeResponseGeneratorInput {
  request: ChatApiRequest;
  plannedResponse: ChatApiResponse;
}

export interface RuntimeResponseGenerator {
  readonly provider: "mock" | "openai";
  generate(input: RuntimeResponseGeneratorInput): Promise<ChatApiResponse>;
}

export type ResponseProviderKind = "mock" | "openai" | "blocked" | "misconfigured";

export interface ResponseProviderDecision {
  kind: ResponseProviderKind;
  reason: string;
}

export function selectResponseProvider(
  mockSetting: string | undefined,
  liveTestRequested = false,
  liveTestsEnabled = false,
  hasApiKey = true,
  isDevelopment = true,
): ResponseProviderKind {
  if (liveTestRequested && mockSetting !== "false") return "blocked";
  if (liveTestRequested && (!isDevelopment || !liveTestsEnabled)) return "blocked";
  const mockEnabled = mockSetting === "true" || (isDevelopment && mockSetting !== "false");
  if (mockEnabled && !liveTestRequested) return "mock";
  return hasApiKey ? "openai" : "misconfigured";
}

export function decideResponseProvider(input: {
  mockSetting?: string;
  liveTestRequested?: boolean;
  liveTestsEnabled?: boolean;
  apiKey?: string;
  isDevelopment?: boolean;
}): ResponseProviderDecision {
  const kind = selectResponseProvider(
    input.mockSetting,
    input.liveTestRequested,
    input.liveTestsEnabled,
    Boolean(input.apiKey?.trim()),
    input.isDevelopment,
  );
  const reason = kind === "mock" ? "mock_enabled"
    : kind === "openai" ? (input.liveTestRequested ? "manual_live_test" : "production_live")
      : kind === "blocked" ? "live_test_not_allowed"
        : "missing_api_key";
  return { kind, reason };
}
