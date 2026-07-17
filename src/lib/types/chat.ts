import type { LearningProgress } from "@/lib/progress/types";
import type { LearningRoute } from "@/lib/knowledge/dependency/learningRoute";
import type { LearningState } from "@/lib/learningState/types";
import type { PublicDialoguePlan } from "@/lib/dialogue/types";
import type { PublicTutorPersonaPlan } from "@/lib/persona/types";
import type { SelectedKnowledgeBundle } from "@/lib/knowledge/source/types";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import type { AnswerEvaluationResult } from "@/lib/evaluation/types";
import type { MasteryState } from "@/lib/mastery/types";
import type { HintState } from "@/lib/hint/types";
import type { SessionEvaluationRecord, SummaryState } from "@/lib/sessionSummary/types";
import type { GoalState } from "@/lib/goal/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { AdaptiveProfile, AdaptiveTurnStrategy } from "@/lib/adaptive/types";
import type { RuntimeEvent, RuntimeLog } from "@/lib/runtime/types";
import type { RuntimeStudentModel } from "@/lib/studentModel/types";

export const AI_EVALUATIONS = [
  "correct",
  "partial_correct",
  "misconception",
  "apply_fail",
  "unknown",
] as const;

export const LEARNING_STATUSES = [
  "in_progress",
  "ready_to_complete",
  "completed",
] as const;

export const LEARNING_MODES = ["learn", "review", "practice"] as const;
export const LEARNING_GOALS = [
  "concept",
  "exam",
  "practice",
  "review",
] as const;
export const TUTOR_STRATEGIES = [
  "discover",
  "guide",
  "challenge",
  "review",
  "mastery",
] as const;

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id?: string;
  role: ChatRole;
  content: string;
};

export type AiEvaluation = (typeof AI_EVALUATIONS)[number];

export type AiNextAction = string;
export type StudentResponseMode = "typed" | "suggested";
export type ChatStartType = "new" | "resume_session" | "resume_progress";
export type LearningStatus = (typeof LEARNING_STATUSES)[number];
export type LearningMode = (typeof LEARNING_MODES)[number];
export type LearningGoal = (typeof LEARNING_GOALS)[number];
export type TutorStrategy = (typeof TUTOR_STRATEGIES)[number];

export type AiMeta = {
  concept: string;
  flowStage: string;
  evaluation: AiEvaluation;
  nextAction: AiNextAction;
  misconception: string;
  confidence: number;
  hintLevelUsed?: 0 | 1 | 2 | 3;
  learningStatus: LearningStatus;
  completionEvidence: string[];
  strategy: TutorStrategy;
  learningState?: LearningState;
  dialoguePlan?: PublicDialoguePlan;
  tutorPersona?: PublicTutorPersonaPlan;
  knowledgeBundle?: SelectedKnowledgeBundle;
  retrieval?: KnowledgeEvidenceBundle;
  answerEvaluation?: AnswerEvaluationResult;
  mastery?: MasteryState;
  hintState?: HintState;
  workedExampleState?: import("@/lib/workedExample/types").WorkedExampleState | null;
  sessionSummary?: SummaryState | null;
  goalState?: GoalState;
  misconceptionProfiles?: MisconceptionProfile[];
  adaptiveProfile?: AdaptiveProfile;
  adaptiveStrategy?: AdaptiveTurnStrategy;
  runtimeEvents?: RuntimeEvent[];
  runtimeLog?: RuntimeLog[];
  studentModel?: RuntimeStudentModel;
  explanationPlan?: import("@/lib/explanation/types").ExplanationPlan;
};

export type StudentSessionModel = {
  currentConcept: string;
  currentFlowStage: string;
  understoodConcepts: string[];
  needsSupportConcepts: string[];
  misconceptions: string[];
  lastEvaluation: AiEvaluation | null;
  lastNextAction: AiNextAction | null;
  confidence: number | null;
  consecutiveSuggestedReplyUses: number;
  lastResponseMode: StudentResponseMode | null;
  hintLevel: 0 | 1 | 2 | 3;
  consecutiveUnknownResponses: number;
  learningStatus: LearningStatus;
  completionEvidence: string[];
  learningMode: LearningMode;
  learningGoal: LearningGoal;
  priorProgressLoaded: boolean;
  priorMasteryScore: number | null;
  priorConceptStatus:
    | "not_started"
    | "learning"
    | "needs_review"
    | "understood"
    | null;
  activePrerequisite: string | null;
  completedPrerequisites: string[];
  prerequisiteReturnConcept: string | null;
  learningRoute: LearningRoute | null;
  suspendedConcept: string | null;
  hintStates?: Record<string, HintState>;
  workedExampleStates?: Record<string, import("@/lib/workedExample/types").WorkedExampleState>;
  masteryStates?: Record<string, MasteryState>;
  evaluationHistory?: SessionEvaluationRecord[];
  sessionStartedAt?: string;
  goalState?: GoalState;
  misconceptionProfiles?: MisconceptionProfile[];
  adaptiveProfile?: AdaptiveProfile;
  responseModeHistory?: StudentResponseMode[];
  sessionSummaries?: SummaryState[];
  studentProfile?: RuntimeStudentModel;
  knowledgePackId?: string;
  knowledgeReleaseId?: string;
  knowledgeVersion?: string;
};

export type ChatApiRequest = {
  messages: ChatMessage[];
  studentModel?: Partial<StudentSessionModel>;
  learningMode?: LearningMode;
  learningGoal?: LearningGoal;
  priorProgressContext?: string;
  learningProgress?: LearningProgress;
  learningState?: LearningState;
  startType?: ChatStartType;
  recentSuggestedReplies?: string[][];
  knowledgeBundle?: SelectedKnowledgeBundle;
};

export type CompressedChatContext = {
  summary: string;
  recentMessages: ChatMessage[];
  summarizedMessageCount: number;
  summaryVersion: number | null;
  summaryRefreshed: boolean;
};

export type ChatApiResponse = {
  message: string;
  suggestedReplies: string[];
  meta?: AiMeta;
};

export const CHAT_API_ERROR_CODES = [
  "RATE_LIMITED",
  "INVALID_API_KEY",
  "OPENAI_UNAVAILABLE",
  "INVALID_REQUEST",
  "LIVE_TESTS_DISABLED",
  "LIVE_TEST_LIMIT_REACHED",
  "PROVIDER_CONFIGURATION_ERROR",
  "AUTHENTICATION_ERROR",
  "QUOTA_EXCEEDED",
  "NETWORK_ERROR",
  "INVALID_RESPONSE",
  "KNOWLEDGE_NOT_FOUND",
  "UNKNOWN_ERROR",
] as const;

export type ChatApiErrorCode = (typeof CHAT_API_ERROR_CODES)[number];

export type ChatApiErrorResponse = {
  error: {
    code: ChatApiErrorCode;
    message: string;
    retryable: boolean;
  };
};

export type PersistedChatSession = {
  sessionId?: string;
  version: 1;
  savedAt: string;
  messages: ChatMessage[];
  studentModel: StudentSessionModel;
  learningMode: LearningMode;
  learningGoal: LearningGoal;
  activeSuggestedReplies: string[];
  lastWorkedExampleId: string | null;
  contextSummary: string;
};
