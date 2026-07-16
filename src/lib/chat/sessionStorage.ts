import {
  AI_EVALUATIONS,
  LEARNING_GOALS,
  LEARNING_MODES,
  LEARNING_STATUSES,
} from "@/lib/types/chat";
import type {
  ChatMessage,
  PersistedChatSession,
  StudentSessionModel,
  ChatStartType,
} from "@/lib/types/chat";
import { HINT_TYPES } from "@/lib/hint/types";
import { getLocalLearningRepository } from "@/lib/repository/repositoryFactory";
import { getAuthSession } from "@/lib/auth/authSession";

function currentUserId() { return getAuthSession().getRequiredUser().id; }

export const HANIP_CHAT_SESSION_STORAGE_KEY = "HANIP_CHAT_SESSION_V1";

export function normalizeChatStartType(
  value: string | null | undefined,
  hasNewQuestion = false,
): ChatStartType {
  if (value === "resume_session" || value === "resume_progress" || value === "new") {
    return value;
  }
  return hasNewQuestion ? "new" : "new";
}

export function shouldRestoreStoredSession(startType: ChatStartType) {
  return startType === "resume_session";
}

export function selectStoredSessionForStartType(
  session: PersistedChatSession | null,
  startType: ChatStartType,
) {
  return shouldRestoreStoredSession(startType) ? session : null;
}

const SESSION_VERSION = 1 as const;
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 5_000;
const MAX_CONTEXT_SUMMARY_LENGTH = 5_000;
const MAX_SUGGESTED_REPLIES = 4;
const MAX_SUGGESTED_REPLY_LENGTH = 100;
const MAX_MODEL_ARRAY_LENGTH = 100;
const MAX_MODEL_STRING_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(
  value: unknown,
  maxItems = MAX_MODEL_ARRAY_LENGTH,
  maxLength = MAX_MODEL_STRING_LENGTH,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every(
      (item) => typeof item === "string" && item.length <= maxLength,
    )
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    value.content.length > 0 &&
    value.content.length <= MAX_MESSAGE_LENGTH
  );
}

function isLearningRoute(value: unknown) {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return (
    typeof value.targetConcept === "string" &&
    value.targetConcept.length <= MAX_MODEL_STRING_LENGTH &&
    isStringArray(value.route) &&
    typeof value.currentIndex === "number" &&
    Number.isInteger(value.currentIndex) &&
    value.currentIndex >= 0 &&
    value.currentIndex < value.route.length &&
    isStringArray(value.completedConcepts) &&
    typeof value.startedAt === "string" &&
    !Number.isNaN(Date.parse(value.startedAt))
  );
}

