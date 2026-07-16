import type { RuntimeResponseGenerator } from "./responseGenerator";

export const mockResponseGenerator: RuntimeResponseGenerator = {
  provider: "mock",
  async generate({ plannedResponse }) { return plannedResponse; },
};
