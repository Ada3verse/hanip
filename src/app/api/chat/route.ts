import OpenAI from "openai";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { NextResponse } from "next/server";

import { compressChatContext } from "@/lib/chat/context";
import {
  deriveAdaptiveLevel,
  findRelevantKnowledge,
  findKnowledgeBundle,
  findRelevantMisconception,
  findRelevantWorkedExample,
  retrieveKnowledge,
  buildRetrievalContext,
  getEvaluationCompletionCriteria,
  toKnowledgeEvidenceBundle,
  misconceptionLibrary,
} from "@/lib/knowledge";
import { buildAnswerEvaluationContext, evaluateStudentAnswer } from "@/lib/evaluation/evaluationEngine";
import systemPrompt from "@/lib/prompts/systemPrompt";
import {
  findMissingPrerequisite,
  inferDependencyConceptId,
} from "@/lib/knowledge/dependency/dependencyEngine";
import type { DependencyResult } from "@/lib/knowledge/dependency";
import {
  createLearningRoute,
  getCurrentRouteConcept,
  getLearningRouteContext,
} from "@/lib/knowledge/dependency/learningRoute";
import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import { runTutorRuntime } from "@/lib/runtime/tutorRuntime";
import { mockResponseGenerator } from "@/lib/runtime/mockResponseGenerator";
import { createOpenAIResponseGenerator } from "@/lib/runtime/openAIResponseGenerator";
import { createResponseProvider } from "@/lib/runtime/responseProviderFactory";
import { RuntimeRequestGuard } from "@/lib/runtime/requestGuard";
import { STUDENT_SESSION_COOKIE, verifyStudentSession } from "@/lib/security/session";
import { getSecurityContext } from "@/lib/security/serverContext";
import { isSameOriginRequest } from "@/lib/security/http";
import {
  buildLearningStateContext,
  calculateLearningState,
  inferLearningConceptId,
} from "@/lib/learningState/learningStateEngine";
import {
  buildMasteryContext,
  calculateMastery,
  isMastered,
} from "@/lib/mastery/masteryEngine";
import {
  buildHintContext,
  calculateHintState,
  createInitialHintState,
} from "@/lib/hint/hintEngine";
import {
  buildDialoguePlanContext,
  createDialoguePlan,
} from "@/lib/dialogue/dialoguePlanner";
import {
  buildWorkedExampleContext,
  calculateWorkedExampleState,
  isWorkedExampleActive,
} from "@/lib/workedExample/workedExampleEngine";
import {
  buildSessionSummaryContext,
  createSessionSummary,
  isSessionEndIntent,
} from "@/lib/sessionSummary/sessionSummaryEngine";
import { buildGoalContext, calculateGoalState } from "@/lib/goal/goalEngine";
import {
  buildMisconceptionLearningContext,
  getActiveMisconceptionProfile,
  updateMisconceptionProfiles,
} from "@/lib/misconceptionLearning/misconceptionLearningEngine";
import {
  buildAdaptiveContext,
  createAdaptiveTurnStrategy,
  inferAdaptiveProfile,
} from "@/lib/adaptive/adaptiveEngine";
import {
  buildTutorPersonaContext,
  createTutorPersonaPlan,
} from "@/lib/persona/tutorPersona";
import {
  AI_EVALUATIONS,
  LEARNING_GOALS,
  LEARNING_MODES,
  LEARNING_STATUSES,
  TUTOR_STRATEGIES,
} from "@/lib/types/chat";
import type { LearningProgress } from "@/lib/progress/types";
import type {
  AiEvaluation,
  AiMeta,
  ChatApiErrorCode,
  ChatApiErrorResponse,
  ChatApiRequest,
  ChatApiResponse,
  ChatMessage,
  LearningGoal,
  LearningMode,
  LearningStatus,
  StudentSessionModel,
  TutorStrategy,
} from "@/lib/types/chat";

type StructuredChatResponse = ChatApiResponse & { meta: AiMeta };

type OpenAIErrorInfo = ChatApiErrorResponse["error"] & {
  status: number;
};

const RETRY_DELAYS_MS = [1000, 2000] as const;
const MAX_LIVE_TEST_REQUESTS = 3;
let liveTestRequestCount = 0;
const openAIRequestGuard = new RuntimeRequestGuard();
function isTutorRuntimeEnabled(): boolean { return true; }

async function persistAuthenticatedTurn(input: { uid: string; sessionId: string; request: ChatApiRequest; response: ChatApiResponse }) {
  const data = getSecurityContext().data; if (!data) return;
  const userContent = input.request.messages.findLast(({ role }) => role === "user")?.content ?? "";
  if (!userContent) return;
  await data.saveTurn(input.uid, input.sessionId, userContent, input.response.message, input.response.meta ?? input.request.studentModel ?? null);
}

function runtimeProviderError(category: string, retryable: boolean): { status: number; error: ChatApiErrorResponse["error"] } {
  const table: Record<string, { status: number; code: ChatApiErrorCode }> = {
    missing_api_key: { status: 503, code: "PROVIDER_CONFIGURATION_ERROR" },
    invalid_api_key: { status: 401, code: "INVALID_API_KEY" },
    authentication_error: { status: 401, code: "AUTHENTICATION_ERROR" },
    rate_limit: { status: 429, code: "RATE_LIMITED" },
    quota_exceeded: { status: 429, code: "QUOTA_EXCEEDED" },
    timeout: { status: 503, code: "OPENAI_UNAVAILABLE" },
    network_error: { status: 503, code: "NETWORK_ERROR" },
    provider_unavailable: { status: 503, code: "OPENAI_UNAVAILABLE" },
    invalid_response: { status: 502, code: "INVALID_RESPONSE" },
    unknown_error: { status: 500, code: "UNKNOWN_ERROR" },
  };
  const item = table[category] ?? table.unknown_error;
  return { status: item.status, error: { code: item.code, message: "지금은 답변을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.", retryable } };
}

function getOpenAIErrorInfo(error: unknown): OpenAIErrorInfo {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 0;

  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message: "잠시 후 다시 시도해 주세요.",
      retryable: true,
      status,
    };
  }
  if (status === 401) {
    return {
      code: "INVALID_API_KEY",
      message: "AI 설정을 확인해 주세요.",
      retryable: false,
      status,
    };
  }
  if (status >= 500 && status <= 599) {
    return {
      code: "OPENAI_UNAVAILABLE",
      message: "AI 연결이 잠시 불안정합니다.",
      retryable: true,
      status,
    };
  }
  if (status >= 400 && status <= 499) {
    return {
      code: "INVALID_REQUEST",
      message: "요청을 처리할 수 없습니다.",
      retryable: false,
      status,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "AI 응답을 가져오지 못했습니다.",
    retryable: false,
    status: 500,
  };
}

function logOpenAIError(
  code: ChatApiErrorCode,
  status: number,
  retryCount: number,
) {
  console.error("OpenAI request failed", { code, status, retryCount });
}

