"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getAuthSession } from "@/lib/auth/authSession";
import { applyUserSettings, createDefaultUserSettings, loadUserSettings } from "@/lib/settings/settingsEngine";
import type { UserSettings } from "@/lib/settings/types";
import type { FormEvent, KeyboardEvent } from "react";

import {
  clearChatSession,
  loadChatSession,
  normalizeChatStartType,
  scheduleChatSessionSave,
  shouldRestoreStoredSession,
} from "@/lib/chat/sessionStorage";
import { workedExampleLibrary } from "@/lib/knowledge";
import {
  findMissingPrerequisite,
  inferDependencyConceptId,
} from "@/lib/knowledge/dependency/dependencyEngine";
import {
  advanceLearningRoute,
  createLearningRoute,
  getCurrentRouteConcept,
} from "@/lib/knowledge/dependency/learningRoute";
import { getDependencyConceptName } from "@/lib/knowledge/dependency";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { updateLearningProgress } from "@/lib/progress/progressEngine";
import {
  applyPriorProgressToStudentModel,
  buildPriorProgressContext,
  findRelevantConceptProgress,
} from "@/lib/progress/progressContext";
import {
  loadLearningProgress,
  saveLearningProgress,
} from "@/lib/progress/progressStorage";
import { AI_EVALUATIONS } from "@/lib/types/chat";
import type {
  AiMeta,
  ChatApiErrorCode,
  ChatApiErrorResponse,
  ChatApiRequest,
  ChatStartType,
  ChatApiResponse,
  ChatMessage,
  LearningGoal,
  LearningMode,
  StudentResponseMode,
  StudentSessionModel,
} from "@/lib/types/chat";
import type { LearningProgress } from "@/lib/progress/types";
import type { LearningState } from "@/lib/learningState/types";
import { filterPersonalData } from "@/lib/security/privacyFilter";

type Message = ChatMessage & {
  id: string;
  suggestedReplies: string[];
  isError?: boolean;
  retryable?: boolean;
};

type RetryRequest = {
  apiMessages: ChatMessage[];
  studentModel: StudentSessionModel;
  explicitUnknownResponse: boolean;
  learningProgress: LearningProgress;
  learningState: LearningState;
  startType: ChatStartType;
  recentSuggestedReplies: string[][];
  errorMessageId?: string;
};

const EMPTY_STUDENT_MODEL: StudentSessionModel = {
  currentConcept: "",
  currentFlowStage: "",
  understoodConcepts: [],
  needsSupportConcepts: [],
  misconceptions: [],
  lastEvaluation: null,
  lastNextAction: null,
  confidence: null,
  consecutiveSuggestedReplyUses: 0,
  lastResponseMode: null,
  hintLevel: 0,
  consecutiveUnknownResponses: 0,
  learningStatus: "in_progress",
  completionEvidence: [],
  learningMode: "learn",
  learningGoal: "concept",
  priorProgressLoaded: false,
  priorMasteryScore: null,
  priorConceptStatus: null,
  activePrerequisite: null,
  completedPrerequisites: [],
  prerequisiteReturnConcept: null,
  learningRoute: null,
  suspendedConcept: null,
};

const LEARNING_MODE_LABELS: Record<LearningMode, string> = {
  learn: "처음부터 배우기",
  review: "짧게 복습하기",
  practice: "문제로 연습하기",
};

const LEARNING_GOAL_LABELS: Record<LearningGoal, string> = {
  concept: "개념 이해",
  exam: "시험 대비",
  practice: "문제 풀이",
  review: "오답 정리",
};

function normalizeLearningMode(value: string | null): LearningMode {
  return value === "review" || value === "practice" ? value : "learn";
}

function normalizeLearningGoal(value: string | null): LearningGoal {
  return value === "exam" || value === "practice" || value === "review"
    ? value
    : "concept";
}

const INITIAL_MESSAGE_CONTENT = `안녕하세요.
궁금한 문법 개념을 함께 알아볼까요?

예를 들어
• 품사가 뭐예요?
• 조사는 왜 단어예요?
• 수사와 수 관형사는 어떻게 구분해요?`;
const ASSISTANT_MARKDOWN_ELEMENTS = [
  "p",
  "strong",
  "ul",
  "ol",
  "li",
  "code",
  "br",
];

function isChatResponse(value: unknown): value is ChatApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    "suggestedReplies" in value &&
    Array.isArray(value.suggestedReplies) &&
    value.suggestedReplies.every((reply) => typeof reply === "string")
  );
}

function isChatErrorResponse(value: unknown): value is ChatApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "code" in value.error &&
    typeof value.error.code === "string" &&
    "message" in value.error &&
    typeof value.error.message === "string" &&
    "retryable" in value.error &&
    typeof value.error.retryable === "boolean"
  );
}

