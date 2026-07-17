import { advanceLearningRoute } from "@/lib/knowledge/dependency/learningRoute";
import { getDependencyConceptName } from "@/lib/knowledge/dependency";
import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import type { ChatMessage, StudentResponseMode, StudentSessionModel } from "@/lib/types/chat";
import { isMastered } from "@/lib/mastery/masteryEngine";
import { inferLearningConceptId } from "@/lib/learningState/learningStateEngine";
import { classifyUserIntent } from "@/lib/dialogue/dialoguePlanner";
import { getStudentConceptState, isStudentConceptMastered } from "@/lib/studentModel/studentModelEngine";
import type {
  ConversationQaIssue,
  ConversationQaResult,
  ConversationQaScenario,
} from "./types";

const FAIL_CODES = new Set([
  "QUESTION_COUNT_EXCEEDED", "ACTIVE_CONCEPT_DRIFT", "INTERNAL_TERM_EXPOSED",
  "ROUTE_ADVANCED_WITHOUT_EVIDENCE", "PREVIOUS_MESSAGES_RESTORED_ON_NEW",
  "ROUTE_RETURN_FAILED",
  "DEAD_END_RESPONSE", "IDENTICAL_QUESTION_REPEATED", "HINT_NOT_PROGRESSING",
  "SUGGESTED_REPLIES_DISAPPEARED", "GOAL_CONCEPT_LOST",
  "MASTERY_NOT_APPLIED", "COMPLETED_WITHOUT_MASTERY",
  "MASTERY_REVIEW_MISSING", "NEW_CONCEPT_BEFORE_REVIEW",
  "HINT_LEVEL_SKIPPED", "ANSWER_REVEALED_TOO_EARLY", "HINT_EVALUATION_CONFLICT",
  "WORKED_EXAMPLE_CONCEPT_DRIFT", "WORKED_EXAMPLE_HINT_CONFLICT",
  "WORKED_EXAMPLE_EXIT_MISSING", "WORKED_EXAMPLE_ORIGIN_LOST",
  "WORKED_EXAMPLE_RETURN_FAILED",
  "SUMMARY_INTERNAL_EXPOSED", "SUMMARY_TOO_LONG", "SUMMARY_REVIEW_MISSING",
  "SUMMARY_RECOMMENDATION_INVALID",
  "GOAL_MISSING", "MISSION_DUPLICATED", "GOAL_PROGRESS_DECREASED",
  "GOAL_ROUTE_MISMATCH",
  "MISCONCEPTION_PROFILE_MISSING", "MISCONCEPTION_PROFILE_DUPLICATED",
  "MISCONCEPTION_RESOLVED_INCORRECTLY", "MISCONCEPTION_HINT_MISSING",
  "MISCONCEPTION_WORKED_EXAMPLE_MISSING", "MISCONCEPTION_MASTERY_CONFLICT",
  "ADAPTIVE_PROFILE_MISSING", "ADAPTIVE_OVER_PERSONALIZED",
  "ADAPTIVE_HINT_CONFLICT", "ADAPTIVE_WORKED_EXAMPLE_CONFLICT",
  "ADAPTIVE_EVALUATION_CONFLICT", "ADAPTIVE_MASTERY_INFLUENCE",
  "DIRECT_ANSWER_SKIPPED", "PREMATURE_PREREQUISITE_JUMP",
  "REQUESTED_EXAMPLE_COUNT_IGNORED", "USER_INTENT_OVERRIDDEN_BY_ROUTE",
  "ORIGINAL_QUESTION_NOT_RESUMED", "SAME_CONCEPT_REEXPLANATION_SKIPPED",
  "IRRELEVANT_DIAGNOSTIC_QUESTION", "IDENTICAL_SUGGESTED_REPLIES_REPEATED",
  "TEACHING_GOAL_MISSING", "TEACHING_STRATEGY_MISSING", "TEACHING_LEVEL_INVALID",
  "STUDENT_MODEL_NOT_PERSISTED", "STUDENT_MODEL_CONCEPT_COLLISION",
  "DUPLICATE_UNDERSTANDING_SOURCE", "MASTERY_STATE_CONFLICT",
  "ADAPTIVE_STATE_CONFLICT", "EXPLANATION_HISTORY_LOST",
  "EXPLANATION_HISTORY_UNBOUNDED", "PREMATURE_MASTERY",
  "STUDENT_MODEL_MIGRATION_LOSS", "NEW_SESSION_ERASED_LONG_TERM_MODEL",
  "RESET_PRESERVED_STUDENT_MODEL",
  "KNOWLEDGE_PACK_REQUIRED_FIELD_MISSING", "KNOWLEDGE_PACK_DUPLICATE_CONCEPT",
  "KNOWLEDGE_PACK_PREREQUISITE_CYCLE", "KNOWLEDGE_PACK_SOURCE_MISSING",
  "UNVERIFIED_CONTENT_USED_IN_PRODUCTION", "COPYRIGHT_RISK_LONG_SOURCE_COPY",
  "DUPLICATE_EXAMPLE", "KNOWLEDGE_COVERAGE_INSUFFICIENT",
  "FULL_PACK_INJECTED_IN_PROMPT", "INTERNAL_PROVENANCE_EXPOSED",
  "RAW_SOURCE_AUTO_VERIFIED",
  "SOURCE_FILE_EXPOSED", "SOURCE_PATH_EXPOSED", "UNSUPPORTED_DOCUMENT_ACCEPTED",
  "CORRUPTED_PDF_NOT_REJECTED", "ENCRYPTED_PDF_NOT_REJECTED", "RAW_TEXT_MUTATED",
  "SOURCE_CHUNK_PAGE_RANGE_LOST", "REVIEW_SKIPPED", "UNREVIEWED_CONTENT_IMPORTED",
  "VERIFIED_CONTENT_OVERWRITTEN", "CONTENT_CONFLICT_IGNORED",
  "OCR_REQUIRED_NOT_REPORTED", "FULL_DOCUMENT_LOGGED", "SOURCE_DEV_ROUTE_EXPOSED",
  "INVALID_PACK_STATUS_TRANSITION", "SELF_REVIEW_APPROVED",
  "REVIEW_CHECKLIST_BYPASSED", "UNRESOLVED_CONFLICT_PUBLISHED",
  "INCOMPLETE_COVERAGE_VERIFIED", "UNVERIFIED_PACK_RELEASED",
  "RELEASE_SNAPSHOT_MUTATED", "UNPUBLISHED_RELEASE_USED",
  "SESSION_RELEASE_CHANGED", "CONCEPT_MIGRATION_MISSING",
  "STUDENT_MODEL_LOST_ON_RELEASE", "ROLLBACK_DATA_DELETED",
  "AUDIT_EVENT_MISSING", "SENSITIVE_DATA_IN_AUDIT_LOG",
  "RELEASE_DEV_ROUTE_EXPOSED",
  "IMPORT_WIZARD_STEP_BYPASSED", "IMPORT_WIZARD_STATE_LOST",
  "IMPORT_WIZARD_DOCUMENT_MIXED", "RAW_TEXT_EDITED",
  "CHUNK_PROVENANCE_LOST", "PENDING_REVIEW_IMPORTED",
  "VERIFIED_CONTENT_OVERWRITTEN", "VALIDATION_GATE_BYPASSED",
  "VERIFICATION_GATE_BYPASSED", "RELEASE_CANDIDATE_MUTATED",
  "IMPORT_DEV_ROUTE_EXPOSED", "IMPORT_INTERNAL_DATA_EXPOSED",
  "MOCK_MODE_CALLED_OPENAI", "LIVE_TEST_CALLED_AUTOMATICALLY",
  "DUPLICATE_OPENAI_REQUEST", "OPENAI_CALLED_WITHOUT_KNOWLEDGE",
  "FULL_KNOWLEDGE_PACK_IN_PROMPT", "INTERNAL_PROVENANCE_IN_PROMPT",
  "API_KEY_EXPOSED", "PROVIDER_FAILURE_MASKED_AS_MOCK",
  "STUDENT_QUESTION_NOT_ANSWERED", "RETRIEVAL_EVIDENCE_IGNORED",
  "TEXTBOOK_LONG_COPY", "LIVE_DEV_ROUTE_EXPOSED",
  "UNAUTHENTICATED_CHAT_ACCESS", "PIN_STORED_IN_PLAINTEXT",
  "PIN_EXPOSED_IN_LOG", "PIN_BRUTE_FORCE_UNPROTECTED",
  "ACCOUNT_ENUMERATION", "SESSION_COOKIE_INSECURE", "SESSION_NOT_REVOKED",
  "CROSS_USER_DATA_ACCESS", "CLIENT_ROLE_ESCALATION", "FIRESTORE_OWNER_CHECK_MISSING",
  "REQUIRED_CONSENT_BYPASSED", "OPTIONAL_CONSENT_FORCED",
  "PRIVACY_POLICY_MISSING", "TERMS_MISSING", "PRIVACY_RETENTION_MISMATCH",
  "CONVERSATION_LOGGED_IN_PLAINTEXT", "PERSONAL_DATA_SENT_TO_ANALYTICS",
  "PERSONAL_DATA_INPUT_UNGUARDED", "DATA_DELETION_UNSUPPORTED",
  "ADMIN_ACCESS_NOT_AUDITED", "XSS_INPUT_RENDERED", "CSRF_PROTECTION_MISSING",
  "SECURITY_HEADER_MISSING", "SECRET_EXPOSED", "DEV_AUTH_BYPASS_EXPOSED",
]);
const WARNING_CODES = new Set([
  "QUESTION_AMBIGUOUS", "REQUIRED_FOCUS_MISSING", "REPEATED_OPENING",
  "REPEATED_SUGGESTED_REPLIES", "GENERIC_YES_NO_REPLIES", "RESPONSE_TOO_LONG",
  "PROGRESS_IGNORED",
  "SUGGESTED_REPLY_MISMATCH", "REPEATED_RESPONSE_PATTERN",
  "ADAPTIVE_HINT_REPEATED",
]);
const INTERNAL_PATTERN = /Learning\s*State|Student\s*Model|Hint\s*Level|힌트\s*레벨|평가\s*결과|학습\s*전략|tutorStrategy|dialoguePlan|learningStyle|internalScore|adaptiveReason|decisionLog|sourceId|documentId|pageRange|chunkId|verificationStatus/i;
const AMBIGUOUS_PATTERN = /어떻게 생각해\?|무엇을 알고 있어\?|이 질문에서 가장 궁금한 말은 무엇이야\?|다시 생각해 볼까\?/;