function isStudentModel(value: unknown): value is StudentSessionModel {
  if (!isRecord(value)) return false;

  return (
    typeof value.currentConcept === "string" &&
    value.currentConcept.length <= MAX_MODEL_STRING_LENGTH &&
    typeof value.currentFlowStage === "string" &&
    value.currentFlowStage.length <= MAX_MODEL_STRING_LENGTH &&
    isStringArray(value.understoodConcepts) &&
    isStringArray(value.needsSupportConcepts) &&
    isStringArray(value.misconceptions) &&
    (value.lastEvaluation === null ||
      AI_EVALUATIONS.some((item) => item === value.lastEvaluation)) &&
    (value.lastNextAction === null ||
      (typeof value.lastNextAction === "string" &&
        value.lastNextAction.length <= MAX_MODEL_STRING_LENGTH)) &&
    (value.confidence === null ||
      (typeof value.confidence === "number" &&
        Number.isFinite(value.confidence) &&
        value.confidence >= 0 &&
        value.confidence <= 1)) &&
    typeof value.consecutiveSuggestedReplyUses === "number" &&
    Number.isInteger(value.consecutiveSuggestedReplyUses) &&
    value.consecutiveSuggestedReplyUses >= 0 &&
    (value.lastResponseMode === null ||
      value.lastResponseMode === "typed" ||
      value.lastResponseMode === "suggested") &&
    (value.hintLevel === 0 ||
      value.hintLevel === 1 ||
      value.hintLevel === 2 ||
      value.hintLevel === 3) &&
    typeof value.consecutiveUnknownResponses === "number" &&
    Number.isInteger(value.consecutiveUnknownResponses) &&
    value.consecutiveUnknownResponses >= 0 &&
    LEARNING_STATUSES.some((item) => item === value.learningStatus) &&
    isStringArray(value.completionEvidence) &&
    LEARNING_MODES.some((item) => item === value.learningMode) &&
    LEARNING_GOALS.some((item) => item === value.learningGoal)
    && typeof value.priorProgressLoaded === "boolean"
    && (value.priorMasteryScore === null ||
      (typeof value.priorMasteryScore === "number" &&
        value.priorMasteryScore >= 0 && value.priorMasteryScore <= 100))
    && (value.priorConceptStatus === null ||
      value.priorConceptStatus === "not_started" ||
      value.priorConceptStatus === "learning" ||
      value.priorConceptStatus === "needs_review" ||
      value.priorConceptStatus === "understood")
    && (value.activePrerequisite === null ||
      (typeof value.activePrerequisite === "string" &&
        value.activePrerequisite.length <= MAX_MODEL_STRING_LENGTH))
    && isStringArray(value.completedPrerequisites)
    && (value.prerequisiteReturnConcept === null ||
      (typeof value.prerequisiteReturnConcept === "string" &&
        value.prerequisiteReturnConcept.length <= MAX_MODEL_STRING_LENGTH))
    && isLearningRoute(value.learningRoute)
    && (value.suspendedConcept === null ||
      (typeof value.suspendedConcept === "string" &&
        value.suspendedConcept.length <= MAX_MODEL_STRING_LENGTH))
    && (!("hintStates" in value) || isHintStateMap(value.hintStates))
    && (!("workedExampleStates" in value) || isWorkedExampleStateMap(value.workedExampleStates))
    && (!("masteryStates" in value) || isMasteryStateMap(value.masteryStates))
    && (!("evaluationHistory" in value) || isEvaluationHistory(value.evaluationHistory))
    && (!("sessionStartedAt" in value) ||
      (typeof value.sessionStartedAt === "string" && !Number.isNaN(Date.parse(value.sessionStartedAt))))
    && (!("goalState" in value) || isGoalState(value.goalState))
    && (!("misconceptionProfiles" in value) || isMisconceptionProfiles(value.misconceptionProfiles))
    && (!("adaptiveProfile" in value) || isAdaptiveProfile(value.adaptiveProfile))
    && (!("responseModeHistory" in value) ||
      (Array.isArray(value.responseModeHistory) && value.responseModeHistory.length <= 100 &&
        value.responseModeHistory.every((mode) => mode === "typed" || mode === "suggested")))
  );
}