function getErrorMessage(code: ChatApiErrorCode) {
  if (code === "RATE_LIMITED") {
    return "지금은 질문이 잠시 몰리고 있어요. 조금 뒤에 다시 시도해 주세요.";
  }
  if (code === "OPENAI_UNAVAILABLE") {
    return "AI 연결이 잠시 불안정해요. 다시 시도해 주세요.";
  }
  return "AI 응답을 가져오지 못했어요.";
}

function isAiMeta(value: unknown): value is AiMeta {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "concept" in value &&
    typeof value.concept === "string" &&
    "flowStage" in value &&
    typeof value.flowStage === "string" &&
    "evaluation" in value &&
    AI_EVALUATIONS.some((evaluation) => evaluation === value.evaluation) &&
    "nextAction" in value &&
    typeof value.nextAction === "string" &&
    "misconception" in value &&
    typeof value.misconception === "string" &&
    "confidence" in value &&
    typeof value.confidence === "number" &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    (!("hintLevelUsed" in value) ||
      value.hintLevelUsed === 0 ||
      value.hintLevelUsed === 1 ||
      value.hintLevelUsed === 2 ||
      value.hintLevelUsed === 3) &&
    "learningStatus" in value &&
    (value.learningStatus === "in_progress" ||
      value.learningStatus === "ready_to_complete" ||
      value.learningStatus === "completed") &&
    "completionEvidence" in value &&
    Array.isArray(value.completionEvidence) &&
    value.completionEvidence.every((item) => typeof item === "string")
  );
}

function addUnique(values: string[], value: string) {
  return value && !values.includes(value) ? [...values, value] : values;
}

function isSameLearningConcept(currentConcept: string, nextConcept: string) {
  if (!currentConcept || !nextConcept) {
    return false;
  }

  if (
    currentConcept.includes(nextConcept) ||
    nextConcept.includes(currentConcept)
  ) {
    return true;
  }

  const conceptKeywords = [
    "품사",
    "명사",
    "대명사",
    "수사",
    "관형사",
    "조사",
    "형태소",
    "문장 성분",
  ];

  return conceptKeywords.some(
    (keyword) =>
      currentConcept.includes(keyword) && nextConcept.includes(keyword),
  );
}

