import type { RuntimeEvent } from "@/lib/runtime/types";
export const READINESS_AREAS = ["startup", "authentication", "repository", "home", "chat", "runtime", "progress", "account", "settings", "session", "accessibility", "privacy", "error_recovery", "build"] as const;
export type ReadinessArea = (typeof READINESS_AREAS)[number];
export interface ReadinessCheck { id: string; area: ReadinessArea; title: string; status: "pass" | "warning" | "fail"; message: string; blocking: boolean; }
export interface ReadinessScenarioResult { id: string; title: string; checks: ReadinessCheck[]; runtimeEvents: RuntimeEvent[]; repositoryDiff: string[]; failedStep: string | null; }
export interface ReadinessReport { generatedAt: string; status: "ready" | "warning" | "not_ready"; checks: ReadinessCheck[]; scenarios: ReadinessScenarioResult[]; blockingIssueCount: number; warningCount: number; }
export interface ReadinessScenario { id: string; title: string; area: ReadinessArea; run(): Promise<ReadinessScenarioResult>; }

