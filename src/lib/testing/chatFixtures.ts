import type {
  AiEvaluation,
  AiMeta,
  ChatApiResponse,
  LearningStatus,
  TutorStrategy,
} from "@/lib/types/chat";
import type { ChatApiErrorResponse } from "@/lib/types/chat";

type FixtureOptions = {
  message: string;
  concept: string;
  evaluation?: AiEvaluation;
  nextAction?: string;
  suggestedReplies?: string[];
  misconception?: string;
  hintLevelUsed?: 0 | 1 | 2 | 3;
  learningStatus?: LearningStatus;
  completionEvidence?: string[];
  strategy?: TutorStrategy;
  flowStage?: string;
};

export function createChatFixture({
  message,
  concept,
  evaluation = "unknown",
  nextAction = "확인 질문",
  suggestedReplies = [],
  misconception = "",
  hintLevelUsed = 0,
  learningStatus = "in_progress",
  completionEvidence = [],
  strategy = "discover",
  flowStage = "진단",
}: FixtureOptions): ChatApiResponse {
  const meta: AiMeta = {
    concept,
    flowStage,
    evaluation,
    nextAction,
    misconception,
    confidence: 1,
    hintLevelUsed,
    learningStatus,
    completionEvidence,
    strategy,
  };

  return { message, suggestedReplies, meta };
}

export const MOCK_CHAT_ERROR_FIXTURES = {
  rateLimited: {
    error: {
      code: "RATE_LIMITED",
      message: "잠시 후 다시 시도해 주세요.",
      retryable: true,
    },
  },
  unavailable: {
    error: {
      code: "OPENAI_UNAVAILABLE",
      message: "AI 연결이 잠시 불안정합니다.",
      retryable: true,
    },
  },
  invalidApiKey: {
    error: {
      code: "INVALID_API_KEY",
      message: "AI 설정을 확인해 주세요.",
      retryable: false,
    },
  },
} satisfies Record<string, ChatApiErrorResponse>;