function updateStudentModel(
  currentModel: StudentSessionModel,
  meta: AiMeta,
  explicitUnknownAlreadyCounted: boolean,
): StudentSessionModel {
  const concept = meta.concept.trim();
  const misconception = meta.misconception.trim();
  const conceptChanged = !isSameLearningConcept(
    currentModel.currentConcept,
    concept,
  );
  let understoodConcepts = currentModel.understoodConcepts;
  let needsSupportConcepts = currentModel.needsSupportConcepts;
  let hintLevel = conceptChanged ? 0 : currentModel.hintLevel;
  let consecutiveUnknownResponses = conceptChanged
    ? 0
    : currentModel.consecutiveUnknownResponses;

  if (meta.evaluation === "correct") {
    understoodConcepts = addUnique(understoodConcepts, concept);
    needsSupportConcepts = needsSupportConcepts.filter(
      (item) => item !== concept,
    );
    hintLevel = 0;
    consecutiveUnknownResponses = 0;
  } else if (
    meta.evaluation === "partial_correct" ||
    meta.evaluation === "apply_fail" ||
    meta.evaluation === "unknown"
  ) {
    needsSupportConcepts = addUnique(needsSupportConcepts, concept);
  }

  if (meta.learningStatus === "completed") {
    understoodConcepts = addUnique(understoodConcepts, concept);
    needsSupportConcepts = needsSupportConcepts.filter(
      (item) => item !== concept,
    );
    hintLevel = 0;
    consecutiveUnknownResponses = 0;
  } else if (
    (meta.evaluation === "misconception" ||
      meta.evaluation === "apply_fail") &&
    currentModel.learningStatus === "completed"
  ) {
    understoodConcepts = understoodConcepts.filter(
      (item) => item !== concept,
    );
    needsSupportConcepts = addUnique(needsSupportConcepts, concept);
  }

  if (
    !conceptChanged &&
    !explicitUnknownAlreadyCounted &&
    (meta.evaluation === "unknown" || meta.evaluation === "apply_fail")
  ) {
    consecutiveUnknownResponses += 1;
    hintLevel = Math.min(3, hintLevel + 1) as 0 | 1 | 2 | 3;
  }
  if (meta.hintState) {
    hintLevel = Math.min(3, meta.hintState.hintLevel) as 0 | 1 | 2 | 3;
  }

  const routeSucceeded =
    meta.evaluation === "correct" &&
    !meta.workedExampleState &&
    (currentModel.lastResponseMode === "typed" ||
      meta.completionEvidence.length > 0);
  const nextLearningRoute = advanceLearningRoute(
    currentModel.learningRoute,
    meta.concept,
    routeSucceeded,
  );
  const nextRouteConcept = getCurrentRouteConcept(nextLearningRoute);
  const routeWasActive = currentModel.learningRoute !== null;
  const completedPrerequisites = routeWasActive
    ? [
        ...new Set([
          ...currentModel.completedPrerequisites,
          ...(nextLearningRoute?.completedConcepts ??
            currentModel.learningRoute?.route ?? []),
        ]),
      ].filter(
        (item) =>
          item !== currentModel.learningRoute?.targetConcept ||
          nextLearningRoute === null,
      )
    : currentModel.activePrerequisite && routeSucceeded
      ? addUnique(
          currentModel.completedPrerequisites,
          currentModel.activePrerequisite,
        )
      : currentModel.completedPrerequisites;

  return {
    currentConcept: nextRouteConcept
      ? getDependencyConceptName(nextRouteConcept)
      : currentModel.activePrerequisite &&
          routeSucceeded &&
          currentModel.prerequisiteReturnConcept
        ? currentModel.prerequisiteReturnConcept
        : concept,
    currentFlowStage: meta.flowStage.trim(),
    understoodConcepts,
    needsSupportConcepts,
    misconceptions: addUnique(
      currentModel.misconceptions,
      misconception,
    ),
    lastEvaluation: meta.evaluation,
    lastNextAction: meta.nextAction,
    confidence: meta.confidence,
    consecutiveSuggestedReplyUses:
      currentModel.consecutiveSuggestedReplyUses,
    lastResponseMode: currentModel.lastResponseMode,
    hintLevel,
    consecutiveUnknownResponses,
    learningStatus: meta.learningStatus,
    completionEvidence: meta.completionEvidence,
    learningMode: currentModel.learningMode,
    learningGoal: currentModel.learningGoal,
    priorProgressLoaded: currentModel.priorProgressLoaded,
    priorMasteryScore: currentModel.priorMasteryScore,
    priorConceptStatus: currentModel.priorConceptStatus,
    activePrerequisite: nextLearningRoute
      ? nextRouteConcept === nextLearningRoute.targetConcept
        ? null
        : nextRouteConcept
      : currentModel.activePrerequisite && routeSucceeded
        ? null
        : currentModel.activePrerequisite,
    completedPrerequisites,
    prerequisiteReturnConcept:
      currentModel.activePrerequisite && meta.evaluation === "correct"
        ? null
        : currentModel.prerequisiteReturnConcept,
    learningRoute: nextLearningRoute,
    suspendedConcept: nextLearningRoute
      ? nextLearningRoute.targetConcept
      : null,
    hintStates: meta.hintState
      ? {
          ...(currentModel.hintStates ?? {}),
          [meta.hintState.conceptId]: meta.hintState,
        }
      : currentModel.hintStates,
    workedExampleStates: meta.workedExampleState
      ? {
          ...(currentModel.workedExampleStates ?? {}),
          [meta.workedExampleState.conceptId]: meta.workedExampleState,
        }
      : currentModel.workedExampleStates,
    masteryStates: meta.mastery
      ? {
          ...(currentModel.masteryStates ?? {}),
          [meta.mastery.conceptId]: meta.mastery,
        }
      : currentModel.masteryStates,
    evaluationHistory: [
      ...(currentModel.evaluationHistory ?? []),
      {
        concept,
        evaluation: meta.evaluation,
        misconception: meta.misconception,
        confidence: meta.confidence,
      },
    ].slice(-100),
    sessionStartedAt: currentModel.sessionStartedAt ?? new Date().toISOString(),
    goalState: meta.goalState ?? currentModel.goalState,
    misconceptionProfiles:
      meta.misconceptionProfiles ?? currentModel.misconceptionProfiles,
    adaptiveProfile: meta.adaptiveProfile ?? currentModel.adaptiveProfile,
    sessionSummaries: meta.sessionSummary
      ? [...(currentModel.sessionSummaries ?? []), meta.sessionSummary].slice(-30)
      : currentModel.sessionSummaries,
    studentProfile: meta.studentModel ?? currentModel.studentProfile,
    responseModeHistory: currentModel.lastResponseMode
      ? [...(currentModel.responseModeHistory ?? []), currentModel.lastResponseMode].slice(-100)
      : currentModel.responseModeHistory,
  };
}

function isExplicitUnknownResponse(value: string) {
  return /몰라|모르겠|이해가\s*안\s*돼|이해가\s*안\s*돼요/.test(value);
}

function createMessage(
  role: Message["role"],
  content: string,
  suggestedReplies: string[] = [],
  options: Pick<Message, "isError" | "retryable"> = {},
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    suggestedReplies,
    ...options,
  };
}

function normalizeAssistantMarkdown(content: string) {
  return content.replace(
    /\*\*([‘“])([^*\n]+)([’”])\*\*/g,
    "$1**$2**$3",
  );
}