function logLiveUsage(
  count: number,
  usage?: {
    input_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens?: number;
    total_tokens?: number;
  },
) {
  console.info("HANIP LIVE AI", {
    liveRequestCount: count,
    input_tokens: usage?.input_tokens ?? 0,
    cached_input_tokens: usage?.input_tokens_details?.cached_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
  });
}

function waitForRetry(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

const chatResponseSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
      minLength: 1,
      description: "학생에게 보여 줄 자연스러운 한국어 답변",
    },
    suggestedReplies: {
      type: "array",
      description: "질문에 바로 답할 수 있는 짧고 중복되지 않는 선택지. 필요하지 않으면 빈 배열",
      items: {
        type: "string",
        minLength: 1,
        maxLength: 20,
      },
      maxItems: 4,
    },
    meta: {
      type: "object",
      properties: {
        concept: {
          type: "string",
          minLength: 1,
          description: "현재 학습 개념",
        },
        flowStage: {
          type: "string",
          enum: [
            "진단",
            "분류이유",
            "분류기준",
            "대표품사",
            "비교",
            "적용",
            "정리",
          ],
          description: "현재 Teaching Flow 단계",
        },
        evaluation: {
          type: "string",
          enum: AI_EVALUATIONS,
          description: "학생의 최근 답변에 대한 내부 평가",
        },
        nextAction: {
          type: "string",
          minLength: 1,
          description: "다음 AI 행동",
        },
        misconception: {
          type: "string",
          description: "대표 오개념 한 개. 없으면 빈 문자열",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "메타데이터 판단 신뢰도",
        },
        hintLevelUsed: {
          type: "integer",
          minimum: 0,
          maximum: 3,
          description: "이번 응답에서 실제 사용한 내부 도움 단계",
        },
        learningStatus: {
          type: "string",
          enum: LEARNING_STATUSES,
          description: "현재 개념 학습의 완료 진행 상태",
        },
        completionEvidence: {
          type: "array",
          description: "실제 대화에서 확인한 완료 기준 충족 증거",
          items: { type: "string", minLength: 1 },
          maxItems: 5,
        },
        strategy: {
          type: "string",
          enum: TUTOR_STRATEGIES,
          description: "서버가 계산한 현재 Tutor Strategy",
        },
      },
      required: [
        "concept",
        "flowStage",
        "evaluation",
        "nextAction",
        "misconception",
        "confidence",
        "hintLevelUsed",
        "learningStatus",
        "completionEvidence",
        "strategy",
      ],
      additionalProperties: false,
    },
  },
  required: ["message", "suggestedReplies", "meta"],
  additionalProperties: false,
} as const;

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("role" in value) || !("content" in value)) {
    return false;
  }

  return (
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
  );
}

function isAiEvaluation(value: unknown): value is AiEvaluation {
  return AI_EVALUATIONS.some((evaluation) => evaluation === value);
}

function isLearningStatus(value: unknown): value is LearningStatus {
  return LEARNING_STATUSES.some((status) => status === value);
}

function normalizeLearningMode(value: unknown): LearningMode {
  return LEARNING_MODES.some((mode) => mode === value)
    ? (value as LearningMode)
    : "learn";
}

function normalizeLearningGoal(value: unknown): LearningGoal {
  return LEARNING_GOALS.some((goal) => goal === value)
    ? (value as LearningGoal)
    : "concept";
}

function buildTutorStrategyContext(
  strategy: TutorStrategy,
  adaptiveLevel: 1 | 2 | 3,
  learningMode: LearningMode,
  learningGoal: LearningGoal,
) {
  return `[현재 Tutor Strategy — 내부 전용]
- strategy: ${strategy}
- Adaptive Level: ${adaptiveLevel}
- Learning Mode: ${learningMode}
- Learning Goal: ${learningGoal}
Tutor Strategy Engine의 '${strategy}' 규칙을 이번 응답에 적용하세요. Mode는 진행 방식으로, Goal은 학습 내용의 초점으로 계속 독립 적용하세요. 학생에게 위 값이나 내부 계산을 노출하지 말고 meta.strategy에는 '${strategy}'를 기록하세요.`;
}

function isStudentModelInput(
  value: unknown,
): value is Partial<StudentSessionModel> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const model = value as Record<string, unknown>;
  const hasValidString = (key: string) =>
    !(key in model) || typeof model[key] === "string";
  const hasValidStringArray = (key: string) =>
    !(key in model) ||
    (Array.isArray(model[key]) &&
      model[key].every((item) => typeof item === "string"));

  return (
    hasValidString("currentConcept") &&
    hasValidString("currentFlowStage") &&
    hasValidStringArray("understoodConcepts") &&
    hasValidStringArray("needsSupportConcepts") &&
    hasValidStringArray("misconceptions") &&
    hasValidStringArray("completionEvidence") &&
    (!("lastEvaluation" in model) ||
      model.lastEvaluation === null ||
      isAiEvaluation(model.lastEvaluation)) &&
    (!("lastNextAction" in model) ||
      model.lastNextAction === null ||
      typeof model.lastNextAction === "string") &&
    (!("confidence" in model) ||
      model.confidence === null ||
      (typeof model.confidence === "number" &&
        Number.isFinite(model.confidence) &&
        model.confidence >= 0 &&
        model.confidence <= 1)) &&
    (!("consecutiveSuggestedReplyUses" in model) ||
      (typeof model.consecutiveSuggestedReplyUses === "number" &&
        Number.isInteger(model.consecutiveSuggestedReplyUses) &&
        model.consecutiveSuggestedReplyUses >= 0)) &&
    (!("lastResponseMode" in model) ||
      model.lastResponseMode === null ||
      model.lastResponseMode === "typed" ||
      model.lastResponseMode === "suggested") &&
    (!("hintLevel" in model) ||
      model.hintLevel === 0 ||
      model.hintLevel === 1 ||
      model.hintLevel === 2 ||
      model.hintLevel === 3) &&
    (!("consecutiveUnknownResponses" in model) ||
      (typeof model.consecutiveUnknownResponses === "number" &&
        Number.isInteger(model.consecutiveUnknownResponses) &&
        model.consecutiveUnknownResponses >= 0)) &&
    (!("learningStatus" in model) ||
      isLearningStatus(model.learningStatus)) &&
    (!("priorProgressLoaded" in model) ||
      typeof model.priorProgressLoaded === "boolean") &&
    (!("priorMasteryScore" in model) ||
      model.priorMasteryScore === null ||
      (typeof model.priorMasteryScore === "number" &&
        model.priorMasteryScore >= 0 &&
        model.priorMasteryScore <= 100)) &&
    (!("priorConceptStatus" in model) ||
      model.priorConceptStatus === null ||
      model.priorConceptStatus === "not_started" ||
      model.priorConceptStatus === "learning" ||
      model.priorConceptStatus === "needs_review" ||
      model.priorConceptStatus === "understood") &&
    (!("activePrerequisite" in model) ||
      model.activePrerequisite === null ||
      typeof model.activePrerequisite === "string") &&
    (!("completedPrerequisites" in model) ||
      (Array.isArray(model.completedPrerequisites) &&
        model.completedPrerequisites.every((item) => typeof item === "string"))) &&
    (!("prerequisiteReturnConcept" in model) ||
      model.prerequisiteReturnConcept === null ||
      typeof model.prerequisiteReturnConcept === "string") &&
    (!("learningRoute" in model) || isLearningRouteInput(model.learningRoute)) &&
    (!("suspendedConcept" in model) ||
      model.suspendedConcept === null ||
      typeof model.suspendedConcept === "string")
  );
}

