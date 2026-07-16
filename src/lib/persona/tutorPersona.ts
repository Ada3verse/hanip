import type { DialoguePlan } from "@/lib/dialogue/types";
import type { LearningState } from "@/lib/learningState/types";
import type { ChatMessage } from "@/lib/types/chat";
import type { AnswerEvaluationResult } from "@/lib/evaluation/types";
import type { ResponseShape, TutorPersonaPlan, TutorTone } from "./types";

export const PERSONA_AVOID_EXPRESSIONS = [
  "오개념이야", "완전히 틀렸어", "왜 이것도 몰라", "다시 생각해",
  "당연히", "상식적으로", "정답은", "힌트 레벨", "평가 결과",
  "학습 전략", "Student Model", "Learning State",
];

const PREFERRED = [
  "그렇게 생각한 이유가 있구나.",
  "그 부분은 잘 짚었어.",
  "한 가지만 더 확인해 볼게.",
  "조금 더 쉽게 볼게.",
  "예문으로 다시 볼까?",
  "이제 원래 질문으로 돌아가 볼게.",
  "판단할 때 본 기준을 하나만 말해 볼래?",
];

const OPENING_TYPES: Array<[string, RegExp]> = [
  ["positive", /^(좋아|그렇구나)/],
  ["acknowledge", /^(그 부분은|어디에서 막혔는지)/],
  ["easier", /^조금 더 쉽게/],
  ["check", /^(먼저 확인해 볼게|한 가지만 더)/],
  ["example", /^(예문으로 볼게|예문으로 다시|다시 볼게)/],
];

function openingType(message: string) {
  return OPENING_TYPES.find(([, pattern]) => pattern.test(message.trim()))?.[0] ?? null;
}

function chooseShape(plan: DialoguePlan, evaluation: LearningState["evaluation"]): ResponseShape {
  if (plan.action === "complete") return "summary_only";
  if (plan.action === "diagnose" || plan.action === "ask") return "question_only";
  if (plan.action === "hint" || evaluation === "partial_correct" || evaluation === "misconception") {
    return "acknowledge_then_question";
  }
  return "brief_explanation_then_question";
}

function chooseTone(state: LearningState, plan: DialoguePlan): TutorTone {
  if (state.evaluation === "unknown" || plan.action === "hint") return "calm";
  if (state.evaluation === "correct" || state.evaluation === "partial_correct") return "encouraging";
  if (state.learningMode === "practice") return "direct";
  return "warm";
}

export function createTutorPersonaPlan({
  dialoguePlan,
  learningState,
  answerEvaluation,
  messages = [],
}: {
  dialoguePlan: DialoguePlan;
  learningState: LearningState;
  answerEvaluation?: AnswerEvaluationResult;
  messages?: ChatMessage[];
}): TutorPersonaPlan {
  const evaluation = answerEvaluation?.evaluation ?? learningState.evaluation;
  const recentAssistantMessages = messages
    .filter(({ role }) => role === "assistant")
    .slice(-4)
    .map(({ content }) => content.trim());
  const recentOpenings = recentAssistantMessages.map((content) => content.slice(0, 20));
  const recentOpeningTypes = new Set(recentAssistantMessages.map(openingType).filter(Boolean));
  const preferredExpressions = PREFERRED.filter(
    (expression) =>
      !recentOpenings.some((opening) => opening.startsWith(expression.slice(0, 10))) &&
      !recentOpeningTypes.has(openingType(expression)),
  );
  const acknowledgeStudent =
    evaluation === "correct" ||
    evaluation === "partial_correct" ||
    evaluation === "misconception" ||
    evaluation === "unknown" ||
    dialoguePlan.action === "hint";
  const reason = [`dialogue_action_${dialoguePlan.action}`];
  if (answerEvaluation) reason.push(`rule_evaluation_${evaluation}`);
  if (acknowledgeStudent) reason.push("acknowledge_thinking_first");
  if (preferredExpressions.length < PREFERRED.length) reason.push("avoid_repeated_opening");
  return {
    tone: chooseTone({ ...learningState, evaluation }, dialoguePlan),
    responseShape: chooseShape(dialoguePlan, evaluation),
    acknowledgeStudent,
    maxSentences: 3,
    maxQuestions: 1,
    avoidExpressions: PERSONA_AVOID_EXPRESSIONS,
    preferredExpressions,
    reason,
  };
}

export function applyTutorPersona(
  message: string,
  plan: TutorPersonaPlan,
  messages: ChatMessage[] = [],
) {
  let result = plan.avoidExpressions.reduce(
    (text, expression) => text.replaceAll(expression, ""),
    message.trim(),
  );
  const recentTypes = new Set(
    messages
      .filter(({ role }) => role === "assistant")
      .slice(-3)
      .map(({ content }) => openingType(content))
      .filter(Boolean),
  );
  const resultOpeningType = openingType(result);
  if (resultOpeningType && recentTypes.has(resultOpeningType)) {
    result = result.replace(/^[^.?!。！？]+[.?!。！？]\s*/, "");
  }
  const sentenceCount = (result.match(/[.!?。！？](?:\s|$)/g) ?? []).length;
  if (
    plan.acknowledgeStudent &&
    plan.tone === "calm" &&
    /^조금 더 쉽게 볼게\./.test(result)
  ) {
    result = recentTypes.has("acknowledge")
      ? result.replace(/^조금 더 쉽게 볼게\.\s*/, "")
      : result.replace(/^조금 더 쉽게 볼게\./, "어디에서 막혔는지 알겠어.");
  }
  if (
    plan.acknowledgeStudent &&
    plan.responseShape === "acknowledge_then_question" &&
    sentenceCount <= 2 &&
    !recentTypes.has("acknowledge") &&
    !/잘 짚|이유가 있|막(?:힌|혔)|주목했|찾았/.test(result)
  ) {
    const acknowledgement =
      plan.tone === "calm"
        ? "어디에서 막혔는지 알겠어."
        : plan.tone === "encouraging"
          ? "그 부분은 잘 짚었어."
          : "그렇게 생각한 이유가 있구나.";
    result = `${acknowledgement} ${result}`;
  }
  let questionSeen = false;
  result = result.replace(/[?？]/g, (mark) => {
    if (!questionSeen) {
      questionSeen = true;
      return mark;
    }
    return ".";
  });
  const finalOpening = result.trim().slice(0, 10);
  const previousExactOpening = [...messages]
    .reverse()
    .find(({ role }) => role === "assistant")?.content.trim().slice(0, 10) ?? "";
  if (finalOpening && finalOpening === previousExactOpening) {
    const withoutRepeatedOpening = result.replace(/^[^.?!。！？]+[.?!。！？]\s*/, "").trim();
    if (withoutRepeatedOpening) result = withoutRepeatedOpening;
  }
  return result;
}

export function buildTutorPersonaContext(plan: TutorPersonaPlan) {
  return `[현재 Tutor Persona — 표현 전용]\n${JSON.stringify(plan)}\nDialogue Plan의 activeConcept와 requiredFocus는 바꾸지 말고, 말투와 문장 형태만 이 계획에 맞추세요. 질문은 하나, 문장은 최대 세 개로 제한하고 내부 상태는 노출하지 마세요.`;
}
