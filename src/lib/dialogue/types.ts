export const DIALOGUE_ACTIONS = [
  "diagnose", "ask", "hint", "explain", "confirm", "bridge",
  "return_to_route", "complete",
] as const;

export const SUGGESTED_REPLY_MODES = [
  "none", "choice", "yes_no", "short_reason", "keyword",
] as const;

export type DialogueAction = (typeof DIALOGUE_ACTIONS)[number];
export type SuggestedReplyMode = (typeof SUGGESTED_REPLY_MODES)[number];

export type UserIntent =
  | "explain_request"
  | "compare_request"
  | "example_request"
  | "definition_request"
  | "solve_or_apply_request"
  | "usage_request"
  | "necessity_request"
  | "confirmation_answer"
  | "uncertainty_or_confusion"
  | "unrelated_question"
  | "session_control";

export type DialogueResponseMode =
  | "direct_answer"
  | "direct_answer_then_check"
  | "same_concept_reexplain"
  | "hint"
  | "bridge_to_prerequisite"
  | "return_to_original";

export type TeachingLevel = 1 | 2 | 3;
export type TeachingStrategy =
  | "DIRECT_EXPLANATION"
  | "COMPARE"
  | "EXAMPLE"
  | "QUIZ"
  | "GUIDED_DISCOVERY";

export interface DialoguePlan {
  activeConcept: string;
  action: DialogueAction;
  questionPurpose: string;
  requiredFocus: string;
  forbiddenTopics: string[];
  suggestedReplyMode: SuggestedReplyMode;
  maxQuestions: 1;
  reason: string[];
  hintLevel: import("@/lib/hint/types").AdaptiveHintLevel;
  hintType: import("@/lib/hint/types").HintType;
  userIntent?: UserIntent[];
  responseMode?: DialogueResponseMode;
  directAnswerRequired?: boolean;
  requestedExampleCount?: number;
  requestedComparisonTargets?: string[];
  prerequisiteAllowed?: boolean;
  prerequisiteReason?: string;
  failureCountForActiveConcept?: number;
  originalQuestion?: string;
  suspendedConcept?: string | null;
  teachingGoal?: string;
  teachingLevel?: TeachingLevel;
  teachingStrategy?: TeachingStrategy;
  explanationPlan?: import("@/lib/explanation/types").ExplanationPlan;
  studentModel?: import("@/lib/studentModel/types").RuntimeStudentModel;
}

export type PublicDialoguePlan = Pick<
  DialoguePlan,
  | "activeConcept"
  | "action"
  | "questionPurpose"
  | "requiredFocus"
  | "suggestedReplyMode"
  | "hintLevel"
  | "hintType"
  | "userIntent"
  | "responseMode"
  | "directAnswerRequired"
  | "requestedExampleCount"
  | "requestedComparisonTargets"
  | "prerequisiteAllowed"
  | "prerequisiteReason"
  | "failureCountForActiveConcept"
  | "originalQuestion"
  | "suspendedConcept"
  | "teachingGoal"
  | "teachingLevel"
  | "teachingStrategy"
  | "explanationPlan"
  | "studentModel"
>;
