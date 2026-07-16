import type { DialoguePlan } from "@/lib/dialogue/types";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import type { MisconceptionDefinition } from "@/lib/knowledge/misconceptions";
import type { AiEvaluation } from "@/lib/types/chat";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import type { AdaptiveTurnStrategy } from "@/lib/adaptive/types";

export interface AnswerEvaluationInput {
  studentAnswer: string;
  activeConcept: string;
  dialoguePlan: DialoguePlan;
  retrievedEvidence: KnowledgeEvidenceBundle;
  misconceptionLibrary: readonly MisconceptionDefinition[];
  completionCriteria: readonly string[];
  previousEvaluation?: AiEvaluation | null;
  workedExampleState?: WorkedExampleState | null;
  adaptiveStrategy?: AdaptiveTurnStrategy | null;
}

export interface AnswerEvaluationResult {
  evaluation: AiEvaluation;
  confidence: number;
  matchedEvidence: string[];
  matchedKeywords: string[];
  matchedExamples: string[];
  matchedMisconceptions: string[];
  completionSatisfied: boolean;
  reason: string[];
}
