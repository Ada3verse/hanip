import type {
  AdaptiveEngineInput,
  AdaptiveLearningStyle,
  AdaptiveProfile,
  AdaptiveQuestionType,
  AdaptiveTurnStrategy,
} from "./types";

function ratio(count: number, total: number) {
  return total ? Number((count / total).toFixed(2)) : 0;
}

function average(values: readonly number[]) {
  return values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
    : 0;
}

function inferStyle({
  choiceRate,
  freeInputRate,
  averageHintLevel,
  exampleSuccessRate,
  masterySpeed,
  averageConfidence,
  observationCount,
}: {
  choiceRate: number;
  freeInputRate: number;
  averageHintLevel: number;
  exampleSuccessRate: number;
  masterySpeed: number;
  averageConfidence: number;
  observationCount: number;
}): AdaptiveLearningStyle {
  if (averageHintLevel >= 2.3 && observationCount >= 2) return "scaffold_needed";
  if (exampleSuccessRate >= 0.6 && observationCount >= 2) return "example_preferred";
  if (choiceRate >= 0.65 && observationCount >= 2) return "choice_preferred";
  if (freeInputRate >= 0.65 && observationCount >= 2) return "free_input_preferred";
  if (masterySpeed >= 12 && averageConfidence >= 0.8) return "concise_preferred";
  return "balanced";
}

function preferredQuestionType(style: AdaptiveLearningStyle): AdaptiveQuestionType {
  if (style === "choice_preferred" || style === "scaffold_needed") return "choice";
  if (style === "free_input_preferred") return "short_reason";
  if (style === "concise_preferred" || style === "example_preferred") return "application";
  return "keyword";
}

export function inferAdaptiveProfile(input: AdaptiveEngineInput): AdaptiveProfile {
  const modes = input.responseModes ?? [];
  const evaluations = input.evaluations ?? [];
  const hints = input.hintStates ?? [];
  const examples = input.workedExamples ?? [];
  const masteries = input.masteryStates ?? [];
  const choiceRate = ratio(modes.filter((mode) => mode === "suggested").length, modes.length);
  const freeInputRate = ratio(modes.filter((mode) => mode === "typed").length, modes.length);
  const averageConfidence = average(evaluations.map(({ confidence }) => confidence));
  const averageHintLevel = average(hints.map(({ hintLevel }) => hintLevel));
  const misconceptionRate = ratio(
    evaluations.filter(({ evaluation }) => evaluation === "misconception").length,
    evaluations.length,
  );
  const completedExamples = examples.filter(({ completedExample }) => completedExample).length;
  const exampleSuccessRate = ratio(completedExamples, examples.length);
  const masterySpeed = evaluations.length
    ? Number((Math.max(0, ...masteries.map(({ masteryScore }) => masteryScore)) / evaluations.length).toFixed(2))
    : 0;
  const reviewed = masteries.filter(({ reviewCount }) => reviewCount > 0);
  const reviewSuccessRate = ratio(
    reviewed.filter(({ needsReview }) => !needsReview).length,
    reviewed.length,
  );
  const observationCount = Math.max(modes.length, evaluations.length, hints.length, examples.length);
  const learningStyle = inferStyle({
    choiceRate,
    freeInputRate,
    averageHintLevel,
    exampleSuccessRate,
    masterySpeed,
    averageConfidence,
    observationCount,
  });
  const styleHistory = [
    ...(input.previous?.styleHistory ?? []),
    ...(input.previous?.learningStyle && input.previous.learningStyle !== learningStyle
      ? [input.previous.learningStyle]
      : []),
    learningStyle,
  ].filter((style, index, values) => values.indexOf(style) === index).slice(-10);
  return {
    studentId: input.studentId ?? input.previous?.studentId ?? "local-session",
    concept: input.concept,
    learningStyle,
    preferredQuestionType: preferredQuestionType(learningStyle),
    preferredHintLevel: input.studentConceptState?.understandingLevel === 1
      ? 3
      : input.studentConceptState?.understandingLevel === 3
        ? 0
        :
      learningStyle === "scaffold_needed"
        ? 3
        : learningStyle === "example_preferred"
          ? 4
          : learningStyle === "concise_preferred"
            ? 0
            : 1,
    needsWorkedExample: (input.studentConceptState?.consecutiveFailures ?? 0) >= 2 ||
      learningStyle === "example_preferred" ||
      (learningStyle === "scaffold_needed" && misconceptionRate >= 0.25),
    freeInputRate,
    choiceRate,
    averageConfidence,
    averageHintLevel,
    misconceptionRate,
    masterySpeed,
    reviewSuccessRate,
    styleHistory,
  };
}

export function createAdaptiveTurnStrategy(profile: AdaptiveProfile): AdaptiveTurnStrategy {
  return {
    personalized: profile.learningStyle !== "balanced",
    questionType: profile.preferredQuestionType,
    includeChoices:
      profile.learningStyle === "choice_preferred" ||
      profile.learningStyle === "scaffold_needed",
    maxExplanationSentences:
      profile.learningStyle === "concise_preferred"
        ? 1
        : profile.learningStyle === "scaffold_needed"
          ? 3
          : 2,
    hintPacing:
      profile.learningStyle === "scaffold_needed"
        ? "supportive"
        : profile.learningStyle === "concise_preferred" ||
            profile.learningStyle === "free_input_preferred"
          ? "slow"
          : "standard",
    workedExampleThreshold: profile.needsWorkedExample ? "early" : "standard",
    confirmationTurns:
      profile.learningStyle === "scaffold_needed" || profile.averageConfidence < 0.6
        ? 2
        : 1,
  };
}

export function buildAdaptiveContext(strategy: AdaptiveTurnStrategy) {
  return `[이번 turn의 Adaptive 지침]\n- questionType: ${strategy.questionType}\n- choices: ${strategy.includeChoices ? "사용 가능" : "자유 입력 우선"}\n- explanation: 최대 ${strategy.maxExplanationSentences}문장\n- confirmation: ${strategy.confirmationTurns}회에 걸쳐 확인\nProfile 전체, learningStyle, internalScore, adaptiveReason, decisionLog는 학생에게 노출하지 마세요.`;
}