function emptyModel(scenario: ConversationQaScenario): StudentSessionModel {
  const prior = scenario.priorProgress;
  return {
    currentConcept: "", currentFlowStage: "", understoodConcepts: [],
    needsSupportConcepts: prior && prior.status !== "understood" ? [prior.conceptId] : [],
    misconceptions: prior?.misconceptionIds ?? [], lastEvaluation: null,
    lastNextAction: null, confidence: null, consecutiveSuggestedReplyUses: 0,
    lastResponseMode: null, hintLevel: 0, consecutiveUnknownResponses: 0,
    learningStatus: "in_progress", completionEvidence: [], learningMode: scenario.mode,
    learningGoal: scenario.goal, priorProgressLoaded: Boolean(prior),
    priorMasteryScore: prior?.masteryScore ?? null,
    priorConceptStatus: prior?.status ?? null, activePrerequisite: null,
    completedPrerequisites: [], prerequisiteReturnConcept: null,
    learningRoute: null, suspendedConcept: null,
    ...scenario.initialStudentModel,
  };
}

function addIssue(issues: ConversationQaIssue[], code: string, turn: number, message: string) {
  issues.push({ code, turn, message });
}

function sentenceCount(message: string) {
  return (message.match(/[.!?。！？](?:\s|$)/g) ?? []).length || 1;
}

