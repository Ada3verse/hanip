import type { ReadinessCheck, ReadinessReport, ReadinessScenario, ReadinessScenarioResult } from "./types";
export function pass(id: string, area: ReadinessCheck["area"], title: string, message: string): ReadinessCheck { return { id, area, title, status: "pass", message, blocking: false }; }
export function fail(id: string, area: ReadinessCheck["area"], title: string, message: string, blocking = true): ReadinessCheck { return { id, area, title, status: "fail", message, blocking }; }
export function warning(id: string, area: ReadinessCheck["area"], title: string, message: string): ReadinessCheck { return { id, area, title, status: "warning", message, blocking: false }; }
export async function runReadinessScenario(scenario: ReadinessScenario): Promise<ReadinessScenarioResult> {
  try { return await scenario.run(); }
  catch (error) { return { id: scenario.id, title: scenario.title, checks: [fail(`${scenario.id}_UNEXPECTED`, scenario.area, scenario.title, error instanceof Error ? error.message : "알 수 없는 오류")], runtimeEvents: [], repositoryDiff: [], failedStep: "unexpected_error" }; }
}
export async function createReadinessReport(scenarios: ReadinessScenario[]): Promise<ReadinessReport> {
  const results: ReadinessScenarioResult[] = [];
  for (const scenario of scenarios) results.push(await runReadinessScenario(scenario));
  const checks = results.flatMap(({ checks }) => checks);
  const blockingIssueCount = checks.filter(({ status, blocking }) => status === "fail" && blocking).length;
  const warningCount = checks.filter(({ status }) => status === "warning").length;
  return { generatedAt: new Date().toISOString(), status: blockingIssueCount ? "not_ready" : warningCount ? "warning" : "ready", checks, scenarios: results, blockingIssueCount, warningCount };
}

