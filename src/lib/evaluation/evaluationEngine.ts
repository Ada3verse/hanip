import type { AnswerEvaluationInput, AnswerEvaluationResult } from "./types";
import { isSessionEndIntent } from "@/lib/sessionSummary/sessionSummaryEngine";

const UNKNOWN = /^(?:잘\s*)?(?:몰라|모르겠(?:어|어요)?|이해가\s*안\s*돼(?:요)?|무슨\s*(?:말|뜻)이야)[.!?\s]*$/;
const CONCEPT_RULES: Array<{ pattern: RegExp; keywords: string[]; patterns: RegExp[] }> = [
  { pattern: /형태소/, keywords: ["학생", "들", "뜻", "가장 작은"], patterns: [/학생\s*(?:\+|과|하고)\s*들/, /뜻을?\s*가진\s*가장\s*작은/] },
  { pattern: /^단어$|단어/, keywords: ["한 단어", "홀로", "조사"], patterns: [/한\s*단어/, /홀로\s*쓰/, /조사와?\s*결합/] },
  { pattern: /수사와\s*수\s*관형사|수\s*관형사/, keywords: ["뒤", "명사", "꾸미", "조사", "체언"], patterns: [/뒤(?:의)?\s*명사.*꾸/, /조사.*(?:붙|결합)/, /학생(?:을)?\s*꾸/] },
  { pattern: /수사/, keywords: ["수량", "순서", "체언", "조사"], patterns: [/수량.*순서/, /체언/, /조사.*결합/] },
  { pattern: /명사.*대명사|대명사.*명사/, keywords: ["이름", "직접", "대신", "가리키"], patterns: [/명사.*이름.*대명사.*대신/, /이름을?\s*직접.*대신/] },
  { pattern: /대명사/, keywords: ["이름", "대신", "가리키", "체언"], patterns: [/이름을?\s*대신/, /명사.*대신/] },
  { pattern: /명사/, keywords: ["사람", "사물", "장소", "개념", "이름"], patterns: [/사람.*사물/, /대상의?\s*이름/] },
  { pattern: /품사/, keywords: ["단어", "종류", "형태", "기능", "의미", "뜻"], patterns: [/단어.*(?:종류|갈래)/, /형태.*기능.*의미/] },
  { pattern: /조사/, keywords: ["체언", "관계", "붙"], patterns: [/체언.*뒤/, /관계.*나타/] },
  { pattern: /문장\s*성분/, keywords: ["역할", "주어", "목적어", "서술어"], patterns: [/문장.*역할/] },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[‘’'".,!?]/g, "")
    .replace(/달라(?:요)?/g, "다르")
    .replace(/\s+/g, " ")
    .trim();
}
function includesLoose(text: string, keyword: string) {
  return normalize(text).replace(/\s/g, "").includes(
    normalize(keyword).replace(/\s/g, ""),
  );
}

export function evaluateStudentAnswer(input: AnswerEvaluationInput): AnswerEvaluationResult {
  const answer = normalize(input.studentAnswer);
  if (isSessionEndIntent(input.studentAnswer)) {
    return {
      evaluation: input.previousEvaluation ?? "unknown",
      confidence: input.previousEvaluation ? 0.95 : 0.5,
      matchedEvidence: [], matchedKeywords: [], matchedExamples: [],
      matchedMisconceptions: [], completionSatisfied: false,
      reason: ["session_end_intent_not_evaluated"],
    };
  }
  const reason: string[] = [];
  if (!answer || UNKNOWN.test(answer)) return { evaluation: "unknown", confidence: 0.99, matchedEvidence: [], matchedKeywords: [], matchedExamples: [], matchedMisconceptions: [], completionSatisfied: false, reason: ["explicit_unknown_signal"] };
  const isQuestion = /[?？]|(?:뭐|무엇|어떻게|왜|같은\s*거)/.test(
    input.studentAnswer,
  );
  if (isQuestion) {
    const evaluation = input.previousEvaluation ?? "unknown";
    return {
      evaluation,
      confidence: input.previousEvaluation ? 0.96 : 0.99,
      matchedEvidence: [],
      matchedKeywords: [],
      matchedExamples: [],
      matchedMisconceptions: [],
      completionSatisfied: false,
      reason: [
        input.previousEvaluation
          ? "non_answer_question_carry_forward"
          : "student_question_not_answer",
      ],
    };
  }

  const relatedMisconceptions = input.misconceptionLibrary.filter((item) => item.concepts.some((concept) => input.activeConcept.includes(concept) || concept.includes(input.activeConcept)));
  const matchedMisconceptions = relatedMisconceptions.filter((item) => item.misconceptionPatterns.some((pattern) => includesLoose(answer, pattern)) || item.triggerKeywords.filter((keyword) => includesLoose(answer, keyword)).length >= 2).map(({ id }) => id);
  if (matchedMisconceptions.length) return { evaluation: "misconception", confidence: 0.94, matchedEvidence: [], matchedKeywords: [], matchedExamples: [], matchedMisconceptions: [...new Set(matchedMisconceptions)], completionSatisfied: false, reason: ["misconception_pattern_matched"] };

  const rule = CONCEPT_RULES.find(({ pattern }) => pattern.test(input.activeConcept));
  const matchedKeywords = rule?.keywords.filter((keyword) => includesLoose(answer, keyword)) ?? [];
  const patternMatched = rule?.patterns.some((pattern) => pattern.test(answer)) ?? false;
  const evidence = input.retrievedEvidence.usedEvidence;
  const matchedEvidence = evidence.filter(({ content }) => {
    const tokens = normalize(content).split(" ").filter((token) => token.length >= 2);
    return tokens.some((token) => includesLoose(answer, token));
  }).map(({ id }) => id);
  const matchedExamples = evidence.filter(({ role, content }) => role === "worked_example" && normalize(content).split(" ").some((token) => token.length >= 2 && includesLoose(answer, token))).map(({ id }) => id);
  const shortConcreteCorrect = /^(?:학생|들|둘|두|한\s*단어|다른\s*종류|관형사|수사)$/.test(answer) && (input.dialoguePlan.requiredFocus.includes(input.studentAnswer.trim()) || evidence.some(({ content }) => content.includes(input.studentAnswer.trim())));
  const applicationWrong = /(?:두|세|한)\s*(?:학생|사람)/.test(input.dialoguePlan.requiredFocus) && /^(?:수사|명사|조사)(?:요)?$/.test(answer);

  let evaluation: AnswerEvaluationResult["evaluation"];
  let confidence: number;
  if (applicationWrong) { evaluation = "apply_fail"; confidence = 0.9; reason.push("known_label_but_application_failed"); }
  else if (patternMatched || shortConcreteCorrect || matchedKeywords.length >= 2) { evaluation = "correct"; confidence = Math.min(0.98, 0.82 + matchedKeywords.length * 0.04); reason.push("answer_rule_matched"); }
  else if (matchedKeywords.length === 1 || matchedEvidence.length > 0 || matchedExamples.length > 0) { evaluation = "partial_correct"; confidence = 0.72; reason.push("partial_evidence_matched"); }
  else { evaluation = "unknown"; confidence = 0.58; reason.push("insufficient_rule_evidence"); }

  const completionSatisfied = evaluation === "correct" && input.completionCriteria.length > 0 && (input.dialoguePlan.action === "confirm" || input.dialoguePlan.action === "complete" || input.dialoguePlan.questionPurpose.includes("적용") || matchedExamples.length > 0);
  if (completionSatisfied) reason.push("completion_criterion_supported");
  if (input.workedExampleState && evaluation === "correct") {
    confidence = Math.min(1, confidence + 0.03);
    reason.push("worked_example_success_confidence_bonus");
  }
  if (input.workedExampleState) reason.push("evaluated_inside_worked_example");
  if (input.adaptiveStrategy?.personalized) {
    reason.push(`adaptive_confirmation_${input.adaptiveStrategy.confirmationTurns}`);
    if (evaluation === "partial_correct" && input.adaptiveStrategy.questionType === "short_reason") {
      confidence = Math.min(0.82, confidence + 0.04);
      reason.push("adaptive_partial_free_input_tolerance");
    }
  }
  return { evaluation, confidence, matchedEvidence: [...new Set(matchedEvidence)], matchedKeywords: [...new Set(matchedKeywords)], matchedExamples: [...new Set(matchedExamples)], matchedMisconceptions: [], completionSatisfied, reason };
}

export function getAdaptiveEvaluationPolicy(
  strategy: import("@/lib/adaptive/types").AdaptiveTurnStrategy,
) {
  return {
    confirmationTurns: strategy.confirmationTurns,
    acceptBriefPartialReason: strategy.questionType === "short_reason",
  };
}

export function buildAnswerEvaluationContext(result: AnswerEvaluationResult) {
  return `[규칙 기반 Answer Evaluation — 확정 결과]\n${JSON.stringify(result)}\n학생 답의 정오·부분 정답·오개념 여부를 다시 판단하지 마세요. 이 결과를 그대로 사용해 설명과 다음 질문만 생성하고 내부 근거·confidence·reason을 학생에게 노출하지 마세요.`;
}

export function getEvaluationHintSignal(
  evaluation: AnswerEvaluationResult["evaluation"],
) {
  if (evaluation === "correct") return "reset" as const;
  if (evaluation === "partial_correct") return "hold" as const;
  if (evaluation === "misconception") return "correct_misconception" as const;
  return "escalate" as const;
}

export function getMisconceptionLearningSignal(result: AnswerEvaluationResult) {
  return {
    evaluation: result.evaluation,
    matchedMisconceptions: result.matchedMisconceptions,
    shouldUpdateProfile:
      result.evaluation === "misconception" ||
      result.evaluation === "correct" ||
      result.evaluation === "partial_correct",
  };
}
