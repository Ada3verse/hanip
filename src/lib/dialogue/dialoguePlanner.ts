import { getConceptDependency, getDependencyConceptName } from "@/lib/knowledge/dependency";
import type { LearningState } from "@/lib/learningState/types";
import type { ChatMessage, StudentSessionModel } from "@/lib/types/chat";
import type { DialogueAction, DialoguePlan, DialogueResponseMode, SuggestedReplyMode, TeachingStrategy, UserIntent } from "./types";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import { isSessionEndIntent } from "@/lib/sessionSummary/sessionSummaryEngine";
import type { GoalState } from "@/lib/goal/types";
import type { MisconceptionProfile } from "@/lib/misconceptionLearning/types";
import type { AdaptiveTurnStrategy } from "@/lib/adaptive/types";
import { EMPTY_RUNTIME_STUDENT_MODEL, getStudentConceptState } from "@/lib/studentModel/studentModelEngine";

export interface InterruptionState {
  interruptedConcept: string;
  interruptedQuestionPurpose: string;
  interruptedRequiredFocus: string;
  returnPending: boolean;
}

export function isExplicitTopicChange(message: string) {
  return /다른\s*거\s*물어|이제\s*.+(?:공부|배울)|.+말고\s*.+(?:알려|공부)|새\s*주제로|주제를\s*(?:바꾸|넘어)/.test(message);
}

const CONFUSION_PATTERN = /잘\s*모르|모르겠|이해가\s*안|무슨\s*말|헷갈|아직도\s*모르|^아니[요]?$|^아니$/;
const GRAMMAR_SCOPE_PATTERN = /품사|명사|대명사|수사|관형사|조사|형태소|단어|체언|용언|수식언|관계언|독립언|문장\s*성분|어미|부사|형용사|동사/;

export function classifyUserIntent(message: string): UserIntent[] {
  const value = message.trim();
  if (isSessionEndIntent(value) || /새\s*학습|이어서\s*학습/.test(value)) return ["session_control"];
  if (CONFUSION_PATTERN.test(value)) return ["uncertainty_or_confusion"];
  const intents: UserIntent[] = [];
  if (/차이|비교|어떻게\s*달라/.test(value)) intents.push("compare_request");
  if (/왜[^?？]{0,20}필요|필요한\s*이유/.test(value)) intents.push("necessity_request");
  if (/어떻게\s*(?:써|사용)|사용법|언제\s*써/.test(value)) intents.push("usage_request");
  if (/예문|예시/.test(value)) intents.push("example_request");
  if (/설명|알려\s*줘|알려줘/.test(value)) intents.push("explain_request");
  if (/뭐(?:야|예요|에요)|무엇|뜻/.test(value)) intents.push("definition_request");
  if (/풀어|구분해|찾아|판별/.test(value)) intents.push("solve_or_apply_request");
  if (intents.length) return intents;
  if (/[?？]|왜|어떻게/.test(value) && !GRAMMAR_SCOPE_PATTERN.test(value)) return ["unrelated_question"];
  return ["confirmation_answer"];
}

function teachingStrategyFor(intents: UserIntent[]): TeachingStrategy {
  if (intents.includes("uncertainty_or_confusion")) return "GUIDED_DISCOVERY";
  if (intents.includes("compare_request")) return "COMPARE";
  if (intents.includes("example_request")) return "EXAMPLE";
  if (intents.includes("solve_or_apply_request")) return "QUIZ";
  return "DIRECT_EXPLANATION";
}

function teachingGoalFor(concept: string, intents: UserIntent[]) {
  if (concept === "명사와 대명사") return "학생이 명사는 이름을 직접 나타내고 대명사는 명사를 대신하는 말임을 이해하도록 한다.";
  if (concept === "대명사" && intents.includes("necessity_request")) return "학생이 같은 명사의 반복을 피하고 대상을 자연스럽게 이어 말하기 위해 대명사를 사용함을 이해하도록 한다.";
  if (concept === "조사") return "학생이 조사가 체언 뒤에 붙어 문장 속 단어의 문법적 관계를 나타낸다는 것을 이해하도록 한다.";
  if (concept === "품사") return "학생이 품사가 단어를 문법적 성질에 따라 나눈 갈래임을 이해하도록 한다.";
  if (concept.includes("수사") || concept.includes("관형사")) return "학생이 수사와 수 관형사를 체언 자리와 뒤 명사 수식 여부로 구분하도록 한다.";
  return `학생이 ${concept || "현재 문법 개념"}의 핵심 기준을 이해하고 예에 적용하도록 한다.`;
}

function requestedExampleCount(message: string) {
  const match = message.match(/예(?:문|시)\s*(\d+|한|두|세|네)\s*개?/);
  if (!match) return /예문|예시/.test(message) ? 1 : 0;
  return ({ 한: 1, 두: 2, 세: 3, 네: 4 }[match[1]] ?? Number(match[1])) || 1;
}

