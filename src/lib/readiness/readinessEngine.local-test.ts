import { READINESS_SCENARIOS } from "@/app/dev/readiness/scenarios";
import { createReadinessReport, fail, pass, warning } from "./readinessEngine";
function check(value: unknown, message: string) { if (!value) throw new Error(`Readiness test failed: ${message}`); }
export async function runReadinessEngineTests() {
  const report = await createReadinessReport(READINESS_SCENARIOS);
  check(report.scenarios.length === 15, "A-O scenarios");
  check(report.blockingIssueCount === 0 && report.status === "ready", "ready verdict");
  check(report.checks.every(({ area, title, message }) => area && title && message), "standard checks");
  const warningReport = await createReadinessReport([{ id: "W", title: "warning", area: "home", async run() { return { id: "W", title: "warning", checks: [warning("W", "home", "warning", "optional")], runtimeEvents: [], repositoryDiff: [], failedStep: null }; } }]);
  check(warningReport.status === "warning", "warning verdict");
  const failed = await createReadinessReport([{ id: "F", title: "fail", area: "build", async run() { return { id: "F", title: "fail", checks: [fail("BUILD_FAILED", "build", "fail", "failed")], runtimeEvents: [], repositoryDiff: [], failedStep: "build" }; } }]);
  check(failed.status === "not_ready" && failed.blockingIssueCount === 1, "blocking verdict");
  check(pass("OK", "privacy", "safe", "no secret").status === "pass", "pass helper");
}

