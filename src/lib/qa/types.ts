import type {
  ChatMessage,
  ChatStartType,
  LearningGoal,
  LearningMode,
  StudentSessionModel,
} from "@/lib/types/chat";
import type { AiMeta } from "@/lib/types/chat";

export interface ConversationQaExpectation {
  activeConceptMustRemain?: string;
  forbiddenPhrases?: string[];
  requiredFocusKeywords?: string[];
  maxAssistantSentences?: number;
  maxQuestionsPerTurn?: number;
  forbidRepeatedSuggestedReplies?: boolean;
  forbidRepeatedOpening?: boolean;
  mustUseProgress?: boolean;
  mustNotRestorePreviousMessages?: boolean;
}

export interface ConversationQaScenario {
  id: string;
  title: string;
  startQuestion: string;
  mode: LearningMode;
  goal: LearningGoal;
  startType?: ChatStartType;
  priorProgress?: {
    conceptId: string;
    status: "not_started" | "learning" | "needs_review" | "understood";
    masteryScore: number;
    misconceptionIds?: string[];
  };
  previousMessages?: ChatMessage[];
  initialStudentModel?: Partial<StudentSessionModel>;
  studentTurns: string[];
  expected: ConversationQaExpectation;
}

export interface ConversationQaIssue {
  code: string;
  turn: number;
  message: string;
}

export interface ConversationQaAssistantDetail {
  turn: number;
  studentInput: string;
  response: string;
  suggestedReplies: string[];
  meta?: AiMeta;
}

export interface ConversationQaResult {
  scenarioId: string;
  status: "pass" | "warning" | "fail";
  issues: ConversationQaIssue[];
  transcript: ChatMessage[];
  assistantDetails: ConversationQaAssistantDetail[];
}