function isLearningRouteInput(value: unknown): boolean {
  if (value === null) {
    return true;
  }
  if (typeof value !== "object") {
    return false;
  }

  const route = value as Record<string, unknown>;
  return (
    typeof route.targetConcept === "string" &&
    Array.isArray(route.route) &&
    route.route.length > 0 &&
    route.route.every((item) => typeof item === "string") &&
    typeof route.currentIndex === "number" &&
    Number.isInteger(route.currentIndex) &&
    route.currentIndex >= 0 &&
    route.currentIndex < route.route.length &&
    Array.isArray(route.completedConcepts) &&
    route.completedConcepts.every((item) => typeof item === "string") &&
    typeof route.startedAt === "string"
  );
}

function isChatApiRequest(body: unknown): body is ChatApiRequest {
  if (typeof body !== "object" || body === null || !("messages" in body)) {
    return false;
  }

  return (
    Array.isArray(body.messages) &&
    body.messages.length > 0 &&
    body.messages.every(isChatMessage) &&
    (!("studentModel" in body) ||
      body.studentModel === undefined ||
      isStudentModelInput(body.studentModel))
  );
}

function normalizeLearningProgressInput(value: unknown): LearningProgress | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1 ||
    !("concepts" in value) ||
    !Array.isArray(value.concepts) ||
    value.concepts.length > 100
  ) return undefined;
  const valid = value.concepts.every(
    (concept) =>
      typeof concept === "object" &&
      concept !== null &&
      "conceptId" in concept &&
      typeof concept.conceptId === "string" &&
      "conceptName" in concept &&
      typeof concept.conceptName === "string" &&
      "status" in concept &&
      (concept.status === "not_started" ||
        concept.status === "learning" ||
        concept.status === "needs_review" ||
        concept.status === "understood"),
  );
  return valid ? (value as LearningProgress) : undefined;
}

function buildDependencyContext(dependency: DependencyResult | null) {
  if (!dependency) return "";
  return `[선수 개념 연결 — 이번 응답 최우선]
- 필요한 선수 개념: ${dependency.missingPrerequisite}
- 사용할 브리지 질문: ${dependency.bridgeQuestion}
- 이해 확인 뒤 사용할 한 문장 설명: ${dependency.bridgeExplanation}
현재 개념 설명과 Tutor Strategy 진행을 잠시 멈추고 브리지 질문 하나만 사용하세요. 학생이 이해하면 설명을 한 문장으로 제공하고 원래 개념으로 자연스럽게 복귀하세요. 한 번에 선수 개념 하나만 다루며 내부 id를 학생에게 노출하지 마세요.`;
}

function normalizeList(value: string[] | undefined) {
  return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))];
}

function buildStudentContext(model: Partial<StudentSessionModel> | undefined) {
  if (!model) {
    return "";
  }

  const currentConcept = model.currentConcept?.trim() ?? "";
  const currentFlowStage = model.currentFlowStage?.trim() ?? "";
  const understoodConcepts = normalizeList(model.understoodConcepts);
  const needsSupportConcepts = normalizeList(model.needsSupportConcepts);
  const misconceptions = normalizeList(model.misconceptions);
  const lastNextAction = model.lastNextAction?.trim() ?? "";
  const completionEvidence = normalizeList(model.completionEvidence);
  const lines: string[] = [];

  if (currentConcept) lines.push(`- 현재 개념: ${currentConcept}`);
  if (currentFlowStage) lines.push(`- 현재 단계: ${currentFlowStage}`);
  if (understoodConcepts.length > 0) {
    lines.push(`- 이해한 개념: ${understoodConcepts.join(", ")}`);
  }
  if (needsSupportConcepts.length > 0) {
    lines.push(`- 지원이 필요한 개념: ${needsSupportConcepts.join(", ")}`);
  }
  if (misconceptions.length > 0) {
    lines.push(`- 확인된 오개념: ${misconceptions.join(", ")}`);
  }
  if (model.lastEvaluation) {
    lines.push(`- 직전 평가: ${model.lastEvaluation}`);
  }
  if (lastNextAction) {
    lines.push(`- 권장 다음 행동: ${lastNextAction}`);
  }
  if (model.confidence !== null && model.confidence !== undefined) {
    lines.push(`- 신뢰도: ${model.confidence}`);
  }
  if (
    model.consecutiveSuggestedReplyUses !== undefined &&
    model.consecutiveSuggestedReplyUses > 0
  ) {
    lines.push(
      `- 연속 선택형 응답 사용 횟수: ${model.consecutiveSuggestedReplyUses}`,
    );
  }
  if (model.learningStatus) {
    lines.push(`- 현재 학습 완료 상태: ${model.learningStatus}`);
  }
  if (model.learningMode) {
    lines.push(`- 현재 학습 모드: ${model.learningMode}`);
  }
  if (model.learningGoal) {
    lines.push(`- 현재 학습 목표: ${model.learningGoal}`);
  }
  if (completionEvidence.length > 0) {
    lines.push(`- 확인된 완료 증거: ${completionEvidence.join(" / ")}`);
  }
  if (model.lastResponseMode) {
    lines.push(`- 직전 학생 응답 방식: ${model.lastResponseMode}`);
  }
  if (model.hintLevel !== undefined) {
    lines.push(`- 현재 도움 단계: ${model.hintLevel}`);
  }
  if (
    model.consecutiveUnknownResponses !== undefined &&
    model.consecutiveUnknownResponses > 0
  ) {
    lines.push(
      `- 같은 개념의 연속 이해 불가·적용 실패 횟수: ${model.consecutiveUnknownResponses}`,
    );
  }

  if (lines.length === 0) {
    return "";
  }

  return `[현재 학생 학습 상태]\n${lines.join("\n")}\n위 내용은 학생에게 그대로 노출하지 말고 다음 설명과 질문을 정하는 내부 참고 정보로만 사용하세요.`;
}

function buildResponseModeContext(
  model: Partial<StudentSessionModel> | undefined,
) {
  if (
    model?.lastResponseMode !== "suggested" ||
    (model.consecutiveSuggestedReplyUses ?? 0) < 2
  ) {
    return "";
  }

  return `[이번 응답의 필수 전환 규칙]
학생이 선택형 응답을 두 번 연속 사용했습니다. 이번 응답의 suggestedReplies는 반드시 빈 배열이어야 합니다. 다음 단계로 이동하거나 또 다른 선택 판단을 묻지 말고, 학생이 방금 판단한 이유나 사용한 기준을 핵심어 하나 또는 짧은 문장으로 직접 표현하게 하는 질문 하나만 제시하세요. 긴 설명을 요구하지 마세요.`;
}