function buildContextSummary(model: StudentSessionModel) {
  return [
    model.currentConcept && `현재 학습 개념: ${model.currentConcept}`,
    model.currentFlowStage && `Teaching Flow 단계: ${model.currentFlowStage}`,
    model.understoodConcepts.length > 0 &&
      `이해한 내용: ${model.understoodConcepts.join(", ")}`,
    model.needsSupportConcepts.length > 0 &&
      `아직 어려운 내용: ${model.needsSupportConcepts.join(", ")}`,
    model.misconceptions.length > 0 &&
      `대표 오개념: ${model.misconceptions.join(", ")}`,
    model.completionEvidence.length > 0 &&
      `완료 증거: ${model.completionEvidence.join(", ")}`,
    model.hintLevel > 0 && `최근 힌트 사용: ${model.hintLevel}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 5_000);
}

function findWorkedExampleId(content: string) {
  return (
    workedExampleLibrary.find(
      (example) =>
        content.includes(example.sentenceA) ||
        content.includes(example.sentenceB),
    )?.id ?? null
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q")?.trim() ?? "";
  const requestedConcept = searchParams.get("concept")?.trim() ?? "";
  const requestedLearningMode = normalizeLearningMode(searchParams.get("mode"));
  const requestedLearningGoal = normalizeLearningGoal(searchParams.get("goal"));
  const startType = normalizeChatStartType(
    searchParams.get("startType"),
    Boolean(initialQuestion),
  );
  const [learningMode, setLearningMode] = useState(requestedLearningMode);
  const [learningGoal, setLearningGoal] = useState(requestedLearningGoal);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [studentModel, setStudentModel] =
    useState<StudentSessionModel>(() => ({
      ...EMPTY_STUDENT_MODEL,
      learningMode: requestedLearningMode,
      learningGoal: requestedLearningGoal,
    }));
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestedMessageId, setActiveSuggestedMessageId] = useState<
    string | null
  >(null);
  const [retryRequest, setRetryRequest] = useState<RetryRequest | null>(null);
  const [hasHydratedSession, setHasHydratedSession] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [lastWorkedExampleId, setLastWorkedExampleId] = useState<string | null>(null);
  const [contextSummary, setContextSummary] = useState("");
  const [priorProgressContext, setPriorProgressContext] = useState("");
  const [showPriorProgressNotice, setShowPriorProgressNotice] = useState(false);
  const [studentDisplayName, setStudentDisplayName] = useState("학생");
  const [userSettings, setUserSettings] = useState<UserSettings>(() => createDefaultUserSettings());
  const learningContextLabel = useMemo(
    () => `${LEARNING_MODE_LABELS[learningMode]} · ${LEARNING_GOAL_LABELS[learningGoal]}`,
    [learningGoal, learningMode],
  );
  const isLoadingRef = useRef(false);
  const isComposingRef = useRef(false);
  const clearInputRef = useRef(false);
  const initialQuestionSentRef = useRef(false);
  const shouldPersistRef = useRef(true);
  const progressSessionRecordedRef = useRef(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const performRequest = useCallback(async (requestData: RetryRequest) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    setActiveSuggestedMessageId(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestData.apiMessages,
          studentModel: requestData.studentModel,
          learningMode: requestData.studentModel.learningMode,
          learningGoal: requestData.studentModel.learningGoal,
          priorProgressContext: priorProgressContext || undefined,
          learningProgress: requestData.learningProgress,
          learningState: requestData.learningState,
          startType: requestData.startType,
          recentSuggestedReplies: requestData.recentSuggestedReplies,
        } satisfies ChatApiRequest),
      });
      const data: unknown = await response.json();

      if (!response.ok || !isChatResponse(data)) {
        if (isChatErrorResponse(data)) throw data.error;
        throw {
          code: "UNKNOWN_ERROR" as const,
          message: "AI 응답을 가져오지 못했습니다.",
          retryable: false,
        };
      }

      const updatedStudentModel =
        "meta" in data && isAiMeta(data.meta)
          ? updateStudentModel(
              requestData.studentModel,
              data.meta,
              requestData.explicitUnknownResponse,
            )
          : requestData.studentModel;
      if ("meta" in data && isAiMeta(data.meta)) {
        try {
          const progress = loadLearningProgress();
          saveLearningProgress(
            updateLearningProgress(progress, {
              meta: data.meta,
              learningMode: requestData.studentModel.learningMode,
              learningGoal: requestData.studentModel.learningGoal,
              responseMode:
                requestData.studentModel.lastResponseMode ?? "typed",
              previousLearningStatus:
                requestData.studentModel.learningStatus,
              startsNewSession: !progressSessionRecordedRef.current,
            }),
          );
          progressSessionRecordedRef.current = true;
        } catch (error) {
          console.error("Failed to update learning progress:", error);
        }
      }
      setStudentModel(updatedStudentModel);
      setContextSummary(buildContextSummary(updatedStudentModel));
      const workedExampleId = findWorkedExampleId(data.message);
      if (workedExampleId) setLastWorkedExampleId(workedExampleId);

      const assistantMessage = createMessage(
        "assistant",
        data.message,
        data.suggestedReplies,
      );
      setMessages((currentMessages) => [
        ...currentMessages.filter(
          (message) => message.id !== requestData.errorMessageId,
        ),
        assistantMessage,
      ]);
      setRetryRequest(null);
      setActiveSuggestedMessageId(
        data.suggestedReplies.length > 0 ? assistantMessage.id : null,
      );
    } catch (error) {
      console.error("Failed to send chat message:", error);
      const code: ChatApiErrorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? (error.code as ChatApiErrorCode)
          : "UNKNOWN_ERROR";
      const retryable =
        typeof error === "object" &&
        error !== null &&
        "retryable" in error &&
        error.retryable === true;
      const errorMessageId =
        requestData.errorMessageId ?? crypto.randomUUID();
      const errorContent = getErrorMessage(code);

      setMessages((currentMessages) => {
        const hasExistingError = currentMessages.some(
          (message) => message.id === errorMessageId,
        );
        if (hasExistingError) {
          return currentMessages.map((message) =>
            message.id === errorMessageId
              ? { ...message, content: errorContent, retryable }
              : message,
          );
        }
        return [
          ...currentMessages,
          {
            ...createMessage("assistant", errorContent, [], {
              isError: true,
              retryable,
            }),
            id: errorMessageId,
          },
        ];
      });
      setRetryRequest(
        retryable
          ? { ...requestData, errorMessageId }
          : null,
      );
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [priorProgressContext]);

  const sendMessage = useCallback(async (
    rawInput: string,
    responseMode: StudentResponseMode,
  ) => {
    const filtered = filterPersonalData(rawInput.trim());
    const userInput = filtered.safeText;
    if (!userInput || isLoadingRef.current) return;
    if (filtered.detected.length > 0) {
      window.alert("개인정보로 보이는 내용은 안전을 위해 가렸어요. 이름, 연락처, 학교 정보는 입력하지 마세요.");
    }

    shouldPersistRef.current = true;
    setRetryRequest(null);
    clearInputRef.current = true;
    setInput("");
    requestAnimationFrame(() => {
      setInput("");
      clearInputRef.current = false;
    });

    const userMessage = createMessage("user", userInput);
    const conversationMessages = [...messages, userMessage];
    setMessages(conversationMessages);
    const apiMessages: ChatMessage[] = conversationMessages
      .filter(
        (message) =>
          message.content !== INITIAL_MESSAGE_CONTENT && !message.isError,
      )
      .map(({ role, content }) => ({ role, content }));
    const explicitUnknownResponse = isExplicitUnknownResponse(userInput);
    const learningProgress = loadLearningProgress();
    const detectedConcept = inferDependencyConceptId(userInput);
    const explicitlyChangesTopic =
      /새\s*주제|다른\s*주제|주제를\s*바|이제.*(?:배울래|공부할래)|로\s*바꿀래/.test(
        userInput,
      );
    const dependencyTarget =
      detectedConcept ||
      studentModel.learningRoute?.targetConcept ||
      studentModel.currentConcept ||
      initialQuestion;
    let learningRoute = studentModel.learningRoute;
    if (
      explicitlyChangesTopic &&
      detectedConcept &&
      detectedConcept !== learningRoute?.targetConcept
    ) {
      learningRoute = createLearningRoute({
        targetConcept: detectedConcept,
        studentModel: {
          ...studentModel,
          learningRoute: null,
          activePrerequisite: null,
        },
        learningProgress,
      });
    } else if (!learningRoute && detectedConcept) {
      learningRoute = createLearningRoute({
        targetConcept: detectedConcept,
        studentModel,
        learningProgress,
      });
    }
    const currentRouteConcept = getCurrentRouteConcept(learningRoute);
    const dependency = learningRoute
      ? null
      : findMissingPrerequisite({
          currentConcept: dependencyTarget,
          studentModel,
          learningProgress,
          misconception: studentModel.misconceptions.at(-1),
        });
    const requestStudentModel: StudentSessionModel = {
      ...studentModel,
      learningRoute,
      suspendedConcept: learningRoute?.targetConcept ?? null,
      activePrerequisite:
        currentRouteConcept &&
        currentRouteConcept !== learningRoute?.targetConcept
          ? currentRouteConcept
          : studentModel.activePrerequisite ??
            dependency?.missingPrerequisite ??
            null,
      prerequisiteReturnConcept:
        learningRoute?.targetConcept ??
        studentModel.prerequisiteReturnConcept ??
        (dependency ? dependencyTarget : null),
      consecutiveSuggestedReplyUses:
        responseMode === "suggested"
          ? studentModel.consecutiveSuggestedReplyUses + 1
          : 0,
      lastResponseMode: responseMode,
      consecutiveUnknownResponses: explicitUnknownResponse
        ? studentModel.consecutiveUnknownResponses + 1
        : studentModel.consecutiveUnknownResponses,
      hintLevel: studentModel.hintLevel,
    };
    const learningState = calculateLearningState({
      studentModel: requestStudentModel,
      learningProgress,
      currentConcept: dependencyTarget,
      learningMode,
      learningGoal,
    });

    await performRequest({
      apiMessages,
      studentModel: requestStudentModel,
      explicitUnknownResponse,
      learningProgress,
      learningState,
      startType,
      recentSuggestedReplies: messages
        .filter((message) => message.role === "assistant" && message.suggestedReplies.length > 0)
        .slice(-3)
        .map((message) => message.suggestedReplies),
    });
  }, [initialQuestion, learningGoal, learningMode, messages, performRequest, startType, studentModel]);

  function retryLastMessage() {
    if (retryRequest && !isLoadingRef.current) {
      void performRequest(retryRequest);
    }
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      const authState = await getAuthSession().initialize();
      if (cancelled) return;
      setStudentDisplayName(authState.user?.displayName ?? "학생");
      const restoredSettings = loadUserSettings();
      setUserSettings(restoredSettings);
      applyUserSettings(restoredSettings);
      const storedSession = loadChatSession();
      const learningProgress = loadLearningProgress();
      const restoreSession = Boolean(storedSession && shouldRestoreStoredSession(startType));
      const restoredLearningMode = searchParams.has("mode")
        ? requestedLearningMode
        : restoreSession ? storedSession?.learningMode ?? requestedLearningMode : requestedLearningMode;
      const restoredLearningGoal = searchParams.has("goal")
        ? requestedLearningGoal
        : restoreSession ? storedSession?.learningGoal ?? requestedLearningGoal : requestedLearningGoal;
      setLearningMode(restoredLearningMode);
      setLearningGoal(restoredLearningGoal);

      if (storedSession && restoreSession) {
      progressSessionRecordedRef.current = storedSession.messages.length > 0;
      const restoredMessages = storedSession.messages.map((message) =>
        createMessage(message.role, message.content),
      );
      const lastAssistantIndex = restoredMessages.findLastIndex(
        (message) => message.role === "assistant",
      );
      if (
        lastAssistantIndex >= 0 &&
        storedSession.activeSuggestedReplies.length > 0
      ) {
        restoredMessages[lastAssistantIndex] = {
          ...restoredMessages[lastAssistantIndex],
          suggestedReplies: storedSession.activeSuggestedReplies,
        };
      }
      setMessages(restoredMessages);
      setActiveSuggestedMessageId(
        lastAssistantIndex >= 0 &&
          storedSession.activeSuggestedReplies.length > 0
          ? restoredMessages[lastAssistantIndex].id
          : null,
      );
      const relevantProgress = findRelevantConceptProgress(learningProgress, {
        concept: requestedConcept,
        question: initialQuestion,
        currentConcept: storedSession.studentModel.currentConcept,
      });
      const restoredModel = applyPriorProgressToStudentModel({
        ...storedSession.studentModel,
        learningMode: restoredLearningMode,
        learningGoal: restoredLearningGoal,
      }, relevantProgress);
      setStudentModel(restoredModel);
      const restoredPriorContext = buildPriorProgressContext(relevantProgress);
      setPriorProgressContext(restoredPriorContext ?? "");
      setShowPriorProgressNotice(Boolean(restoredPriorContext));
      setLastWorkedExampleId(storedSession.lastWorkedExampleId);
      setContextSummary(storedSession.contextSummary);
        setShowRestoredNotice(true);
      } else {
        progressSessionRecordedRef.current = false;
        setMessages(
          initialQuestion
            ? []
            : [createMessage("assistant", INITIAL_MESSAGE_CONTENT)],
        );
        const relevantProgress = findRelevantConceptProgress(learningProgress, {
          concept: requestedConcept,
          question: initialQuestion,
        });
        const initialModel = applyPriorProgressToStudentModel({
          ...EMPTY_STUDENT_MODEL,
          learningMode: restoredLearningMode,
          learningGoal: restoredLearningGoal,
        }, relevantProgress);
        setStudentModel(initialModel);
        const initialPriorContext = buildPriorProgressContext(relevantProgress);
        setPriorProgressContext(initialPriorContext ?? "");
        setShowPriorProgressNotice(Boolean(initialPriorContext));
      }

      setHasHydratedSession(true);
    });

    return () => {
      cancelled = true;
    };
    // URL과 Repository 저장 상태는 /chat 진입 시 한 번만 읽습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !hasHydratedSession ||
      !initialQuestion ||
      initialQuestionSentRef.current
    ) {
      return;
    }

    initialQuestionSentRef.current = true;
    void sendMessage(initialQuestion, "typed");
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("q");
    window.history.replaceState(null, "", currentUrl);
  }, [hasHydratedSession, initialQuestion, sendMessage]);

  useEffect(() => {
    if (!hasHydratedSession || !shouldPersistRef.current) return;

    const activeSuggestedReplies =
      messages.find((message) => message.id === activeSuggestedMessageId)
        ?.suggestedReplies ?? [];
    try {
      scheduleChatSessionSave({
        messages: messages
          .filter((message) => !message.isError)
          .map(({ role, content }) => ({ role, content })),
        studentModel: { ...studentModel, learningMode, learningGoal },
        learningMode,
        learningGoal,
        activeSuggestedReplies,
        lastWorkedExampleId,
        contextSummary,
      });
    } catch (error) {
      console.error("Failed to persist chat session:", error);
    }
  }, [
    activeSuggestedMessageId,
    contextSummary,
    hasHydratedSession,
    lastWorkedExampleId,
    learningGoal,
    learningMode,
    messages,
    studentModel,
  ]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => conversationEndRef.current?.scrollIntoView({ behavior: userSettings.reducedMotion ? "auto" : "smooth", block: "end" }));
    return () => cancelAnimationFrame(frame);
  }, [messages, userSettings.reducedMotion]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isComposingRef.current) {
      return;
    }

    const userInput = input;
    void sendMessage(userInput, "typed");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    if (
      event.nativeEvent.isComposing ||
      isComposingRef.current ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function handleStartNewLearning() {
    if (!window.confirm("현재 대화와 학습 기록을 지우고 새로 시작할까요?")) {
      return;
    }

    shouldPersistRef.current = false;
    progressSessionRecordedRef.current = false;
    initialQuestionSentRef.current = true;
    clearChatSession();
    setMessages([createMessage("assistant", INITIAL_MESSAGE_CONTENT)]);
    setStudentModel({ ...EMPTY_STUDENT_MODEL, learningMode, learningGoal });
    setActiveSuggestedMessageId(null);
    setRetryRequest(null);
    setLastWorkedExampleId(null);
    setContextSummary("");
    setPriorProgressContext("");
    setShowPriorProgressNotice(false);
    setShowRestoredNotice(false);
    setInput("");
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("startType", "new");
    currentUrl.searchParams.delete("q");
    window.history.replaceState(null, "", currentUrl);
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-stone-50 text-stone-950">
      <header className="shrink-0 border-b border-stone-200 bg-white px-4 py-3 sm:px-8">
        <div className="relative mx-auto flex w-full max-w-4xl items-center justify-center">
          <Link
            href="/"
            className="absolute left-0 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold hover:bg-stone-100 sm:text-base"
          >
            ← 홈
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight text-emerald-900 sm:text-2xl">한잎 학습</h1>
            <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
              {learningContextLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartNewLearning}
            className="absolute right-0 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:text-sm"
          >
            새 학습 시작
          </button>
        </div>
        {showRestoredNotice && (
          <div className="mx-auto mt-3 flex w-full max-w-3xl items-center justify-center gap-2 text-xs text-zinc-600 sm:text-sm">
            <span>이전 학습을 이어서 진행하고 있어요.</span>
            <button
              type="button"
              aria-label="세션 복원 안내 닫기"
              onClick={() => setShowRestoredNotice(false)}
              className="rounded px-1 font-bold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              ×
            </button>
          </div>
        )}
        {showPriorProgressNotice && (
          <div className="mx-auto mt-2 flex w-full max-w-3xl items-center justify-center gap-2 text-xs text-zinc-600 sm:text-sm">
            <span>이전에 공부한 내용을 바탕으로 이어서 학습해요.</span>
            <button
              type="button"
              aria-label="이전 학습 진행도 안내 닫기"
              onClick={() => setShowPriorProgressNotice(false)}
              className="rounded px-1 font-bold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              ×
            </button>
          </div>
        )}
        {userSettings.showLearningStatus && studentModel.learningRoute &&
          getCurrentRouteConcept(studentModel.learningRoute) && (
            <p className="mx-auto mt-2 w-full max-w-3xl text-center text-xs text-zinc-600 sm:text-sm">
              현재 확인 중: {getDependencyConceptName(
                getCurrentRouteConcept(studentModel.learningRoute)!,
              )} · 목표: {getDependencyConceptName(
                studentModel.learningRoute.targetConcept,
              )}
            </p>
          )}
        {userSettings.showLearningStatus && studentModel.goalState && (
          <details className="mx-auto mt-2 w-full max-w-4xl rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-stone-700 sm:text-sm" open>
            <summary className="cursor-pointer font-bold text-emerald-950">현재 학습 상태</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-3"><p><span className="font-semibold">목표</span><br/>{studentModel.goalState.currentGoal}</p><p><span className="font-semibold">미션</span><br/>{studentModel.goalState.missionDescription}</p><p><span className="font-semibold">남은 단계</span><br/>{studentModel.goalState.estimatedRemaining}</p></div>
          </details>
        )}
      </header>

      <section
        aria-label="대화 내용"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8"
      >
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex flex-col ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <p className="mb-2 text-xs font-bold text-stone-600 sm:text-sm">
                {message.role === "user" ? studentDisplayName : userSettings.tutorName}
              </p>
              {message.role === "assistant" ? (
                <div className={`max-w-[92%] rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-7 text-black shadow-sm sm:max-w-[78%] sm:px-5 sm:py-4 sm:text-base sm:leading-8 ${message.isError ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"}`}>
                  <ReactMarkdown
                    skipHtml
                    allowedElements={ASSISTANT_MARKDOWN_ELEMENTS}
                    unwrapDisallowed
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold">{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li>{children}</li>,
                      code: ({ children }) => (
                        <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[0.9em]">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {normalizeAssistantMarkdown(message.content)}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="max-w-[88%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-stone-950 px-4 py-3 text-sm leading-7 text-white shadow-sm sm:max-w-[72%] sm:text-base sm:leading-8">
                  {message.content}
                </p>
              )}
              {message.role === "assistant" && message.suggestedReplies.length > 0 &&
                (userSettings.showSuggestedReplies || userSettings.preferredInputMode === "choice_preferred" || message.suggestedReplies.includes("오늘은 여기까지")) && (
                  <div
                    className="mt-3 grid w-full max-w-[92%] grid-cols-1 gap-2 min-[520px]:grid-cols-2 sm:max-w-[78%] lg:grid-cols-3"
                    aria-label="추천 답변"
                  >
                    {message.suggestedReplies.map((reply) => {
                      const isActive =
                        activeSuggestedMessageId === message.id && !isLoading;

                      return (
                        <button
                          key={reply}
                          type="button"
                          disabled={!isActive}
                          onClick={() => void sendMessage(reply, "suggested")}
                          className={`min-h-12 rounded-xl border px-4 py-2 text-sm font-semibold text-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed sm:text-base ${reply.includes("모르") ? "border-stone-300 bg-stone-50 hover:bg-stone-100" : "border-emerald-800 bg-white hover:bg-emerald-50"} disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400`}
                        >
                          {reply}
                        </button>
                      );
                    })}
                  </div>
                )}
              {message.role === "assistant" && message.suggestedReplies.length > 0 &&
                !userSettings.showSuggestedReplies && userSettings.preferredInputMode !== "choice_preferred" &&
                !message.suggestedReplies.includes("오늘은 여기까지") && (
                  <p className="mt-2 text-xs text-zinc-600 sm:text-sm">한 단어로 답해도 돼.</p>
                )}
              {message.isError &&
                message.retryable &&
                retryRequest?.errorMessageId === message.id && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={retryLastMessage}
                    className="mt-3 min-h-11 rounded-lg border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-white sm:text-base"
                  >
                    다시 시도
                  </button>
                )}
            </article>
          ))}
          {isLoading && <div role="status" className="flex items-center gap-3 text-sm text-stone-600"><span className="grid size-8 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-900" aria-hidden="true">잎</span><span className="rounded-2xl border border-stone-200 bg-white px-4 py-3"><span className="inline-flex gap-1" aria-hidden="true"><i className="size-1.5 animate-bounce rounded-full bg-stone-500"/><i className="size-1.5 animate-bounce rounded-full bg-stone-500 [animation-delay:120ms]"/><i className="size-1.5 animate-bounce rounded-full bg-stone-500 [animation-delay:240ms]"/></span><span className="sr-only">답변을 준비하고 있어요.</span></span></div>}
          <div ref={conversationEndRef} />
        </div>
      </section>

      <footer className="shrink-0 border-t border-stone-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.03)] sm:px-8 sm:py-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-4xl items-end gap-2 sm:gap-3"
        >
          <label htmlFor="message" className="sr-only">
            메시지 입력
          </label>
          <textarea
            id="message"
            name="message"
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(clearInputRef.current ? "" : event.target.value);
            }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              isComposingRef.current = false;
              setInput(clearInputRef.current ? "" : event.currentTarget.value);
            }}
            placeholder="메시지를 입력하세요."
            className="max-h-36 min-h-12 flex-1 resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-black outline-none placeholder:text-stone-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-12 shrink-0 rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300 sm:text-base"
          >
            {isLoading ? "응답 중" : "보내기"}
          </button>
        </form>
      </footer>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-white text-black"><p role="status" className="animate-pulse motion-reduce:animate-none">학습 내용을 불러오고 있어요…</p></main>}>
      <ChatContent />
    </Suspense>
  );
}
