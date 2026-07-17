import type { StudentConfidence, UnderstandingLevel } from "@/lib/studentModel/types";

export const EXPLANATION_STRATEGIES = [
  "definition", "comparison", "contrast", "analogy", "daily_example",
  "counterexample", "error_correction", "step_by_step", "visualization",
  "rule_discovery", "direct_application", "quiz", "fill_blank",
  "student_explanation", "teacher_feedback",
] as const;

export type ExplanationStrategy = (typeof EXPLANATION_STRATEGIES)[number];
export type ExplanationDepth = 1 | 2 | 3 | 4 | 5;

export interface ExplanationStrategyDefinition {
  id: ExplanationStrategy;
  difficulty: ExplanationDepth;
  recommendedWhen: string[];
  effect: string;
}

export interface ExplanationPlan {
  concept: string;
  strategy: ExplanationStrategy;
  depth: ExplanationDepth;
  exampleId: string | null;
  example: string | null;
  checkQuestion: string;
  useCount: number;
  reason: string[];
}

export interface ExplanationSelectionInput {
  concept: string;
  confidence: StudentConfidence;
  understandingLevel: UnderstandingLevel;
  misconception?: string;
  consecutiveFailures: number;
  history: import("@/lib/studentModel/types").ExplanationHistoryEntry[];
}