function requestedConcept(message: string) {
  if (/명사/.test(message.replace(/대명사/g, "")) && /대명사/.test(message)) return "명사와 대명사";
  if (/품사/.test(message) && /문장\s*성분/.test(message)) return "품사와 문장 성분 비교";
  if (/수사/.test(message) && /관형사/.test(message)) return "수사와 수 관형사 구분";
  if (/조사/.test(message)) return "조사";
  if (/품사/.test(message)) return "품사";
  if (/형태소/.test(message)) return "형태소";
  if (/문장\s*성분/.test(message)) return "문장 성분";
  if (/수\s*관형사/.test(message)) return "수 관형사";
  if (/수사/.test(message)) return "수사";
  if (/대명사/.test(message)) return "대명사";
  if (/명사/.test(message)) return "명사";
  return "";
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
  let activeConcept = activeId
    ? getDependencyConceptName(activeId)
    : learningState.currentConcept;
  const lastUser = [...messages].reverse().find(({ role }) => role === "user")?.content ?? "";
  const lastAssistant = [...messages].reverse().find(({ role }) => role === "assistant")?.content ?? "";
  const userIntent = classifyUserIntent(lastUser);
  const originalQuestion = [...messages].reverse().find(({ role, content }) => role === "user" && classifyUserIntent(content).some((intent) => ["explain_request", "compare_request", "example_request", "definition_request"].includes(intent)))?.content ?? "";
  const explicitConcept = requestedConcept(lastUser || originalQuestion);
  const directAnswerRequired = Boolean(explicitConcept && userIntent.some((intent) => ["explain_request", "compare_request", "example_request", "definition_request", "solve_or_apply_request", "usage_request", "necessity_request"].includes(intent)));
  const failureCount = userIntent.includes("uncertainty_or_confusion") ? Math.max(1, studentModel.consecutiveUnknownResponses ?? 1) : 0;
  if (directAnswerRequired) activeConcept = explicitConcept;
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

  let responseMode: DialogueResponseMode = "hint";
  if (isSessionEndIntent(lastUser)) {
    action = "complete";
    reason.push("session_end_intent_summary");
  } else if (directAnswerRequired) {
    action = "explain";
    responseMode = "direct_answer_then_check";
    reason.push("explicit_user_request_priority", "direct_answer_before_prerequisite");
  } else if (userIntent.includes("uncertainty_or_confusion") && originalQuestion && failureCount < 2) {
    activeConcept = requestedConcept(originalQuestion) || activeConcept;
    action = "explain";
    responseMode = "same_concept_reexplain";
    reason.push("same_concept_reexplanation_before_prerequisite");
  } else if (userIntent.includes("uncertainty_or_confusion") && originalQuestion && failureCount >= 2) {
    activeConcept = requestedConcept(originalQuestion) || activeConcept;
    action = "bridge";
    responseMode = "bridge_to_prerequisite";
    reason.push("nearest_prerequisite_after_repeated_failure");
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

  if (responseMode === "hint") {
    responseMode = action === "bridge" ? "bridge_to_prerequisite"
      : action === "return_to_route" ? "return_to_original"
      : action === "explain" ? "same_concept_reexplain"
      : "hint";
  }

  const dependency = activeId ? getConceptDependency(activeId) : null;
  const requestedFocus = explicitConcept === "명사와 대명사"
    ? "명사는 이름을 직접 나타내고 대명사는 그 이름을 대신한다는 차이와 요청한 예문"
    : explicitConcept === "품사"
      ? "품사는 단어를 문법적 성질에 따라 나눈 갈래라는 정의"
      : explicitConcept === "조사"
        ? "조사가 체언 뒤에 붙어 문법적 관계를 나타내므로 단어로 인정된다는 설명"
        : "";
  const requiredFocus = directAnswerRequired && requestedFocus
    ? requestedFocus
    : workedExampleState && !workedExampleState.completedExample
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

  const conceptStudentState = getStudentConceptState(studentModel.studentProfile, activeConcept);
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
    userIntent,
    responseMode,
    directAnswerRequired,
    requestedExampleCount: requestedExampleCount(lastUser || originalQuestion),
    requestedComparisonTargets: explicitConcept === "명사와 대명사" ? ["명사", "대명사"] : [],
    prerequisiteAllowed: responseMode === "bridge_to_prerequisite",
    prerequisiteReason: responseMode === "bridge_to_prerequisite" ? "같은 개념의 쉬운 재설명 뒤에도 이해 불가가 반복됨" : "",
    failureCountForActiveConcept: failureCount,
    originalQuestion,
    suspendedConcept: responseMode === "bridge_to_prerequisite" ? activeConcept : null,
    teachingGoal: teachingGoalFor(activeConcept, userIntent),
    teachingLevel: conceptStudentState.understandingLevel === 1
      ? 1
      : conceptStudentState.understandingLevel === 3
        ? 3
        : 2,
    teachingStrategy: teachingStrategyFor(userIntent),
    studentModel: studentModel.studentProfile ?? EMPTY_RUNTIME_STUDENT_MODEL,
  };
}

export function buildDialoguePlanContext(plan: DialoguePlan) {
  return `[현재 Dialogue Plan — 최종 제어]\n${JSON.stringify(plan)}\n먼저 teachingGoal과 teachingStrategy를 따르고, 그 목표에 맞는 답변 뒤 이해 확인 질문 하나를 생성하세요. activeConcept와 requiredFocus만 다루고 forbiddenTopics로 질문 주제를 바꾸지 마세요.`;
}