function buildHintLadderContext(
  model: Partial<StudentSessionModel> | undefined,
) {
  if ((model?.consecutiveUnknownResponses ?? 0) === 0) {
    return "";
  }

  const hintLevel = model?.hintLevel ?? 0;
  const instructions = [
    "학생의 현재 생각을 확인하는 질문 하나만 제시하고 개념 설명은 하지 마세요.",
    "정답이나 핵심 기준을 직접 말하지 말고, 관찰할 부분만 작은 힌트로 안내한 뒤 쉬운 질문 하나를 제시하세요.",
    "핵심 판단 기준을 한 문장으로 짧게 설명하고 대표 예문 하나를 든 뒤 쉬운 확인 질문 하나를 제시하세요.",
    "핵심 답을 한두 문장으로 명확히 알려 주고, 같은 기준을 적용하는 매우 쉬운 새 예문으로 확인 질문 하나를 제시하세요.",
  ] as const;

  return `[이번 응답의 Hint Ladder 내부 지시]
이번 응답은 도움 단계 ${hintLevel}에 해당합니다. ${instructions[hintLevel]}
같은 수준에서 이전에 사용한 설명과 질문을 반복하지 마세요. 학생에게 단계 이름·숫자·실패 횟수·내부 평가를 노출하지 말고, meta.hintLevelUsed에는 ${hintLevel}을 기록하세요.`;
}

function buildCompletionActionContext(
  model: Partial<StudentSessionModel> | undefined,
  recentStudentMessage: string,
) {
  if (model?.learningStatus !== "completed") {
    return "";
  }

  if (recentStudentMessage === "새 문제로 확인할래") {
    return "[완료 후 선택 행동] 같은 개념의 새로운 전이 문제 하나만 제시하세요. 정답과 해설은 아직 말하지 마세요.";
  }
  if (recentStudentMessage === "다른 개념을 물어볼래") {
    return "[완료 후 선택 행동] 학생이 궁금한 다른 개념을 자유롭게 입력하도록 짧게 안내하고 suggestedReplies는 빈 배열로 반환하세요.";
  }
  if (recentStudentMessage === "오늘은 여기까지") {
    return "[완료 후 선택 행동] 현재 세션에서 이해한 개념과 사용한 기준을 최대 두 개로 짧게 정리하고 마무리하세요. 질문을 하지 말고 suggestedReplies는 빈 배열로 반환하세요.";
  }

  return "";
}

function isCoreAiMeta(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "concept" in value &&
    typeof value.concept === "string" &&
    value.concept.trim().length > 0 &&
    "flowStage" in value &&
    typeof value.flowStage === "string" &&
    value.flowStage.trim().length > 0 &&
    "evaluation" in value &&
    isAiEvaluation(value.evaluation) &&
    "nextAction" in value &&
    typeof value.nextAction === "string" &&
    value.nextAction.trim().length > 0 &&
    "misconception" in value &&
    typeof value.misconception === "string" &&
    "confidence" in value &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    (!("hintLevelUsed" in value) ||
      value.hintLevelUsed === 0 ||
      value.hintLevelUsed === 1 ||
      value.hintLevelUsed === 2 ||
      value.hintLevelUsed === 3) &&
    "strategy" in value &&
    TUTOR_STRATEGIES.some((strategy) => strategy === value.strategy)
  );
}

function isAiMeta(value: unknown): value is AiMeta {
  return (
    isCoreAiMeta(value) &&
    typeof value === "object" &&
    value !== null &&
    "learningStatus" in value &&
    isLearningStatus(value.learningStatus) &&
    "completionEvidence" in value &&
    Array.isArray(value.completionEvidence) &&
    value.completionEvidence.every((item) => typeof item === "string")
  );
}

function normalizeAiMeta(value: unknown): AiMeta | undefined {
  if (!isCoreAiMeta(value) || typeof value !== "object" || value === null) {
    return undefined;
  }

  return {
    ...(value as Omit<AiMeta, "learningStatus" | "completionEvidence">),
    learningStatus:
      "learningStatus" in value &&
      isLearningStatus(value.learningStatus)
        ? value.learningStatus
        : "in_progress",
    completionEvidence:
      "completionEvidence" in value &&
      Array.isArray(value.completionEvidence) &&
      value.completionEvidence.every((item) => typeof item === "string")
        ? normalizeList(value.completionEvidence)
        : [],
  };
}

function isStructuredChatResponse(
  value: unknown,
): value is StructuredChatResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    "suggestedReplies" in value &&
    isSuggestedReplies(value.suggestedReplies) &&
    "meta" in value &&
    isAiMeta(value.meta)
  );
}

function isSuggestedReplies(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 4 &&
    value.every(
      (reply) =>
        typeof reply === "string" &&
        reply.trim().length > 0 &&
        reply.trim().length <= 20,
    ) &&
    new Set(value.map((reply) => reply.trim())).size === value.length
  );
}

function normalizeSuggestedReplies(value: unknown) {
  return isSuggestedReplies(value)
    ? value.map((reply) => reply.trim())
    : [];
}