function isAdaptiveProfile(value: unknown) {
  return isRecord(value) && typeof value.studentId === "string" &&
    typeof value.concept === "string" && typeof value.learningStyle === "string" &&
    typeof value.preferredQuestionType === "string" &&
    typeof value.preferredHintLevel === "number" &&
    typeof value.needsWorkedExample === "boolean" &&
    ["freeInputRate", "choiceRate", "averageConfidence", "averageHintLevel", "misconceptionRate", "masterySpeed", "reviewSuccessRate"].every(
      (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
    ) && Array.isArray(value.styleHistory) && value.styleHistory.length <= 10;
}

function isMisconceptionProfiles(value: unknown) {
  return Array.isArray(value) && value.length <= 100 && value.every((profile) =>
    isRecord(profile) && typeof profile.concept === "string" &&
    typeof profile.misconceptionId === "string" &&
    typeof profile.misconceptionType === "string" &&
    typeof profile.frequency === "number" && profile.frequency >= 1 &&
    typeof profile.lastOccurred === "string" && !Number.isNaN(Date.parse(profile.lastOccurred)) &&
    typeof profile.resolved === "boolean" &&
    (profile.resolvedAt === null || (typeof profile.resolvedAt === "string" && !Number.isNaN(Date.parse(profile.resolvedAt)))) &&
    typeof profile.reviewPriority === "number" && profile.reviewPriority >= 0 && profile.reviewPriority <= 100 &&
    Array.isArray(profile.relatedExamples) && Array.isArray(profile.relatedHints) &&
    typeof profile.successStreak === "number" && profile.successStreak >= 0
  );
}

function isGoalState(value: unknown) {
  return isRecord(value) && typeof value.currentGoal === "string" &&
    Array.isArray(value.goalReason) && value.goalReason.every((item) => typeof item === "string") &&
    typeof value.goalProgress === "number" && value.goalProgress >= 0 && value.goalProgress <= 100 &&
    Array.isArray(value.completedGoals) && value.completedGoals.length <= 100 &&
    (value.nextGoal === null || typeof value.nextGoal === "string") &&
    typeof value.missionTitle === "string" && typeof value.missionDescription === "string" &&
    typeof value.missionCompleted === "boolean" &&
    Array.isArray(value.missionHistory) && value.missionHistory.length <= 20 &&
    typeof value.estimatedRemaining === "number" && value.estimatedRemaining >= 0;
}

function isMasteryStateMap(value: unknown) {
  if (!isRecord(value) || Object.keys(value).length > 100) return false;
  return Object.values(value).every((state) =>
    isRecord(state) && typeof state.conceptId === "string" &&
    typeof state.masteryScore === "number" && state.masteryScore >= 0 && state.masteryScore <= 100 &&
    typeof state.confidence === "number" && state.confidence >= 0 && state.confidence <= 1 &&
    typeof state.correctStreak === "number" && state.correctStreak >= 0 &&
    typeof state.needsReview === "boolean"
  );
}

function isEvaluationHistory(value: unknown) {
  return Array.isArray(value) && value.length <= 100 && value.every((record) =>
    isRecord(record) && typeof record.concept === "string" &&
    AI_EVALUATIONS.some((item) => item === record.evaluation) &&
    typeof record.misconception === "string" &&
    typeof record.confidence === "number" && record.confidence >= 0 && record.confidence <= 1
  );
}

function isWorkedExampleStateMap(value: unknown) {
  if (!isRecord(value) || Object.keys(value).length > 100) return false;
  return Object.entries(value).every(([conceptId, state]) =>
    conceptId.length <= MAX_MODEL_STRING_LENGTH &&
    isRecord(state) &&
    typeof state.conceptId === "string" &&
    typeof state.exampleId === "string" &&
    typeof state.exampleTitle === "string" &&
    typeof state.exampleStep === "number" && state.exampleStep >= 1 && state.exampleStep <= 5 &&
    typeof state.exampleAttempts === "number" && state.exampleAttempts >= 0 &&
    typeof state.originQuestion === "string" && state.originQuestion.length <= 500 &&
    typeof state.originConcept === "string" &&
    typeof state.returnConcept === "string" &&
    typeof state.completedExample === "boolean" &&
    Array.isArray(state.exampleHistory) && state.exampleHistory.length <= 20 &&
    state.exampleHistory.every((item) => typeof item === "string" && item.length <= 200)
  );
}

function isHintStateMap(value: unknown) {
  if (!isRecord(value) || Object.keys(value).length > 100) return false;
  return Object.entries(value).every(([conceptId, state]) =>
    conceptId.length <= MAX_MODEL_STRING_LENGTH &&
    isRecord(state) &&
    typeof state.conceptId === "string" &&
    state.conceptId.length <= MAX_MODEL_STRING_LENGTH &&
    typeof state.hintLevel === "number" &&
    Number.isInteger(state.hintLevel) &&
    state.hintLevel >= 0 && state.hintLevel <= 5 &&
    Array.isArray(state.hintHistory) && state.hintHistory.length <= 10 &&
    state.hintHistory.every((item) => HINT_TYPES.some((type) => type === item)) &&
    HINT_TYPES.some((type) => type === state.lastHintType) &&
    typeof state.hintCount === "number" && Number.isInteger(state.hintCount) && state.hintCount >= 0 &&
    Array.isArray(state.revealedEvidence) && state.revealedEvidence.length <= 10 &&
    state.revealedEvidence.every((item) => typeof item === "string" && item.length <= MAX_MODEL_STRING_LENGTH) &&
    typeof state.maintainFocus === "boolean"
  );
}

function isPersistedChatSession(value: unknown): value is PersistedChatSession {
  if (!isRecord(value) || value.version !== SESSION_VERSION) return false;

  return (
    typeof value.savedAt === "string" &&
    !Number.isNaN(Date.parse(value.savedAt)) &&
    Array.isArray(value.messages) &&
    value.messages.length <= MAX_MESSAGES &&
    value.messages.every(isChatMessage) &&
    isStudentModel(value.studentModel) &&
    LEARNING_MODES.some((item) => item === value.learningMode) &&
    LEARNING_GOALS.some((item) => item === value.learningGoal) &&
    isStringArray(
      value.activeSuggestedReplies,
      MAX_SUGGESTED_REPLIES,
      MAX_SUGGESTED_REPLY_LENGTH,
    ) &&
    (value.lastWorkedExampleId === null ||
      (typeof value.lastWorkedExampleId === "string" &&
        value.lastWorkedExampleId.length <= MAX_MODEL_STRING_LENGTH)) &&
    typeof value.contextSummary === "string" &&
    value.contextSummary.length <= MAX_CONTEXT_SUMMARY_LENGTH
  );
}

function trimStringArray(values: string[]) {
  return values
    .slice(-MAX_MODEL_ARRAY_LENGTH)
    .map((value) => value.slice(0, MAX_MODEL_STRING_LENGTH));
}

function sanitizeStudentModel(model: StudentSessionModel): StudentSessionModel {
  return {
    ...model,
    currentConcept: model.currentConcept.slice(0, MAX_MODEL_STRING_LENGTH),
    currentFlowStage: model.currentFlowStage.slice(0, MAX_MODEL_STRING_LENGTH),
    understoodConcepts: trimStringArray(model.understoodConcepts),
    needsSupportConcepts: trimStringArray(model.needsSupportConcepts),
    misconceptions: trimStringArray(model.misconceptions),
    lastNextAction:
      model.lastNextAction?.slice(0, MAX_MODEL_STRING_LENGTH) ?? null,
    completionEvidence: trimStringArray(model.completionEvidence),
    activePrerequisite:
      model.activePrerequisite?.slice(0, MAX_MODEL_STRING_LENGTH) ?? null,
    completedPrerequisites: trimStringArray(model.completedPrerequisites),
    prerequisiteReturnConcept:
      model.prerequisiteReturnConcept?.slice(0, MAX_MODEL_STRING_LENGTH) ?? null,
    learningRoute: model.learningRoute
      ? {
          ...model.learningRoute,
          targetConcept: model.learningRoute.targetConcept.slice(
            0,
            MAX_MODEL_STRING_LENGTH,
          ),
          route: trimStringArray(model.learningRoute.route),
          completedConcepts: trimStringArray(
            model.learningRoute.completedConcepts,
          ),
        }
      : null,
    suspendedConcept:
      model.suspendedConcept?.slice(0, MAX_MODEL_STRING_LENGTH) ?? null,
  };
}

export function sanitizeChatSession(
  session: Omit<PersistedChatSession, "version" | "savedAt">,
): PersistedChatSession {
  return {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    messages: session.messages.slice(-MAX_MESSAGES).map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    })),
    studentModel: sanitizeStudentModel(session.studentModel),
    learningMode: session.learningMode,
    learningGoal: session.learningGoal,
    activeSuggestedReplies: session.activeSuggestedReplies
      .slice(0, MAX_SUGGESTED_REPLIES)
      .map((reply) => reply.slice(0, MAX_SUGGESTED_REPLY_LENGTH)),
    lastWorkedExampleId:
      session.lastWorkedExampleId?.slice(0, MAX_MODEL_STRING_LENGTH) ?? null,
    contextSummary: session.contextSummary.slice(
      0,
      MAX_CONTEXT_SUMMARY_LENGTH,
    ),
  };
}

