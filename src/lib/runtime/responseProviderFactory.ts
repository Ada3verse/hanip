import type { RuntimeResponseGenerator } from "./responseGenerator";
import { decideResponseProvider, type ResponseProviderDecision } from "./responseGenerator";

export interface ResponseProviderFactoryInput {
  mockSetting?: string;
  liveTestRequested?: boolean;
  liveTestsEnabled?: boolean;
  apiKey?: string;
  isDevelopment?: boolean;
  mockGenerator: RuntimeResponseGenerator;
  createOpenAI(): RuntimeResponseGenerator;
}

export type ResponseProviderFactoryResult = ResponseProviderDecision & {
  generator: RuntimeResponseGenerator | null;
};

export function createResponseProvider(input: ResponseProviderFactoryInput): ResponseProviderFactoryResult {
  const decision = decideResponseProvider(input);
  if (decision.kind === "mock") return { ...decision, generator: input.mockGenerator };
  if (decision.kind === "openai") return { ...decision, generator: input.createOpenAI() };
  return { ...decision, generator: null };
}