export function inspectConversationQaTurn({
  scenario, issues, turn, response, previousResponse, previousReplies, previousHintLevel, previousAdaptiveHintLevel, previousHintType, previousDialogueResponseMode, previousWorkedExampleStep, previousGoal, previousStudentHistoryCount, studentInput,
}: {
  scenario: ConversationQaScenario;
  issues: ConversationQaIssue[];
  turn: number;
  response: ReturnType<typeof createMockChatResponse>;
  previousResponse: string;
  previousReplies: string[];
  previousHintLevel?: number;
  previousAdaptiveHintLevel?: number;
  previousHintType?: string;
  previousDialogueResponseMode?: string;
  previousWorkedExampleStep?: number;
  previousGoal?: { currentGoal: string; goalProgress: number };
  previousStudentHistoryCount?: number;
  studentInput?: string;
}) {
  const message = response.message;
  const mastery = response.meta?.mastery;
  const adaptiveHint = response.meta?.hintState;
  const workedExample = response.meta?.workedExampleState;
  const sessionSummary = response.meta?.sessionSummary;
  const goal = response.meta?.goalState;
  const profiles = response.meta?.misconceptionProfiles ?? [];
  const adaptive = response.meta?.adaptiveProfile;
  const adaptiveStrategy = response.meta?.adaptiveStrategy;
  if (!adaptive || !adaptiveStrategy) {
    addIssue(issues, "ADAPTIVE_PROFILE_MISSING", turn, "Adaptive Profile 또는 turn 전략이 없습니다.");
  } else {
    if (
      adaptive.learningStyle === "balanced" &&
      adaptive.styleHistory.every((style) => style === "balanced") &&
      adaptiveStrategy.personalized
    ) {
      addIssue(issues, "ADAPTIVE_OVER_PERSONALIZED", turn, "근거가 부족한 상태에서 과도하게 개인화했습니다.");
    }
    if (
      adaptiveStrategy.hintPacing === "slow" &&
      previousDialogueResponseMode !== "direct_answer_then_check" &&
      previousAdaptiveHintLevel !== undefined &&
      (response.meta?.hintState?.hintLevel ?? 0) > previousAdaptiveHintLevel + 1
    ) {
      addIssue(issues, "ADAPTIVE_HINT_CONFLICT", turn, "Adaptive Hint 속도와 실제 Hint가 충돌합니다.");
    }
    if (
      adaptive.needsWorkedExample &&
      ["unknown", "apply_fail", "misconception"].includes(response.meta?.evaluation ?? "") &&
      response.meta?.retrieval?.usedEvidence.some(({ role }) => role === "worked_example") &&
      !response.meta?.workedExampleState
    ) {
      addIssue(issues, "ADAPTIVE_WORKED_EXAMPLE_CONFLICT", turn, "예제 선호 전략이 Worked Example에 반영되지 않았습니다.");
    }
    if (response.meta?.answerEvaluation && response.meta.answerEvaluation.evaluation !== response.meta.evaluation) {
      addIssue(issues, "ADAPTIVE_EVALUATION_CONFLICT", turn, "Adaptive 처리로 중앙 Evaluation이 변경됐습니다.");
    }
    if (/adaptive|learning_style/.test(response.meta?.mastery ? JSON.stringify(response.meta.mastery) : "")) {
      addIssue(issues, "ADAPTIVE_MASTERY_INFLUENCE", turn, "Adaptive 정보가 Mastery 상태에 직접 포함됐습니다.");
    }
  }
  if (response.meta?.evaluation === "misconception" && profiles.length === 0) {
    addIssue(issues, "MISCONCEPTION_PROFILE_MISSING", turn, "오개념 평가가 Profile에 반영되지 않았습니다.");
  }
  const profileKeys = profiles.map(({ concept, misconceptionId }) => `${concept}:${misconceptionId}`);
  if (new Set(profileKeys).size !== profileKeys.length) {
    addIssue(issues, "MISCONCEPTION_PROFILE_DUPLICATED", turn, "같은 오개념 Profile이 중복 생성됐습니다.");
  }
  const activeProfile = profiles.find(({ resolved }) => !resolved);
  if (
    response.meta?.evaluation === "misconception" &&
    profiles.some(({ misconceptionId, resolved }) =>
      misconceptionId === response.meta?.misconception && resolved,
    )
  ) {
    addIssue(issues, "MISCONCEPTION_RESOLVED_INCORRECTLY", turn, "오개념이 다시 발생한 턴에 해결 상태로 남았습니다.");
  }
  if (
    activeProfile && activeProfile.frequency >= 2 &&
    !["misconception_correction", "worked_example"].includes(response.meta?.hintState?.lastHintType ?? "")
  ) {
    addIssue(issues, "MISCONCEPTION_HINT_MISSING", turn, "반복 오개념이 비교형 Hint에 반영되지 않았습니다.");
  }
  if (
    activeProfile && activeProfile.frequency >= 2 &&
    !response.meta?.workedExampleState
  ) {
    addIssue(issues, "MISCONCEPTION_WORKED_EXAMPLE_MISSING", turn, "반복 오개념이 Worked Example 진입에 반영되지 않았습니다.");
  }
  if (activeProfile && (response.meta?.mastery?.masteryScore ?? 0) > 69) {
    addIssue(issues, "MISCONCEPTION_MASTERY_CONFLICT", turn, "미해결 오개념이 있는데 Mastery 제한이 적용되지 않았습니다.");
  }
  if (!goal) {
    addIssue(issues, "GOAL_MISSING", turn, "응답 meta에 현재 Goal과 Mission이 없습니다.");
  } else {
    if (goal.missionHistory.filter((title) => title === goal.missionTitle).length > 1) {
      addIssue(issues, "MISSION_DUPLICATED", turn, "동일 Mission이 중복 활성화됐습니다.");
    }
    if (previousGoal?.currentGoal === goal.currentGoal && goal.goalProgress < previousGoal.goalProgress) {
      addIssue(issues, "GOAL_PROGRESS_DECREASED", turn, "같은 Goal의 진행률이 감소했습니다.");
    }
    const routeConcept = response.meta?.learningState?.learningRouteState.currentConcept;
    const routeConceptName = routeConcept ? getDependencyConceptName(routeConcept) : "";
    if (routeConceptName && !response.meta?.learningState?.review.required && !goal.currentGoal.includes(routeConceptName)) {
      addIssue(issues, "GOAL_ROUTE_MISMATCH", turn, "현재 Goal이 Learning Route의 concept와 일치하지 않습니다.");
    }
  }
  if (sessionSummary) {
    const lines = message.split("\n").filter(Boolean);
    if (lines.length > 5) {
      addIssue(issues, "SUMMARY_TOO_LONG", turn, "학습 정리가 5줄을 초과했습니다.");
    }
    if (/confidence|masteryScore|reason|LearningState|\b0\.\d+\b/i.test(message)) {
      addIssue(issues, "SUMMARY_INTERNAL_EXPOSED", turn, "학습 정리에 내부 상태가 노출됐습니다.");
    }
    if (sessionSummary.reviewConcepts.length > 0 && !message.includes(sessionSummary.reviewConcepts[0])) {
      addIssue(issues, "SUMMARY_REVIEW_MISSING", turn, "필요한 복습 개념이 정리에서 누락됐습니다.");
    }
    if (!message.includes(sessionSummary.recommendedNextConcept.replace(/^복습:\s*/, ""))) {
      addIssue(issues, "SUMMARY_RECOMMENDATION_INVALID", turn, "추천 학습이 정리 결과와 일치하지 않습니다.");
    }
  }
  if (workedExample && !workedExample.completedExample) {
    if (response.meta?.dialoguePlan?.activeConcept !== workedExample.returnConcept) {
      addIssue(issues, "WORKED_EXAMPLE_CONCEPT_DRIFT", turn, "예제 진행 중 다른 concept로 이동했습니다.");
    }
    if (response.meta?.dialoguePlan?.hintType !== "worked_example") {
      addIssue(issues, "WORKED_EXAMPLE_HINT_CONFLICT", turn, "예제 진행 중 별도 Hint를 생성했습니다.");
    }
    if (!workedExample.originQuestion || !workedExample.returnConcept) {
      addIssue(issues, "WORKED_EXAMPLE_ORIGIN_LOST", turn, "원래 질문 또는 복귀 concept가 유실됐습니다.");
    }
  }
  if (previousWorkedExampleStep === 4 && response.meta?.evaluation === "correct" && !workedExample?.completedExample) {
    addIssue(issues, "WORKED_EXAMPLE_EXIT_MISSING", turn, "예제 성공 후 완료 상태로 전환하지 않았습니다.");
  }
  if (workedExample?.completedExample && response.meta?.dialoguePlan?.action !== "return_to_route") {
    addIssue(issues, "WORKED_EXAMPLE_RETURN_FAILED", turn, "예제 완료 후 원래 경로로 복귀하지 않았습니다.");
  }
  if (!mastery) {
    addIssue(issues, "MASTERY_NOT_APPLIED", turn, "응답 meta에 중앙 Mastery 결과가 없습니다.");
  }
  if (
    response.meta?.learningStatus === "completed" &&
    mastery &&
    !isMastered(mastery)
  ) {
    addIssue(issues, "COMPLETED_WITHOUT_MASTERY", turn, "숙련 조건 없이 completed로 판정했습니다.");
  }
  if (
    previousAdaptiveHintLevel !== undefined &&
    previousDialogueResponseMode !== "direct_answer_then_check" &&
    adaptiveHint &&
    adaptiveHint.hintLevel > previousAdaptiveHintLevel + 1 &&
    adaptiveHint.lastHintType !== "worked_example"
  ) {
    addIssue(issues, "HINT_LEVEL_SKIPPED", turn, "Adaptive Hint 단계를 건너뛰었습니다.");
  }
  if (
    adaptiveHint?.lastHintType === "answer_reveal" &&
    (response.meta?.evaluation !== "apply_fail" || adaptiveHint.hintCount < 5)
  ) {
    addIssue(issues, "ANSWER_REVEALED_TOO_EARLY", turn, "최소 힌트 전에 정답을 공개했습니다.");
  }
  if (
    response.meta?.evaluation === "correct" &&
    adaptiveHint &&
    adaptiveHint.hintLevel !== 0
  ) {
    addIssue(issues, "HINT_EVALUATION_CONFLICT", turn, "정답 평가 후 Hint가 초기화되지 않았습니다.");
  }
  if (
    studentInput && /몰라|모르겠|이해가 안/.test(studentInput) &&
    previousHintType &&
    adaptiveHint?.lastHintType === previousHintType &&
    previousAdaptiveHintLevel === adaptiveHint.hintLevel
  ) {
    addIssue(issues, "ADAPTIVE_HINT_REPEATED", turn, "같은 Adaptive Hint 단계와 유형이 반복됐습니다.");
  }
  if (
    mastery?.needsReview &&
    response.meta?.strategy !== "review"
  ) {
    addIssue(issues, "MASTERY_REVIEW_MISSING", turn, "복습 필요 상태인데 review 전략을 사용하지 않았습니다.");
  }
  const activeConceptId = inferLearningConceptId(
    response.meta?.dialoguePlan?.activeConcept,
  );
  if (
    mastery?.needsReview &&
    activeConceptId &&
    activeConceptId !== mastery.conceptId
  ) {
    addIssue(issues, "NEW_CONCEPT_BEFORE_REVIEW", turn, "필요한 복습보다 다른 개념으로 이동했습니다.");
  }
  const questionCount = (message.match(/[?？]/g) ?? []).length;
  const dialoguePlan = response.meta?.dialoguePlan;
  const canonicalStudentModel = response.meta?.studentModel;
  if (!canonicalStudentModel) addIssue(issues, "STUDENT_MODEL_NOT_PERSISTED", turn, "Runtime 결과에 canonical Student Model이 없습니다.");
  if (canonicalStudentModel) {
    const studentState = getStudentConceptState(canonicalStudentModel, dialoguePlan?.activeConcept ?? response.meta?.concept ?? "");
    const canonicalMastered = isStudentConceptMastered(studentState, Boolean(studentState.misconceptionSummary));
    if (canonicalStudentModel.explanationHistory.length > 30) addIssue(issues, "EXPLANATION_HISTORY_UNBOUNDED", turn, "설명 이력이 30개 제한을 초과했습니다.");
    if (previousStudentHistoryCount !== undefined && canonicalStudentModel.explanationHistory.length < previousStudentHistoryCount) addIssue(issues, "EXPLANATION_HISTORY_LOST", turn, "이전 설명 이력이 유실됐습니다.");
    if (canonicalStudentModel.masteredConcepts.includes(dialoguePlan?.activeConcept ?? "") && !canonicalMastered) addIssue(issues, "PREMATURE_MASTERY", turn, "Student Model이 충분한 근거 없이 숙달 처리됐습니다.");
    if (response.meta?.mastery && isMastered(response.meta.mastery) !== canonicalMastered) addIssue(issues, "MASTERY_STATE_CONFLICT", turn, "Mastery와 Student Model의 숙달 결론이 다릅니다.");
    if (studentState.confidence === "LOW" && response.meta?.adaptiveProfile?.learningStyle === "concise_preferred") addIssue(issues, "ADAPTIVE_STATE_CONFLICT", turn, "낮은 확신도와 Adaptive 설명 전략이 충돌합니다.");
    if (dialoguePlan?.studentModel && dialoguePlan.studentModel.updatedAt !== canonicalStudentModel.updatedAt) addIssue(issues, "DUPLICATE_UNDERSTANDING_SOURCE", turn, "DialoguePlan과 Runtime Student Model이 서로 다릅니다.");
  }
  if (!dialoguePlan?.teachingGoal?.trim()) addIssue(issues, "TEACHING_GOAL_MISSING", turn, "이번 턴의 교수 목표가 계산되지 않았습니다.");
  if (!dialoguePlan?.teachingStrategy) addIssue(issues, "TEACHING_STRATEGY_MISSING", turn, "교수 전략이 계산되지 않았습니다.");
  if (![1, 2, 3].includes(dialoguePlan?.teachingLevel ?? 0)) addIssue(issues, "TEACHING_LEVEL_INVALID", turn, "설명 수준이 유효하지 않습니다.");
  if (scenario.expected.expectedTeachingStrategy && dialoguePlan?.teachingStrategy !== scenario.expected.expectedTeachingStrategy) {
    addIssue(issues, "TEACHING_STRATEGY_MISSING", turn, `예상 교수 전략 ${scenario.expected.expectedTeachingStrategy}을 사용하지 않았습니다.`);
  }
  if (scenario.expected.teachingGoalPattern && !scenario.expected.teachingGoalPattern.test(dialoguePlan?.teachingGoal ?? "")) {
    addIssue(issues, "TEACHING_GOAL_MISSING", turn, "질문 의도에 맞는 교수 목표가 아닙니다.");
  }
  if (dialoguePlan?.directAnswerRequired && !["direct_answer", "direct_answer_then_check"].includes(dialoguePlan.responseMode ?? "")) {
    addIssue(issues, "DIRECT_ANSWER_SKIPPED", turn, "명시적 질문에 대한 직접 답변 계획이 누락됐습니다.");
  }
  if (dialoguePlan?.directAnswerRequired && dialoguePlan.activeConcept !== response.meta?.concept && /형태소/.test(message)) {
    addIssue(issues, "USER_INTENT_OVERRIDDEN_BY_ROUTE", turn, "학생 의도보다 기존 Route 질문이 우선됐습니다.");
  }
  if ((dialoguePlan?.requestedExampleCount ?? 0) > 1) {
    const exampleMarkers = message.match(/(?:^|\n)\s*\d+[.)]/g)?.length ?? 0;
    if (exampleMarkers < (dialoguePlan?.requestedExampleCount ?? 0)) addIssue(issues, "REQUESTED_EXAMPLE_COUNT_IGNORED", turn, "요청한 예문 개수를 충족하지 못했습니다.");
  }
  if (dialoguePlan?.responseMode === "bridge_to_prerequisite" && (dialoguePlan.failureCountForActiveConcept ?? 0) < 2) {
    addIssue(issues, "PREMATURE_PREREQUISITE_JUMP", turn, "같은 개념 재설명 전에 선수 개념으로 이동했습니다.");
  }
  if (studentInput && /몰라|모르겠|이해가 안/.test(studentInput) && (dialoguePlan?.failureCountForActiveConcept ?? 0) < 2 && dialoguePlan?.responseMode === "bridge_to_prerequisite") {
    addIssue(issues, "SAME_CONCEPT_REEXPLANATION_SKIPPED", turn, "첫 이해 실패에서 같은 개념 재설명을 건너뛰었습니다.");
  }
  if (dialoguePlan?.directAnswerRequired && dialoguePlan.activeConcept !== "형태소" && /먼저\s*(?:형태소|단어)|학생들.*나눌/.test(message)) {
    addIssue(issues, "IRRELEVANT_DIAGNOSTIC_QUESTION", turn, "명시적 질문 대신 무관한 대표 진단 질문을 사용했습니다.");
  }
  const inputGuide = /한 단어로 답해도 돼|예:|___|이유를 짧게 한 문장|적어 봐/.test(message);
  if (questionCount > 0 && response.suggestedReplies.length < 2 && !inputGuide && response.meta?.learningStatus !== "completed") {
    addIssue(issues, "DEAD_END_RESPONSE", turn, "질문이 있지만 선택지나 구체적인 입력 안내가 없습니다.");
  }
  if (AMBIGUOUS_PATTERN.test(message) || (/무엇일까\?/.test(message) && message.length < 18)) {
    addIssue(issues, "QUESTION_AMBIGUOUS", turn, "답할 대상이나 범위가 불명확합니다.");
  }
  if (questionCount > (scenario.expected.maxQuestionsPerTurn ?? 1)) {
    addIssue(issues, "QUESTION_COUNT_EXCEEDED", turn, `질문이 ${questionCount}개입니다.`);
  }
  const activeConcept = response.meta?.dialoguePlan?.activeConcept ?? response.meta?.concept ?? "";
  if (
    scenario.expected.activeConceptMustRemain &&
    !activeConcept.includes(scenario.expected.activeConceptMustRemain)
  ) addIssue(issues, "ACTIVE_CONCEPT_DRIFT", turn, `activeConcept가 ${activeConcept}(으)로 이동했습니다.`);
  if (
    scenario.expected.activeConceptMustRemain?.includes("수사와 수 관형사") &&
    /품사의 전체|형태소|문장 성분/.test(message)
  ) addIssue(issues, "ACTIVE_CONCEPT_DRIFT", turn, "응답 텍스트가 허용되지 않은 개념으로 이동했습니다.");
  if (
    scenario.expected.requiredFocusKeywords?.length &&
    !scenario.expected.requiredFocusKeywords.some((keyword) => message.includes(keyword))
  ) addIssue(issues, "REQUIRED_FOCUS_MISSING", turn, "필수 초점이 응답에 드러나지 않습니다.");
  const opening = message.trim().slice(0, 20);
  if (
    scenario.expected.forbidRepeatedOpening && previousResponse &&
    previousResponse.trim().slice(0, 10) === opening.slice(0, 10)
  ) addIssue(issues, "REPEATED_OPENING", turn, "직전 응답과 같은 시작 표현입니다.");
  const normalizeQuestion = (value: string) => value.replace(/[^가-힣a-z0-9]/gi, "").replace(/(?:조금더쉽게|한가지만더)/g, "");
  if (previousResponse && normalizeQuestion(previousResponse) === normalizeQuestion(message)) {
    addIssue(issues, "IDENTICAL_QUESTION_REPEATED", turn, "동일한 질문이 반복됐습니다.");
  }
  if (
    scenario.expected.forbidRepeatedSuggestedReplies && previousReplies.length > 0 &&
    JSON.stringify(previousReplies) === JSON.stringify(response.suggestedReplies)
  ) {
    addIssue(issues, "REPEATED_SUGGESTED_REPLIES", turn, "동일한 선택지가 연속 사용됐습니다.");
    addIssue(issues, "IDENTICAL_SUGGESTED_REPLIES_REPEATED", turn, "학생 요청과 무관하게 같은 선택지 배열이 반복됐습니다.");
  }
  if (previousReplies.length > 0 && response.suggestedReplies.length === 0 && !inputGuide && response.meta?.learningStatus !== "completed") {
    addIssue(issues, "SUGGESTED_REPLIES_DISAPPEARED", turn, "선택지가 사라졌지만 입력 안내가 없습니다.");
  }
  if (
    studentInput && /몰라|모르겠|이해가 안/.test(studentInput) &&
    previousHintLevel !== undefined && response.meta?.hintLevelUsed === previousHintLevel &&
    normalizeQuestion(previousResponse) === normalizeQuestion(message)
  ) addIssue(issues, "HINT_NOT_PROGRESSING", turn, "이해 불가 응답 뒤 도움 단계와 질문이 변하지 않았습니다.");
  if (
    response.suggestedReplies.includes("응") && response.suggestedReplies.includes("아니") &&
    !/(까|니|나요)\?|수\s*있는지.*볼래\?/.test(message)
  ) addIssue(issues, "GENERIC_YES_NO_REPLIES", turn, "예/아니오 대상이 명확하지 않습니다.");
  if (
    /(무엇|어느 말|어느 것)/.test(message) &&
    response.suggestedReplies.some((reply) => /^(응|아니)$/.test(reply))
  ) addIssue(issues, "SUGGESTED_REPLY_MISMATCH", turn, "질문의 답변 대상과 선택지가 일치하지 않습니다.");
  if (
    /(왜|이유|근거|어떤 기준)/.test(message) &&
    response.suggestedReplies.length > 0 &&
    !response.suggestedReplies.some((reply) => /때문|기준|꾸미|결합/.test(reply))
  ) addIssue(issues, "SUGGESTED_REPLY_MISMATCH", turn, "이유 질문에 직접 답할 수 없는 선택지입니다.");
  if (sentenceCount(message) > (scenario.expected.maxAssistantSentences ?? 3)) {
    addIssue(issues, "RESPONSE_TOO_LONG", turn, "Persona 문장 수 제한을 초과했습니다.");
  }
  if (INTERNAL_PATTERN.test(message)) {
    addIssue(issues, "INTERNAL_TERM_EXPOSED", turn, "내부 상태 용어가 학생 응답에 노출됐습니다.");
  }
  if (
    previousResponse &&
    previousResponse.replace(/[‘’'"\s]/g, "").slice(-24) ===
      message.replace(/[‘’'"\s]/g, "").slice(-24)
  ) addIssue(issues, "REPEATED_RESPONSE_PATTERN", turn, "응답 문장 구조가 직전 턴과 반복됩니다.");
  for (const phrase of scenario.expected.forbiddenPhrases ?? []) {
    if (message.includes(phrase)) addIssue(issues, "QUESTION_AMBIGUOUS", turn, `금지 문구가 포함됐습니다: ${phrase}`);
  }
}

export function routeAdvancedWithoutEvidence(
  before: number | null,
  after: number | null,
  evidenceConfirmed: boolean,
) {
  return before !== null && after !== null && after > before && !evidenceConfirmed;
}

export function progressWasReflected(message: string) {
  return /이전|전에|다시|바로|새 문장|기초 정의 대신|보던|헷갈/.test(message);
}

export function classifyQaIssues(issues: ConversationQaIssue[]) {
  return issues.some(({ code }) => FAIL_CODES.has(code))
    ? "fail" as const
    : issues.some(({ code }) => WARNING_CODES.has(code))
      ? "warning" as const
      : "pass" as const;
}

export function runConversationQaScenario(scenario: ConversationQaScenario): ConversationQaResult {
  const issues: ConversationQaIssue[] = [];
  const restorePrevious = scenario.startType === "resume_session";
  const transcript: ChatMessage[] = restorePrevious ? [...(scenario.previousMessages ?? [])] : [];
  if (scenario.startType === "new" && transcript.length > 0) {
    addIssue(issues, "PREVIOUS_MESSAGES_RESTORED_ON_NEW", 0, "new 시작에 이전 메시지가 복원됐습니다.");
  }
  let model = emptyModel(scenario);
  const assistantDetails: ConversationQaResult["assistantDetails"] = [];
  const inputs = [scenario.startQuestion, ...scenario.studentTurns];
  let previousResponse = "";
  let previousReplies: string[] = [];
  let previousHintLevel: number | undefined;
  let previousAdaptiveHintLevel: number | undefined;
  let previousHintType: string | undefined;
  let previousDialogueResponseMode: string | undefined;
  let previousWorkedExampleStep: number | undefined;
  let previousGoal: { currentGoal: string; goalProgress: number } | undefined;
  let previousStudentHistoryCount: number | undefined;
  const recentSuggestedReplies: string[][] = [];

  inputs.forEach((studentInput, index) => {
    const turn = index + 1;
    const responseMode: StudentResponseMode = previousReplies.includes(studentInput)
      ? "suggested"
      : "typed";
    const explicitUnknown = /몰라|모르겠|이해가 안/.test(studentInput);
    const requestModel: StudentSessionModel = {
      ...model,
      lastResponseMode: responseMode,
      consecutiveSuggestedReplyUses: responseMode === "suggested" ? model.consecutiveSuggestedReplyUses + 1 : 0,
      consecutiveUnknownResponses: explicitUnknown ? model.consecutiveUnknownResponses + 1 : model.consecutiveUnknownResponses,
      hintLevel: model.hintLevel,
    };
    const userMessage = { role: "user" as const, content: studentInput };
    transcript.push(userMessage);
    const routeBefore = model.learningRoute?.currentIndex ?? null;
    const routeConceptBefore = model.learningRoute?.route[model.learningRoute.currentIndex] ?? null;
    const temporaryInterruption = Boolean(
      routeConceptBefore && classifyUserIntent(studentInput).includes("unrelated_question") &&
      !/다른\s*거\s*물어|이제\s*.+(?:공부|배울)|.+말고|새\s*주제로/.test(studentInput),
    );
    const response = createMockChatResponse({
      messages: [...transcript], studentModel: requestModel, learningMode: scenario.mode,
      learningGoal: scenario.goal, startType: scenario.startType ?? "new",
      recentSuggestedReplies: recentSuggestedReplies.slice(-3),
    });
    transcript.push({ role: "assistant", content: response.message });
    inspectConversationQaTurn({ scenario, issues, turn, response, previousResponse, previousReplies, previousHintLevel, previousAdaptiveHintLevel, previousHintType, previousDialogueResponseMode, previousWorkedExampleStep, previousGoal, previousStudentHistoryCount, studentInput });
    if (
      temporaryInterruption &&
      response.meta?.dialoguePlan?.activeConcept !==
        (routeConceptBefore ? getDependencyConceptName(routeConceptBefore) : "")
    ) addIssue(issues, "ROUTE_RETURN_FAILED", turn, "관련 없는 질문 뒤 기존 Route로 복귀하지 못했습니다.");
    assistantDetails.push({
      turn, studentInput, response: response.message,
      suggestedReplies: response.suggestedReplies, meta: response.meta,
    });
    if (turn === 1 && scenario.expected.mustUseProgress && scenario.priorProgress) {
      if (!progressWasReflected(response.message)) {
        addIssue(issues, "PROGRESS_IGNORED", turn, "첫 응답이 장기 진행도를 활용하지 않았습니다.");
      }
    }
    if (response.meta) {
      const routeSucceeded =
        response.meta.evaluation === "correct" &&
        !response.meta.workedExampleState &&
        (responseMode === "typed" || response.meta.completionEvidence.length > 0);
      const nextRoute = advanceLearningRoute(model.learningRoute, response.meta.concept, routeSucceeded);
      if (model.learningRoute && nextRoute && model.learningRoute.targetConcept !== nextRoute.targetConcept) {
        addIssue(issues, "GOAL_CONCEPT_LOST", turn, "선수 개념 진행 중 최종 목표가 변경됐습니다.");
      }
      if (routeAdvancedWithoutEvidence(routeBefore, nextRoute?.currentIndex ?? null, routeSucceeded)) {
        addIssue(issues, "ROUTE_ADVANCED_WITHOUT_EVIDENCE", turn, "근거 없이 Route가 이동했습니다.");
      }
      model = {
        ...requestModel,
        currentConcept: response.meta.concept,
        currentFlowStage: response.meta.flowStage,
        lastEvaluation: response.meta.evaluation,
        lastNextAction: response.meta.nextAction,
        learningStatus: response.meta.learningStatus,
        completionEvidence: response.meta.completionEvidence,
        lastResponseMode: responseMode,
        consecutiveSuggestedReplyUses: requestModel.consecutiveSuggestedReplyUses,
        consecutiveUnknownResponses: response.meta.evaluation === "correct" ? 0 : requestModel.consecutiveUnknownResponses,
        hintLevel: response.meta.evaluation === "correct"
          ? 0
          : Math.min(3, response.meta.hintState?.hintLevel ?? requestModel.hintLevel) as 0 | 1 | 2 | 3,
        hintStates: response.meta.hintState
          ? {
              ...(requestModel.hintStates ?? {}),
              [response.meta.hintState.conceptId]: response.meta.hintState,
            }
          : requestModel.hintStates,
        workedExampleStates: response.meta.workedExampleState
          ? {
              ...(requestModel.workedExampleStates ?? {}),
              [response.meta.workedExampleState.conceptId]: response.meta.workedExampleState,
            }
          : requestModel.workedExampleStates,
        masteryStates: response.meta.mastery
          ? {
              ...(requestModel.masteryStates ?? {}),
              [response.meta.mastery.conceptId]: response.meta.mastery,
            }
          : requestModel.masteryStates,
        evaluationHistory: [
          ...(requestModel.evaluationHistory ?? []),
          {
            concept: response.meta.concept,
            evaluation: response.meta.evaluation,
            misconception: response.meta.misconception,
            confidence: response.meta.confidence,
          },
        ].slice(-100),
        sessionStartedAt: requestModel.sessionStartedAt ?? new Date().toISOString(),
        goalState: response.meta.goalState ?? requestModel.goalState,
        misconceptionProfiles:
          response.meta.misconceptionProfiles ?? requestModel.misconceptionProfiles,
        adaptiveProfile: response.meta.adaptiveProfile ?? requestModel.adaptiveProfile,
        responseModeHistory: [
          ...(requestModel.responseModeHistory ?? []),
          responseMode,
        ].slice(-100),
        learningRoute: nextRoute,
        studentProfile: response.meta.studentModel ?? requestModel.studentProfile,
      };
    }
    previousResponse = response.message;
    previousReplies = response.suggestedReplies;
    previousHintLevel = response.meta?.hintLevelUsed;
    previousAdaptiveHintLevel = response.meta?.hintState?.hintLevel;
    previousHintType = response.meta?.hintState?.lastHintType;
    previousDialogueResponseMode = response.meta?.dialoguePlan?.responseMode;
    previousWorkedExampleStep = response.meta?.workedExampleState?.exampleStep;
    previousGoal = response.meta?.goalState
      ? { currentGoal: response.meta.goalState.currentGoal, goalProgress: response.meta.goalState.goalProgress }
      : previousGoal;
    previousStudentHistoryCount = response.meta?.studentModel?.explanationHistory.length ?? previousStudentHistoryCount;
    if (response.suggestedReplies.length > 0) {
      recentSuggestedReplies.push(response.suggestedReplies);
    }
  });

  if (scenario.expected.mustNotRestorePreviousMessages && restorePrevious) {
    addIssue(issues, "PREVIOUS_MESSAGES_RESTORED_ON_NEW", 0, "이전 메시지 복원 금지 조건을 위반했습니다.");
  }
  const status = classifyQaIssues(issues);
  return { scenarioId: scenario.id, status, issues, transcript, assistantDetails };
}

export function runConversationQa(scenarios: ConversationQaScenario[]) {
  return scenarios.map(runConversationQaScenario);
}

export const QA_FAIL_CODES = FAIL_CODES;
export const QA_WARNING_CODES = WARNING_CODES;