export function saveChatSession(
  session: Omit<PersistedChatSession, "version" | "savedAt">,
) {
  const sanitized = sanitizeChatSession(session);
  const repository = getLocalLearningRepository();
  const userId = currentUserId();
  const data = repository.loadUserDataSync(userId);
  const sessionId = data?.currentSessionId ?? crypto.randomUUID();
  const now = sanitized.savedAt;
  void repository.saveSession(userId, {
    sessionId,
    messages: sanitized.messages,
    studentModel: sanitized.studentModel,
    learningMode: sanitized.learningMode,
    learningGoal: sanitized.learningGoal,
    activeSuggestedReplies: sanitized.activeSuggestedReplies,
    lastWorkedExampleId: sanitized.lastWorkedExampleId,
    contextSummary: sanitized.contextSummary,
    createdAt: data?.sessions.find((item) => item.sessionId === sessionId)?.createdAt ?? now,
    updatedAt: now,
  });
  return sanitized;
}

let pendingSave: ReturnType<typeof setTimeout> | null = null;
export function scheduleChatSessionSave(
  session: Omit<PersistedChatSession, "version" | "savedAt">,
  delayMs = 300,
) {
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = setTimeout(() => {
    pendingSave = null;
    saveChatSession(session);
  }, delayMs);
}

export function cancelScheduledChatSessionSave() {
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = null;
}

export function loadChatSession(): PersistedChatSession | null {
  const data = getLocalLearningRepository().loadUserDataSync(currentUserId());
  const session = data?.sessions.find(({ sessionId }) => sessionId === data.currentSessionId);
  if (!session) return null;
  const persisted: PersistedChatSession = {
    sessionId: session.sessionId,
    version: 1,
    savedAt: session.updatedAt,
    messages: session.messages,
    studentModel: session.studentModel,
    learningMode: session.learningMode,
    learningGoal: session.learningGoal,
    activeSuggestedReplies: session.activeSuggestedReplies,
    lastWorkedExampleId: session.lastWorkedExampleId,
    contextSummary: session.contextSummary,
  };
  return isPersistedChatSession(persisted) ? persisted : null;
}

export function clearChatSession() {
  cancelScheduledChatSessionSave();
  void getLocalLearningRepository().resetCurrentSession(currentUserId());
}
