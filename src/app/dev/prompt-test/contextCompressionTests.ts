import type { ChatApiRequest } from "@/lib/types/chat";

export const CONTEXT_COMPRESSION_TEST_REQUEST: ChatApiRequest = {
  messages: Array.from({ length: 40 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content:
      index % 2 === 0
        ? `학생 질문 ${index / 2 + 1}`
        : `AI 응답 ${(index + 1) / 2}`,
  })),
  studentModel: {
    currentConcept: "수사와 수 관형사",
    currentFlowStage: "적용",
    understoodConcepts: ["뒤 명사 수식"],
    needsSupportConcepts: [],
    misconceptions: ["의미만으로 판단"],
    lastEvaluation: "correct",
    lastNextAction: "새 예문 적용 확인",
    confidence: 0.91,
    consecutiveSuggestedReplyUses: 0,
    lastResponseMode: "typed",
    hintLevel: 2,
    consecutiveUnknownResponses: 0,
    learningStatus: "completed",
    completionEvidence: ["뒤 명사 수식 기준 설명", "새 예문 적용 성공"],
  },
};

export const CONTEXT_COMPRESSION_EXPECTATIONS = {
  summaryPresent: true,
  inputMessageCount: 8,
  summarizedMessageCount: 32,
  currentConcept: "수사와 수 관형사",
  learningStatus: "completed",
  suggestedRepliesPreserved: true,
} as const;
