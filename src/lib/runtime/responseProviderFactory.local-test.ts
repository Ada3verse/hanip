import { mockResponseGenerator } from "./mockResponseGenerator";
import { createResponseProvider } from "./responseProviderFactory";

export function runResponseProviderFactoryLocalTests() {
  let liveConstructions = 0;
  const make = (overrides: Partial<Parameters<typeof createResponseProvider>[0]> = {}) => createResponseProvider({
    mockSetting: "true",
    liveTestsEnabled: false,
    liveTestRequested: false,
    apiKey: "test-key",
    isDevelopment: true,
    mockGenerator: mockResponseGenerator,
    createOpenAI: () => { liveConstructions += 1; return { provider: "openai", generate: async ({ plannedResponse }) => plannedResponse }; },
    ...overrides,
  });
  const check = (condition: boolean, label: string) => { if (!condition) throw new Error(`Response Provider Factory local test failed: ${label}`); };
  check(make().kind === "mock" && liveConstructions === 0, "A mock never constructs OpenAI");
  check(make({ mockSetting: "false" }).kind === "openai" && liveConstructions === 1, "B production live");
  check(make({ mockSetting: "false", apiKey: "" }).kind === "misconfigured" && liveConstructions === 1, "C missing key");
  check(make({ liveTestRequested: true, liveTestsEnabled: false }).kind === "blocked" && liveConstructions === 1, "D manual flag gate");
  check(make({ mockSetting: "false", liveTestRequested: true, liveTestsEnabled: true }).kind === "openai" && liveConstructions === 2, "E explicit manual live");
  check(make({ mockSetting: "false", liveTestRequested: true, liveTestsEnabled: true, isDevelopment: false }).kind === "blocked" && liveConstructions === 2, "F production dev route blocked");
  check(make({ mockSetting: undefined, isDevelopment: false }).kind === "openai" && liveConstructions === 3, "G production defaults to OpenAI");
  check(make({ mockSetting: undefined, isDevelopment: false, apiKey: "" }).kind === "misconfigured" && liveConstructions === 3, "H production missing key fails closed");
  check(make({ mockSetting: "true", isDevelopment: false }).kind === "mock" && liveConstructions === 3, "I explicit production mock remains available");
  return 9;
}
