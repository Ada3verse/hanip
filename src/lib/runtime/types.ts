import type { AuthUser } from "@/lib/auth/types";
import type { AdaptiveProfile } from "@/lib/adaptive/types";
import type { AnswerEvaluationResult } from "@/lib/evaluation/types";
import type { GoalState } from "@/lib/goal/types";
import type { HintState } from "@/lib/hint/types";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import type { LearningState } from "@/lib/learningState/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { LearningRepository } from "@/lib/repository/learningRepository";
import type { SummaryState } from "@/lib/sessionSummary/types";
import type { UserSettings } from "@/lib/settings/types";
import type { ChatApiRequest, ChatApiResponse, ChatMessage } from "@/lib/types/chat";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import type { RuntimeResponseGenerator } from "./responseGenerator";
import type { RuntimeStudentModel } from "@/lib/studentModel/types";

export const RUNTIME_STEPS = ["START", "RESTORE", "SESSION_START", "STUDENT_MODEL", "LEARNING_STATE", "GOAL", "ADAPTIVE", "RETRIEVAL", "EVALUATION", "MASTERY", "HINT", "WORKED_EXAMPLE", "MISCONCEPTION", "SUMMARY", "PERSONA", "RESPONSE", "SAVE"] as const;
export type RuntimeStep = (typeof RUNTIME_STEPS)[number] | "ERROR";
export interface RuntimeEvent { step: RuntimeStep; elapsed: number; engine: string; result: "success" | "skipped" | "recovered"; reason: string[]; warning: string[]; }
export interface RuntimeLog extends RuntimeEvent { timestamp: string; }
export interface RuntimeContext {
  authUser: AuthUser | null; repository: LearningRepository | null; learningState: LearningState | null; mastery: MasteryState | null;
  adaptiveProfile: AdaptiveProfile | null; misconceptionProfile: MisconceptionProfile | null; hintState: HintState | null; goal: GoalState | null;
  evaluation: AnswerEvaluationResult | null; retrieval: KnowledgeEvidenceBundle | null; workedExample: WorkedExampleState | null;
  summary: SummaryState | null; tutorSettings: UserSettings | null; chatHistory: ChatMessage[];
  studentModel: RuntimeStudentModel;
}
export interface TutorRuntimeInput { request: ChatApiRequest; authUser?: AuthUser | null; repository?: LearningRepository | null; failSteps?: RuntimeStep[]; responseGenerator?: RuntimeResponseGenerator; }
export interface RuntimeProviderFailure { category: string; requestId: string | null; retryable: boolean; }
export interface TutorRuntimeResult { response: ChatApiResponse; events: RuntimeEvent[]; logs: RuntimeLog[]; context: RuntimeContext; providerFailure?: RuntimeProviderFailure; }
