import type { ChatApiRequest, ChatApiResponse } from "@/lib/types/chat";

export interface RuntimeResponseGeneratorInput {
  request: ChatApiRequest;
  plannedResponse: ChatApiResponse;
}

export interface RuntimeResponseGenerator {
  readonly provider: "mock" | "openai";
  generate(input: RuntimeResponseGeneratorInput): Promise<ChatApiResponse>;
}

export function selectResponseProvider(mockSetting: string | undefined, liveTestRequested = false, liveTestsEnabled = false) {
  if (liveTestRequested) return liveTestsEnabled ? "openai" as const : "blocked" as const;
  return mockSetting === "false" ? "openai" as const : "mock" as const;
}
