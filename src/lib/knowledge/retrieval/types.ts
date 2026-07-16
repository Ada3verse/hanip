import type { DialogueAction, DialoguePlan } from "@/lib/dialogue/types";
import type { KnowledgeSource } from "@/lib/knowledge/source/types";
import type { KnowledgeCandidate } from "@/lib/knowledge/source/types";
import type { StudentSessionModel } from "@/lib/types/chat";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";

export type RetrievalRole = "definition" | "worked_example" | "misconception" | "hint" | "bridge" | "completion_criterion" | "diagnostic_question";

export interface RetrievedEvidence {
  id: string;
  role: RetrievalRole;
  content: string;
  source: KnowledgeSource;
}

export interface KnowledgeRetrievalResult {
  concept: string;
  action: DialogueAction;
  reason: string[];
  selectedSources: KnowledgeSource[];
  usedEvidence: Array<Omit<RetrievedEvidence, "source">>;
}

export type KnowledgeEvidenceBundle = Pick<KnowledgeRetrievalResult, "reason" | "selectedSources" | "usedEvidence">;

export function toKnowledgeEvidenceBundle(result: KnowledgeRetrievalResult): KnowledgeEvidenceBundle {
  return { reason: result.reason, selectedSources: result.selectedSources, usedEvidence: result.usedEvidence };
}

export interface KnowledgeRetrievalInput {
  dialoguePlan: DialoguePlan;
  studentModel?: Partial<StudentSessionModel>;
  recentStudentMessage?: string;
  conversationMessages?: readonly string[];
  knowledgeCandidates?: readonly KnowledgeCandidate[];
  workedExampleState?: WorkedExampleState | null;
  misconceptionProfiles?: readonly MisconceptionProfile[];
}