function parseOpenAIResponse(outputText: string) {
  try {
    const parsed: unknown = JSON.parse(outputText);

    if (isStructuredChatResponse(parsed)) {
      return {
        ...parsed,
        suggestedReplies: normalizeSuggestedReplies(parsed.suggestedReplies),
      };
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof parsed.message === "string" &&
      parsed.message.trim().length > 0
    ) {
      const fallbackResponse: ChatApiResponse = {
        message: parsed.message,
        suggestedReplies:
          "suggestedReplies" in parsed
            ? normalizeSuggestedReplies(parsed.suggestedReplies)
            : [],
      };

      if ("meta" in parsed) {
        fallbackResponse.meta = normalizeAiMeta(parsed.meta);
      }

      return fallbackResponse;
    }
  } catch {
    // Structured output가 아니면 기존 텍스트 응답으로 안전하게 처리합니다.
  }

  return { message: outputText, suggestedReplies: [] };
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json<ChatApiErrorResponse>({ error: { code: "INVALID_REQUEST", message: "요청을 처리할 수 없습니다.", retryable: false } }, { status: 403 });
  const isLiveTestRequestHeader =
    process.env.NODE_ENV !== "production" &&
    request.headers.get("x-hanip-live-ai-test") === "true";

  const cookieValue = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${STUDENT_SESSION_COOKIE}=`))?.slice(STUDENT_SESSION_COOKIE.length + 1) ?? "";
  const authenticatedSession = await verifyStudentSession(decodeURIComponent(cookieValue), process.env.HANIP_SESSION_SECRET ?? "", getSecurityContext().sessions);
  if (!authenticatedSession || authenticatedSession.role !== "student") {
    return NextResponse.json<ChatApiErrorResponse>({ error: { code: "INVALID_REQUEST", message: "로그인이 필요합니다.", retryable: false } }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();

    if (!isChatApiRequest(body)) {
      return NextResponse.json<ChatApiErrorResponse>(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "올바른 대화 메시지를 입력해 주세요.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    const learningMode = normalizeLearningMode(
      body.learningMode ?? body.studentModel?.learningMode,
    );
    const learningGoal = normalizeLearningGoal(
      body.learningGoal ?? body.studentModel?.learningGoal,
    );
    const studentModel: Partial<StudentSessionModel> = {
      ...body.studentModel,
      learningMode,
      learningGoal,
    };
    const learningProgress = normalizeLearningProgressInput(
      body.learningProgress,
    );
    const recentStudentMessage = [...body.messages]
      .reverse()
      .find(({ role }) => role === "user")?.content ?? "";
    const dependencyTarget =
      inferDependencyConceptId(recentStudentMessage) ??
      studentModel.prerequisiteReturnConcept ??
      studentModel.currentConcept ??
      "";
    const learningRoute =
      studentModel.learningRoute ??
      createLearningRoute({
        targetConcept: dependencyTarget,
        studentModel,
        learningProgress,
      });
    if (learningRoute) {
      studentModel.learningRoute = learningRoute;
      studentModel.suspendedConcept = learningRoute.targetConcept;
      const currentRouteConcept = getCurrentRouteConcept(learningRoute);
      studentModel.activePrerequisite =
        currentRouteConcept &&
        currentRouteConcept !== learningRoute.targetConcept
          ? currentRouteConcept
          : null;
      studentModel.prerequisiteReturnConcept = learningRoute.targetConcept;
    }
    const dependency = findMissingPrerequisite({
      currentConcept: dependencyTarget,
      studentModel,
      learningProgress,
      misconception: studentModel.misconceptions?.at(-1),
    });
    if (dependency && !studentModel.activePrerequisite) {
      studentModel.activePrerequisite = dependency.missingPrerequisite;
      studentModel.prerequisiteReturnConcept = dependencyTarget;
    }
    const priorProgressContext =
      typeof body.priorProgressContext === "string" &&
      body.priorProgressContext.length <= 2_000
        ? body.priorProgressContext.trim()
        : "";
    const normalizedRequest: ChatApiRequest = {
      messages: body.messages,
      studentModel,
      learningMode,
      learningGoal,
      priorProgressContext: priorProgressContext || undefined,
      learningProgress,
    };
    const isDevelopment = process.env.NODE_ENV !== "production";
    const liveTestRequested = isLiveTestRequestHeader;
    const liveTestsEnabled =
      process.env.HANIP_ENABLE_LIVE_AI_TESTS === "true";
    const useMockAi = process.env.HANIP_USE_MOCK_AI !== "false";

    if (liveTestRequested && !liveTestsEnabled) {
      return NextResponse.json<ChatApiErrorResponse>(
        {
          error: {
            code: "LIVE_TESTS_DISABLED",
            message: "개발용 실제 AI 테스트가 비활성화되어 있습니다.",
            retryable: false,
          },
        },
        { status: 403 },
      );
    }

    if (isTutorRuntimeEnabled()) {
      const responseProvider = createResponseProvider({
        mockSetting: process.env.HANIP_USE_MOCK_AI,
        liveTestRequested,
        liveTestsEnabled,
        apiKey: process.env.OPENAI_API_KEY,
        isDevelopment,
        mockGenerator: mockResponseGenerator,
        createOpenAI: () => createOpenAIResponseGenerator({
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        }),
      });
      if (responseProvider.kind === "blocked") {
        return NextResponse.json<ChatApiErrorResponse>({ error: { code: "LIVE_TESTS_DISABLED", message: "개발용 실제 AI 테스트가 비활성화되어 있습니다.", retryable: false } }, { status: 403 });
      }
      if (responseProvider.kind === "misconfigured" || !responseProvider.generator) {
        return NextResponse.json<ChatApiErrorResponse>({ error: { code: "PROVIDER_CONFIGURATION_ERROR", message: "지금은 답변을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.", retryable: false } }, { status: 503 });
      }
      if (liveTestRequested) {
        if (liveTestRequestCount >= MAX_LIVE_TEST_REQUESTS) {
          return NextResponse.json<ChatApiErrorResponse>({ error: { code: "LIVE_TEST_LIMIT_REACHED", message: "개발용 실제 AI 테스트 한도에 도달했습니다.", retryable: false } }, { status: 429 });
        }
        liveTestRequestCount += 1;
      }
      const requestFingerprint = responseProvider.kind === "openai"
        ? JSON.stringify({ messages: normalizedRequest.messages, learningMode, learningGoal, priorProgressContext })
        : "";
      if (requestFingerprint && !openAIRequestGuard.begin(requestFingerprint)) {
        return NextResponse.json<ChatApiErrorResponse>({ error: { code: "INVALID_REQUEST", message: "이미 같은 질문의 답변을 준비하고 있어요.", retryable: false } }, { status: 409 });
      }
      let runtimeResult: Awaited<ReturnType<typeof runTutorRuntime>>;
      try {
        runtimeResult = await runTutorRuntime({ request: normalizedRequest, responseGenerator: responseProvider.generator });
      } finally {
        openAIRequestGuard.end(requestFingerprint);
      }
      if (runtimeResult.providerFailure) {
        const failure = runtimeProviderError(runtimeResult.providerFailure.category, runtimeResult.providerFailure.retryable);
        console.error("AI provider request failed", {
          provider: "openai",
          category: runtimeResult.providerFailure.category,
          requestId: runtimeResult.providerFailure.requestId,
          elapsed: runtimeResult.events.findLast(({ step }) => step === "ERROR")?.elapsed ?? 0,
          evidenceCount: runtimeResult.context.retrieval?.usedEvidence.length ?? 0,
          success: false,
        });
        return NextResponse.json<ChatApiErrorResponse>({ error: failure.error }, { status: failure.status });
      }
      await persistAuthenticatedTurn({ uid: authenticatedSession.uid, sessionId: authenticatedSession.id, request: normalizedRequest, response: runtimeResult.response });
      return NextResponse.json(runtimeResult.response);
    }

    if (
      (isDevelopment && !liveTestRequested) ||
      (!isDevelopment && useMockAi)
    ) {
      const response = createMockChatResponse(normalizedRequest);
      await persistAuthenticatedTurn({ uid: authenticatedSession.uid, sessionId: authenticatedSession.id, request: normalizedRequest, response });
      return NextResponse.json(response);
    }

    if (liveTestRequested) {
      if (liveTestRequestCount >= MAX_LIVE_TEST_REQUESTS) {
        return NextResponse.json<ChatApiErrorResponse>(
          {
            error: {
              code: "LIVE_TEST_LIMIT_REACHED",
              message: "개발용 실제 AI 테스트 한도에 도달했습니다.",
              retryable: false,
            },
          },
          { status: 429 },
        );
      }
      liveTestRequestCount += 1;
    }

    const compressedContext = compressChatContext(
      body.messages,
      studentModel,
    );
    const input: EasyInputMessage[] = compressedContext.recentMessages.map(
      ({ role, content }) => ({
        role,
        content: content.trim(),
      }),
    );
    const studentContext = buildStudentContext(studentModel);
    const priorProgressInstructions = priorProgressContext
      ? `${priorProgressContext}\n이 정보는 이전 학습의 내부 참고 문맥입니다. 현재 Student Model과 충돌하면 현재 Student Model을 우선하세요. 과거 점수만으로 정답 처리하지 말고, 이미 이해한 기초는 불필요하게 반복하지 않으며 반복 오개념은 우선 확인하세요. 점수, 상태 이름, 오개념 ID를 학생에게 노출하지 마세요.`
      : "";
    const knowledge = findRelevantKnowledge(
      recentStudentMessage,
      studentModel.currentConcept,
    );
    const knowledgeBundle = findKnowledgeBundle(knowledge?.concept ?? studentModel.currentConcept ?? "");
    normalizedRequest.knowledgeBundle = knowledgeBundle;
    const misconceptionMatch = findRelevantMisconception({
      recentStudentMessage: recentStudentMessage ?? "",
      currentConcept: studentModel.currentConcept,
      studentMisconceptions: studentModel.misconceptions,
      studentMessages: body.messages
        .filter(({ role }) => role === "user")
        .map(({ content }) => content),
    });
    const adaptiveLevel = deriveAdaptiveLevel({
      hintLevel: studentModel.hintLevel,
      lastEvaluation: studentModel.lastEvaluation,
    });
    const workedExampleMatch = findRelevantWorkedExample({
      currentConcept:
        studentModel.currentConcept || knowledge?.title || "",
      misconceptionId: misconceptionMatch?.misconception.id,
      hintLevel: studentModel.hintLevel,
      adaptiveLevel,
      conversationMessages: body.messages.map(({ content }) => content),
    });
    const preliminaryLearningState = calculateLearningState({
      currentConcept: studentModel.currentConcept || dependencyTarget,
      learningProgress,
      adaptiveLevel,
      learningMode,
      learningGoal,
      studentModel,
    });
    const evaluationPlan = createDialoguePlan({
      learningState: preliminaryLearningState,
      studentModel,
      messages: body.messages,
    });
    const evaluationRetrieval = retrieveKnowledge({
      dialoguePlan: evaluationPlan,
      studentModel,
      recentStudentMessage: recentStudentMessage ?? "",
      conversationMessages: body.messages.map(({ content }) => content),
      misconceptionProfiles: studentModel.misconceptionProfiles,
    });
    const adaptiveProfileForTurn = inferAdaptiveProfile({
      concept: evaluationPlan.activeConcept,
      responseModes: [
        ...(studentModel.responseModeHistory ?? []),
        ...(studentModel.lastResponseMode ? [studentModel.lastResponseMode] : []),
      ],
      evaluations: studentModel.evaluationHistory,
      hintStates: Object.values(studentModel.hintStates ?? {}),
      workedExamples: Object.values(studentModel.workedExampleStates ?? {}),
      masteryStates: Object.values(studentModel.masteryStates ?? {}),
      previous: studentModel.adaptiveProfile,
    });
    const adaptiveStrategy = createAdaptiveTurnStrategy(adaptiveProfileForTurn);
    const answerEvaluation = evaluateStudentAnswer({
      studentAnswer: recentStudentMessage ?? "",
      activeConcept: evaluationPlan.activeConcept,
      dialoguePlan: evaluationPlan,
      retrievedEvidence: toKnowledgeEvidenceBundle(evaluationRetrieval),
      misconceptionLibrary,
      completionCriteria: [
        ...(knowledge?.completionCriteria ? [...knowledge.completionCriteria] : []),
        ...getEvaluationCompletionCriteria(evaluationRetrieval),
      ],
      previousEvaluation: studentModel.lastEvaluation,
      workedExampleState: Object.values(studentModel.workedExampleStates ?? {}).find(
        (state) => !state.completedExample,
      ),
      adaptiveStrategy,
    });
    const masteryConceptId =
      inferLearningConceptId(evaluationPlan.activeConcept) ??
      evaluationPlan.activeConcept;
    const misconceptionProfiles = updateMisconceptionProfiles({
      concept: masteryConceptId,
      evaluation: answerEvaluation.evaluation,
      matchedMisconceptions: answerEvaluation.matchedMisconceptions,
      existingProfiles: studentModel.misconceptionProfiles,
      relatedExamples: evaluationRetrieval.usedEvidence
        .filter(({ role }) => role === "worked_example")
        .map(({ id }) => id),
      relatedHints: evaluationRetrieval.usedEvidence
        .filter(({ role }) => role === "hint" || role === "misconception")
        .map(({ id }) => id),
    });
    const activeMisconceptionProfile = getActiveMisconceptionProfile(
      misconceptionProfiles,
      masteryConceptId,
    );
    const previousMastery = learningProgress?.concepts.find(
      ({ conceptId, conceptName }) =>
        conceptId === masteryConceptId ||
        inferLearningConceptId(conceptName) === masteryConceptId,
    )?.mastery;
    const mastery = calculateMastery({
      conceptId: masteryConceptId,
      evaluation: answerEvaluation.evaluation,
      evaluationConfidence: answerEvaluation.confidence,
      previous: previousMastery,
      completionEvidence: studentModel.completionEvidence,
      matchedMisconceptions: answerEvaluation.matchedMisconceptions,
      workedExampleSuccess:
        Boolean(Object.values(studentModel.workedExampleStates ?? {}).find(
          (state) => !state.completedExample,
        )) && answerEvaluation.evaluation === "correct",
      misconceptionProfiles,
    });
    const legacyHintLevel =
      (studentModel.consecutiveUnknownResponses ?? 0) > 0 &&
      (studentModel.consecutiveUnknownResponses ?? 0) >= (studentModel.hintLevel ?? 0)
        ? Math.max(0, (studentModel.hintLevel ?? 0) - 1)
        : studentModel.hintLevel ?? 0;
    const previousHint =
      studentModel.hintStates?.[masteryConceptId] ?? {
        ...createInitialHintState(masteryConceptId),
        hintLevel: legacyHintLevel as 0 | 1 | 2 | 3,
        hintCount: Math.max(0, (studentModel.consecutiveUnknownResponses ?? 0) - 1),
      };
    const previousWorkedExample =
      studentModel.workedExampleStates?.[masteryConceptId] ?? null;
    const hintState = answerEvaluation.reason.some((reason) =>
      reason === "student_question_not_answer" ||
      reason === "non_answer_question_carry_forward"
    )
      ? previousHint
      : calculateHintState({
          conceptId: masteryConceptId,
          evaluation: answerEvaluation.evaluation,
          confidence: answerEvaluation.confidence,
          mastery,
          learningMode,
          previous: previousHint,
          workedExampleActive: isWorkedExampleActive(previousWorkedExample),
          activeMisconceptionProfile,
          adaptiveStrategy,
        });
    const evaluatedStudentModel: Partial<StudentSessionModel> = {
      ...studentModel,
      lastEvaluation: answerEvaluation.evaluation,
      confidence: answerEvaluation.confidence,
      misconceptions: [...new Set([...(studentModel.misconceptions ?? []), ...answerEvaluation.matchedMisconceptions])],
      completionEvidence: [...new Set([...(studentModel.completionEvidence ?? []), ...answerEvaluation.matchedEvidence])],
    };
    const learningState = calculateLearningState({
      currentConcept: studentModel.currentConcept || dependencyTarget,
      learningProgress,
      adaptiveLevel,
      learningMode,
      learningGoal,
      studentModel: evaluatedStudentModel,
      masteryState: mastery,
      hintState,
      adaptiveProfile: adaptiveProfileForTurn,
    });
    const tutorStrategy = learningState.tutorStrategy;
    const candidatePlan = createDialoguePlan({
      learningState,
      studentModel: evaluatedStudentModel,
      messages: body.messages,
      workedExampleState: previousWorkedExample,
      activeMisconceptionProfile,
      adaptiveStrategy,
    });
    const candidateRetrieval = retrieveKnowledge({
      dialoguePlan: candidatePlan,
      studentModel: evaluatedStudentModel,
      recentStudentMessage: recentStudentMessage ?? "",
      conversationMessages: body.messages.map(({ content }) => content),
      workedExampleState: previousWorkedExample,
      misconceptionProfiles,
    });
    const lastAssistantQuestion = [...body.messages]
      .reverse()
      .find(({ role }) => role === "assistant")?.content ?? candidatePlan.requiredFocus;
    const workedExampleState = calculateWorkedExampleState({
      conceptId: masteryConceptId,
      evaluation: answerEvaluation.evaluation,
      hintState,
      mastery,
      retrievedEvidence: toKnowledgeEvidenceBundle(candidateRetrieval),
      originQuestion: previousWorkedExample?.originQuestion ?? lastAssistantQuestion,
      returnConcept: previousWorkedExample?.returnConcept ?? candidatePlan.activeConcept,
      previous: previousWorkedExample,
      applyFailCount: studentModel.consecutiveUnknownResponses,
      misconceptionCount: (studentModel.misconceptions ?? []).filter(
        (item) => answerEvaluation.matchedMisconceptions.includes(item),
      ).length + answerEvaluation.matchedMisconceptions.length,
      terminationRequested: isSessionEndIntent(recentStudentMessage ?? ""),
      activeMisconceptionProfile,
      adaptiveStrategy,
    });
    learningState.workedExample = workedExampleState;
    if (workedExampleState && !workedExampleState.completedExample) {
      learningState.reason.push("worked_example_active");
    }
    const adaptiveProfile = inferAdaptiveProfile({
      concept: masteryConceptId,
      responseModes: [
        ...(studentModel.responseModeHistory ?? []),
        ...(studentModel.lastResponseMode ? [studentModel.lastResponseMode] : []),
      ],
      evaluations: [
        ...(studentModel.evaluationHistory ?? []),
        { evaluation: answerEvaluation.evaluation, confidence: answerEvaluation.confidence },
      ],
      hintStates: [...Object.values(studentModel.hintStates ?? {}), hintState],
      workedExamples: [
        ...Object.values(studentModel.workedExampleStates ?? {}),
        ...(workedExampleState ? [workedExampleState] : []),
      ],
      masteryStates: [...Object.values(studentModel.masteryStates ?? {}), mastery],
      previous: studentModel.adaptiveProfile,
    });
    learningState.adaptive = adaptiveProfile;
    const goalState = calculateGoalState({
      currentConcept: learningState.currentConcept,
      routeCurrentConcept: learningState.learningRouteState.currentConcept,
      routeRemainingConcepts: learningState.learningRouteState.remainingConcepts,
      routeCompletedConcepts: learningState.learningRouteState.completedConcepts,
      mastery,
      reviewRequired: learningState.review.required,
      reviewConcept: learningState.review.concept,
      evaluation: answerEvaluation.evaluation,
      hint: hintState,
      workedExample: workedExampleState,
      completionConfirmed: learningState.completionState.complete,
      previous: studentModel.goalState,
    });
    learningState.goal = goalState;
    const dialoguePlan = createDialoguePlan({
      learningState,
      studentModel: evaluatedStudentModel,
      messages: body.messages,
      workedExampleState,
      goalState,
      activeMisconceptionProfile,
      adaptiveStrategy,
    });
    const shouldSummarize =
      dialoguePlan.action === "complete" ||
      isSessionEndIntent(recentStudentMessage ?? "");
    const sessionSummary = shouldSummarize
      ? createSessionSummary({
          learningState,
          masteryStates: [
            ...Object.values(studentModel.masteryStates ?? {}),
            mastery,
          ],
          evaluationHistory: [
            ...(studentModel.evaluationHistory ?? []),
            {
              concept: dialoguePlan.activeConcept,
              evaluation: answerEvaluation.evaluation,
              misconception: answerEvaluation.matchedMisconceptions[0] ?? "",
              confidence: answerEvaluation.confidence,
            },
          ],
          workedExampleStates: [
            ...Object.values(studentModel.workedExampleStates ?? {}),
            ...(workedExampleState ? [workedExampleState] : []),
          ],
          hintStates: [
            ...Object.values(studentModel.hintStates ?? {}),
            hintState,
          ],
          understoodConcepts: studentModel.understoodConcepts,
          needsSupportConcepts: studentModel.needsSupportConcepts,
          sessionStartedAt: studentModel.sessionStartedAt,
          goalState,
          misconceptionProfiles,
          adaptiveProfile,
        })
      : null;
    const tutorPersona = createTutorPersonaPlan({
      dialoguePlan,
      learningState,
      answerEvaluation,
      messages: body.messages,
    });
    const tutorStrategyContext = buildTutorStrategyContext(tutorStrategy, adaptiveLevel, learningMode, learningGoal);
    const retrieval = retrieveKnowledge({
      dialoguePlan,
      studentModel: evaluatedStudentModel,
      recentStudentMessage: recentStudentMessage ?? "",
      conversationMessages: body.messages.map(({ content }) => content),
      workedExampleState,
      misconceptionProfiles,
    });
    const retrievalContext = buildRetrievalContext(retrieval);
    const evaluationContext = buildAnswerEvaluationContext(answerEvaluation);
    const responseModeContext = buildResponseModeContext(studentModel);
    const hintLadderContext = buildHintLadderContext(studentModel);
    const completionActionContext = buildCompletionActionContext(
      studentModel,
      recentStudentMessage ?? "",
    );
    const instructions = [
      systemPrompt,
      getLearningRouteContext(studentModel.learningRoute ?? null),
      buildDependencyContext(dependency),
      compressedContext.summary,
      studentContext,
      priorProgressInstructions,
      retrievalContext,
      evaluationContext,
      buildMasteryContext(mastery),
      buildHintContext(hintState),
      buildWorkedExampleContext(workedExampleState),
      buildSessionSummaryContext(sessionSummary),
      buildGoalContext(goalState),
      buildMisconceptionLearningContext(activeMisconceptionProfile),
      buildAdaptiveContext(adaptiveStrategy),
      responseModeContext,
      hintLadderContext,
      completionActionContext,
      buildLearningStateContext(learningState),
      tutorStrategyContext,
      buildDialoguePlanContext(dialoguePlan),
      buildTutorPersonaContext(tutorPersona),
      "학생에게 보여 줄 답변과 필요한 경우의 짧은 선택지만 생성하세요. message에는 학생용 답변만 넣고 suggestedReplies에는 그 응답에 맞는 선택지만 넣으세요. 규칙 기반 Answer Evaluation 결과를 다시 판단하거나 변경하지 말고, 내부 평가와 근거는 message에 포함하지 마세요.",
    ]
      .filter(Boolean)
      .join("\n\n");
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
    });
    let response: {
      output_text?: string;
      usage?: {
        input_tokens?: number;
        input_tokens_details?: { cached_tokens?: number };
        output_tokens?: number;
        total_tokens?: number;
      };
    } | undefined;
    let retryCount = 0;

    while (!response) {
      try {
        response = await client.responses.create({
                model: "gpt-5.6",
                instructions,
                input,
                text: {
                  format: {
                    type: "json_schema",
                    name: "hanip_chat_response",
                    description: "학생 답변과 내부 학습 상태 메타데이터",
                    schema: chatResponseSchema,
                    strict: true,
                  },
                },
              });
      } catch (error) {
        const errorInfo = getOpenAIErrorInfo(error);
        if (liveTestRequested) {
          logLiveUsage(liveTestRequestCount);
        } else {
          logOpenAIError(errorInfo.code, errorInfo.status, retryCount);
        }

        if (
          !liveTestRequested &&
          errorInfo.retryable &&
          retryCount < RETRY_DELAYS_MS.length
        ) {
          await waitForRetry(RETRY_DELAYS_MS[retryCount]);
          retryCount += 1;
          continue;
        }

        return NextResponse.json<ChatApiErrorResponse>(
          {
            error: {
              code: errorInfo.code,
              message: errorInfo.message,
              retryable: errorInfo.retryable,
            },
          },
          { status: errorInfo.status },
        );
      }
    }
    if (!response.output_text) {
      throw new Error("OpenAI response did not include text output.");
    }

    if (liveTestRequested) {
      logLiveUsage(liveTestRequestCount, response.usage);
    }

    const responseBody = parseOpenAIResponse(response.output_text);

    if (responseBody.meta) {
      responseBody.meta.evaluation = answerEvaluation.evaluation;
      responseBody.meta.confidence = answerEvaluation.confidence;
      responseBody.meta.misconception = answerEvaluation.matchedMisconceptions[0] ?? "";
      responseBody.meta.strategy = tutorStrategy;
      responseBody.meta.learningState = learningState;
      responseBody.meta.dialoguePlan = dialoguePlan;
      responseBody.meta.tutorPersona = tutorPersona;
      responseBody.meta.retrieval = toKnowledgeEvidenceBundle(retrieval);
      responseBody.meta.answerEvaluation = answerEvaluation;
      responseBody.meta.mastery = mastery;
      responseBody.meta.hintState = hintState;
      responseBody.meta.workedExampleState = workedExampleState;
      responseBody.meta.sessionSummary = sessionSummary;
      responseBody.meta.goalState = goalState;
      responseBody.meta.misconceptionProfiles = misconceptionProfiles;
      responseBody.meta.adaptiveProfile = adaptiveProfile;
      responseBody.meta.adaptiveStrategy = adaptiveStrategy;
      if (responseBody.meta.learningStatus === "completed" && !isMastered(mastery)) {
        responseBody.meta.learningStatus = "in_progress";
      }
    }

    const successResponse = NextResponse.json(responseBody);

    if (process.env.NODE_ENV !== "production" && liveTestRequested) {
      successResponse.headers.set(
        "x-hanip-test-summary-present",
        String(Boolean(compressedContext.summary)),
      );
      successResponse.headers.set("x-hanip-test-learning-mode", learningMode);
      successResponse.headers.set("x-hanip-test-learning-goal", learningGoal);
      successResponse.headers.set(
        "x-hanip-test-tutor-strategy",
        tutorStrategy,
      );
      successResponse.headers.set(
        "x-hanip-test-adaptive-level",
        String(adaptiveLevel),
      );
      successResponse.headers.set(
        "x-hanip-test-input-message-count",
        String(compressedContext.recentMessages.length),
      );
      successResponse.headers.set(
        "x-hanip-test-summarized-message-count",
        String(compressedContext.summarizedMessageCount),
      );
      successResponse.headers.set(
        "x-hanip-test-summary-refreshed",
        String(compressedContext.summaryRefreshed),
      );
      if (misconceptionMatch) {
        successResponse.headers.set(
          "x-hanip-test-misconception-id",
          misconceptionMatch.misconception.id,
        );
        successResponse.headers.set(
          "x-hanip-test-correction-strategy",
          encodeURIComponent(
            misconceptionMatch.misconception.correctionStrategy,
          ),
        );
        successResponse.headers.set(
          "x-hanip-test-next-question-style",
          encodeURIComponent(
            misconceptionMatch.misconception.nextQuestionStyle,
          ),
        );
        successResponse.headers.set(
          "x-hanip-test-new-compare-example",
          String(misconceptionMatch.useNewCompareExample),
        );
      }
      if (workedExampleMatch) {
        successResponse.headers.set(
          "x-hanip-test-example-id",
          workedExampleMatch.example.id,
        );
        successResponse.headers.set(
          "x-hanip-test-example-difficulty",
          String(workedExampleMatch.example.difficulty),
        );
        successResponse.headers.set(
          "x-hanip-test-adaptive-level",
          String(workedExampleMatch.adaptiveLevel),
        );
        successResponse.headers.set(
          "x-hanip-test-follow-up-question",
          encodeURIComponent(workedExampleMatch.example.followUpQuestion),
        );
      }
    }

    await persistAuthenticatedTurn({ uid: authenticatedSession.uid, sessionId: authenticatedSession.id, request: normalizedRequest, response: responseBody });
    return successResponse;
  } catch (error) {
    const errorInfo = getOpenAIErrorInfo(error);
    if (isLiveTestRequestHeader) {
      logLiveUsage(liveTestRequestCount);
    } else {
      logOpenAIError(errorInfo.code, errorInfo.status, 0);
    }

    return NextResponse.json<ChatApiErrorResponse>(
      {
        error: {
          code: errorInfo.code,
          message: errorInfo.message,
          retryable: errorInfo.retryable,
        },
      },
      { status: errorInfo.status },
    );
  }
}
