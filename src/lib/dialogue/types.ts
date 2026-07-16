export const DIALOGUE_ACTIONS = [
  "diagnose", "ask", "hint", "explain", "confirm", "bridge",
  "return_to_route", "complete",
] as const;

export const SUGGESTED_REPLY_MODES = [
  "none", "choice", "yes_no", "short_reason", "keyword",
] as const;

export type DialogueAction = (typeof DIALOGUE_ACTIONS)[number];
export type SuggestedReplyMode = (typeof SUGGESTED_REPLY_MODES)[number];

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
>;
