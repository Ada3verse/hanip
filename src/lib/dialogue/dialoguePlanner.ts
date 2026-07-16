import { getConceptDependency, getDependencyConceptName } from "@/lib/knowledge/dependency";
import type { LearningState } from "@/lib/learningState/types";
import type { ChatMessage, StudentSessionModel } from "@/lib/types/chat";
import type { DialogueAction, DialoguePlan, SuggestedReplyMode } from "./types";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import { isSessionEndIntent } from "@/lib/sessionSummary/sessionSummaryEngine";
import type { GoalState } from "@/lib/goal/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { AdaptiveTurnStrategy } from "@/lib/adaptive/types";

export interface InterruptionState {
  interruptedConcept: string;
  interruptedQuestionPurpose: string;
  interruptedRequiredFocus: string;
  returnPending: boolean;
}

export function isExplicitTopicChange(message: string) {
  return /다른\s*거\s*물어|이제\s*.+(?:공부|배울)|.+말고\s*.+(?:알려|공부)|새\s*주제로|주제를\s*(?:바꾸|넘어)/.test(message);
}

function explicitFocus(activeConcept: string, fallback: string) {
  if (activeConcept === "형태소") return "‘학생들’을 ‘학생’과 ‘들’로 나눌 수 있는지";
  if (activeConcept === "단어") return "‘학생’이 문장에서 하나의 단어로 쓰이는지";
  if (activeConcept === "품사") return "‘사람’, ‘예쁘다’, ‘빨리’가 같은 종류인지 다른 종류인지";
  if (activeConcept === "체언") return "명사·대명사·수사 중 체언에 포함되는 말";
  if (activeConcept.includes("수사") || activeConcept.includes("관형사")) {
    return "‘두 학생’에서 ‘두’가 꾸미는 말이 ‘학생’인지";
  }
  if (activeConcept === "조사") return "‘학생이’에서 조사에 해당하는 말";
  if (activeConcept === "문장 성분") return "문장에서 ‘학생’이 맡는 역할";
  if (activeConcept.includes("품사와 문장 성분")) return "단어의 종류와 문장 안의 역할의 차이";
  return fallback;
}

function helpAction(learningState: LearningState): DialogueAction {
  return ["core_criterion", "worked_example", "answer_reveal"].includes(
    learningState.hint.lastHintType,
  )
    ? "explain"
    : "hint";
}

function replyMode(action: DialogueAction, hintLevel: number): SuggestedReplyMode {
  if (action === "complete") return "choice";
  if (action === "return_to_route") return "short_reason";
  if (action === "explain") return hintLevel >= 3 ? "yes_no" : "choice";
  if (action === "hint") return "choice";
  if (action === "confirm") return "short_reason";
  return "choice";
}

