import type { AiEvaluation } from "@/lib/types/chat";
import type { HintState } from "@/lib/hint/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { AdaptiveTurnStrategy } from "@/lib/adaptive/types";

export type WorkedExampleStep = 1 | 2 | 3 | 4 | 5;

export interface WorkedExampleState {
  conceptId: string;
  exampleId: string;
  exampleTitle: string;
  exampleStep: WorkedExampleStep;
  exampleAttempts: number;
  originQuestion: string;
  originConcept: string;
  returnConcept: string;
  completedExample: boolean;
  exampleHistory: string[];
}

export interface WorkedExampleEngineInput {
  conceptId: string;
  evaluation: AiEvaluation;
  hintState: HintState;
  mastery: MasteryState;
  retrievedEvidence: KnowledgeEvidenceBundle;
  originQuestion: string;
  returnConcept: string;
  previous?: WorkedExampleState | null;
  applyFailCount?: number;
  misconceptionCount?: number;
  terminationRequested?: boolean;
  activeMisconceptionProfile?: MisconceptionProfile | null;
  adaptiveStrategy?: AdaptiveTurnStrategy | null;
}
