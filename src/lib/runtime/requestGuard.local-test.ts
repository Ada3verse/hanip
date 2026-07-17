import { RuntimeRequestGuard } from "./requestGuard";

export function runRuntimeRequestGuardLocalTests() {
  const guard = new RuntimeRequestGuard();
  if (!guard.begin("same-request")) throw new Error("Request Guard local test failed: first request");
  if (guard.begin("same-request")) throw new Error("Request Guard local test failed: duplicate request");
  guard.end("same-request");
  if (!guard.begin("same-request")) throw new Error("Request Guard local test failed: released request");
  guard.end("same-request");
  return 3;
}