export function createDialoguePlan({
  learningState,
  studentModel,
  messages = [],
  workedExampleState,
  goalState,
  activeMisconceptionProfile,
  adaptiveStrategy,
}: {
  learningState: LearningState;
  studentModel: Partial<StudentSessionModel>;
  messages?: ChatMessage[];
  workedExampleState?: WorkedExampleState | null;
  goalState?: GoalState | null;
  activeMisconceptionProfile?: MisconceptionProfile | null;
  adaptiveStrategy?: AdaptiveTurnStrategy | null;
}): DialoguePlan {
  const route = studentModel.learningRoute;
  const routeConceptId = route?.route[route.currentIndex] ?? null;
  const activeId = routeConceptId ?? studentModel.activePrerequisite ?? null;
  const activeConcept = activeId
    ? getDependencyConceptName(activeId)
    : learningState.currentConcept;
  const lastUser = [...messages].reverse().find(({ role }) => role === "user")?.content ?? "";
  const lastAssistant = [...messages].reverse().find(({ role }) => role === "assistant")?.content ?? "";
  const detectedInterruption = Boolean(
    routeConceptId &&
    /[?？]|뭐|어떻게|왜/.test(lastUser) &&
    !isExplicitTopicChange(lastUser),
  );
  const cannotAnswer =
    learningState.evaluation === "unknown" ||
    learningState.evaluation === "apply_fail";
  const misconception = learningState.evaluation === "misconception";
  const correctWithReason =
    learningState.evaluation === "correct" &&
    (studentModel.lastResponseMode === "typed" ||
      (studentModel.completionEvidence?.length ?? 0) > 0);
  let action: DialogueAction;
  const reason: string[] = [];

  if (isSessionEndIntent(lastUser)) {
    action = "complete";
    reason.push("session_end_intent_summary");
  } else if (workedExampleState && !workedExampleState.completedExample) {
    action = workedExampleState.exampleStep === 1 ? "explain" : "confirm";
    reason.push("worked_example_active_concept_locked");
    reason.push(`worked_example_step_${workedExampleState.exampleStep}`);
  } else if (workedExampleState?.completedExample) {
    action = "return_to_route";
    reason.push("worked_example_completed_return_to_origin");
  } else if (route && routeConceptId) {
    reason.push("route_current_concept_locked");
    if (detectedInterruption) {
      action = "return_to_route";
      reason.push("temporary_interruption_return_pending");
    } else if (cannotAnswer) {
      action = helpAction(learningState);
      reason.push("hint_after_unknown");
    } else if (misconception) {
      action = helpAction(learningState);
      reason.push("correct_misconception_in_place");
    } else if (correctWithReason) {
      action = route.currentIndex < route.route.length - 1 ? "return_to_route" : "confirm";
      reason.push("route_progress_evidence_confirmed");
    } else {
      action = "ask";
      reason.push("route_progress_blocked_until_evidence");
    }
  } else if (studentModel.activePrerequisite) {
    action = cannotAnswer ? helpAction(learningState) : "bridge";
    reason.push("active_prerequisite_locked");
  } else if (cannotAnswer) {
    action = helpAction(learningState);
    reason.push("hint_ladder_priority");
  } else if (learningState.completionState.complete) {
    action = "complete";
    reason.push("completion_confirmed");
  } else if (learningState.review.required) {
    action = misconception ? "hint" : "confirm";
    reason.push("mastery_review_priority");
  } else if (misconception) {
    action = "hint";
    reason.push("misconception_focus");
  } else if (learningState.evaluation) {
    action = learningState.evaluation === "correct" ? "confirm" : "ask";
    reason.push("evaluation_priority");
  } else {
    action = "diagnose";
    reason.push("new_concept_diagnosis_allowed");
  }

  const dependency = activeId ? getConceptDependency(activeId) : null;
  const requiredFocus = workedExampleState && !workedExampleState.completedExample
    ? workedExampleState.exampleStep === 1
      ? `비슷한 예제 ${workedExampleState.exampleTitle}`
      : workedExampleState.exampleStep === 2
        ? "예제에서 사용한 핵심 판단 기준"
        : workedExampleState.exampleStep === 3
          ? "같은 기준을 학생이 직접 적용"
          : "예제 적용 결과와 판단 이유 확인"
    : dependency
    ? explicitFocus(activeConcept, dependency.bridgeQuestion)
    : activeConcept.includes("수사") || activeConcept.includes("관형사")
      ? explicitFocus(activeConcept, "뒤의 명사 수식 또는 조사 결합 기준")
      : explicitFocus(activeConcept, `${activeConcept}의 현재 판단 기준`);
  const forbiddenTopics = route && routeConceptId
    ? route.route
        .filter((id) => id !== routeConceptId)
        .map(getDependencyConceptName)
    : [];
  if (lastAssistant) reason.push("avoid_repeating_previous_question");
  reason.push("persona_must_preserve_active_focus");
  if (goalState) reason.push("goal_and_mission_locked");
  if (activeMisconceptionProfile && !activeMisconceptionProfile.resolved) {
    reason.push("unresolved_misconception_priority");
  }
  if (adaptiveStrategy?.personalized) reason.push("adaptive_turn_strategy_applied");

  const adaptiveReplyMode: SuggestedReplyMode | null =
    adaptiveStrategy?.personalized
      ? adaptiveStrategy.includeChoices
        ? adaptiveStrategy.questionType === "choice"
          ? "choice"
          : "keyword"
        : adaptiveStrategy.questionType === "short_reason"
          ? "short_reason"
          : adaptiveStrategy.questionType === "keyword"
            ? "keyword"
            : "none"
      : null;

  return {
    activeConcept,
    action,
    questionPurpose:
      action === "hint" || action === "explain"
        ? "현재 개념에서 막힌 지점을 더 쉽게 확인"
        : action === "return_to_route"
          ? "확인된 기준을 바탕으로 학습 경로 계속 진행"
          : `${activeConcept} 이해 확인`,
    requiredFocus,
    forbiddenTopics,
    suggestedReplyMode:
      action === "complete"
        ? "choice"
        : adaptiveReplyMode ?? replyMode(action, learningState.hint.hintLevel),
    maxQuestions: 1,
    reason,
    hintLevel: learningState.hint.hintLevel,
    hintType: workedExampleState && !workedExampleState.completedExample
      ? "worked_example"
      : learningState.hint.lastHintType,
  };
}

export function buildDialoguePlanContext(plan: DialoguePlan) {
  return `[현재 Dialogue Plan — 최종 제어]\n${JSON.stringify(plan)}\n다음 응답은 activeConcept와 requiredFocus만 다루세요. forbiddenTopics로 질문 주제를 바꾸지 말고 질문은 최대 하나만 사용하세요. 이 계획의 action이 다른 Prompt 규칙보다 우선합니다.`;
}
