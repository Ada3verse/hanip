import type { ChatApiRequest } from "@/lib/types/chat";

export const API_ERROR_TEST_REQUEST: ChatApiRequest = {
  messages: [{ role: "user", content: "오류 처리 테스트" }],
  studentModel: {
    currentConcept: "",
    currentFlowStage: "",
    understoodConcepts: [],
    needsSupportConcepts: [],
    misconceptions: [],
    lastEvaluation: null,
    lastNextAction: null,
    confidence: null,
    consecutiveSuggestedReplyUses: 0,
    lastResponseMode: "typed",
    hintLevel: 0,
    consecutiveUnknownResponses: 0,
    learningStatus: "in_progress",
    completionEvidence: [],
  },
};

export const API_ERROR_TEST_CASES = [
  {
    id: "retry-then-success",
    title: "첫 호출 429 후 성공",
    sequence: "429,success",
    expectedStatus: 200,
    expectedCode: null,
  },
  {
    id: "rate-limit-exhausted",
    title: "세 번 모두 429",
    sequence: "429,429,429",
    expectedStatus: 429,
    expectedCode: "RATE_LIMITED",
  },
  {
    id: "invalid-api-key",
    title: "401은 재시도하지 않음",
    sequence: "401",
    expectedStatus: 401,
    expectedCode: "INVALID_API_KEY",
  },
] as const;
