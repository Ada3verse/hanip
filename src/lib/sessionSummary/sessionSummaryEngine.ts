import { getDependencyConceptName } from "@/lib/knowledge/dependency";
import { isMastered } from "@/lib/mastery/masteryEngine";
import type { SessionSummaryEngineInput, SummaryState } from "./types";

export const SESSION_END_PATTERN = /(?:오늘(?:은)?\s*(?:끝|여기까지)|여기까지|그만할래|학습\s*끝|종료할래)/;

function unique(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))];
}

function displayConcept(value: string) {
  return getDependencyConceptName(value) || value;
}

export function isSessionEndIntent(message: string) {
  return SESSION_END_PATTERN.test(message.trim());
}

export function createSessionSummary(input: SessionSummaryEngineInput): SummaryState {
  const sessionStart = input.sessionStartedAt && Number.isFinite(Date.parse(input.sessionStartedAt))
    ? Date.parse(input.sessionStartedAt)
    : 0;
  const newMisconceptions = unique(
    (input.misconceptionProfiles ?? [])
      .filter(({ lastOccurred }) => Date.parse(lastOccurred) >= sessionStart)
      .map(({ misconceptionId }) => misconceptionId),
  );
  const resolvedMisconceptions = unique(
    (input.misconceptionProfiles ?? [])
      .filter(({ resolved, resolvedAt }) => resolved && Boolean(resolvedAt) && Date.parse(resolvedAt!) >= sessionStart)
      .map(({ misconceptionId }) => misconceptionId),
  );
  const remainingMisconceptions = unique(
    (input.misconceptionProfiles ?? [])
      .filter(({ resolved }) => !resolved)
      .map(({ misconceptionId }) => misconceptionId),
  );
  const masteredConcepts = unique(
    input.masteryStates.filter(isMastered).map(({ conceptId }) => displayConcept(conceptId)),
  );
  const completedConcepts = unique([
    ...(input.understoodConcepts ?? []),
    ...masteredConcepts,
    ...(input.learningState.completionState.complete
      ? [input.learningState.currentConcept]
      : []),
  ]);
  const misconceptions = unique(
    [...input.evaluationHistory.map(({ misconception }) => misconception), ...remainingMisconceptions],
  );
  const reviewConcepts = unique([
    ...(input.needsSupportConcepts ?? []),
    ...input.masteryStates
      .filter(({ needsReview }) => needsReview)
      .map(({ conceptId }) => displayConcept(conceptId)),
    ...input.evaluationHistory
      .filter(({ evaluation }) =>
        ["misconception", "unknown", "apply_fail"].includes(evaluation),
      )
      .map(({ concept }) => concept),
    ...(input.learningState.review.required
      ? [input.learningState.review.concept ?? input.learningState.currentConcept]
      : []),
  ]).filter((concept) => !masteredConcepts.includes(concept));
  const workedExamplesUsed = unique(
    input.workedExampleStates.map(({ exampleId }) => exampleId),
  );
  const hintUsage = unique(
    input.hintStates.flatMap(({ hintHistory }) => hintHistory).filter((type) => type !== "none"),
  );
  const confidences = input.evaluationHistory.map(({ confidence }) => confidence);
  const averageConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : input.learningState.mastery.confidence;
  const confidenceSummary = averageConfidence >= 0.8
    ? "high"
    : averageConfidence >= 0.6
      ? "medium"
      : "low";
  const routeNext = input.learningState.learningRouteState.remainingConcepts.find(
    (concept) => concept !== input.learningState.learningRouteState.currentConcept,
  );
  const recommendedNextConcept = reviewConcepts[0]
    ? `복습: ${reviewConcepts[0]}`
    : routeNext
      ? displayConcept(routeNext)
      : input.learningState.nextRecommendedConcept
        ? displayConcept(input.learningState.nextRecommendedConcept)
        : "이번 학습 완료";
  const reviewDates = input.masteryStates
    .map(({ nextReviewAt }) => nextReviewAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const now = input.now ?? new Date().toISOString();
  const startedAt = input.sessionStartedAt && Number.isFinite(Date.parse(input.sessionStartedAt))
    ? input.sessionStartedAt
    : now;
  const sessionDuration = Math.max(0, Math.round((Date.parse(now) - Date.parse(startedAt)) / 1000));
  const learned = completedConcepts.length
    ? completedConcepts.slice(0, 3).join(", ")
    : input.learningState.currentConcept;
  const summary = [
    `오늘 배운 개념: ${learned}`,
    `잘 이해한 개념: ${masteredConcepts.slice(0, 3).join(", ") || "확인 중"}`,
    `조금 더 복습할 개념: ${reviewConcepts.slice(0, 3).join(", ") || "없음"}`,
    `가장 많이 헷갈린 개념: ${misconceptions[0] || "없음"}`,
    `다음 추천 학습: ${input.goalState?.nextGoal ?? recommendedNextConcept}${reviewDates[0] ? ` · 복습 예정 ${reviewDates[0].slice(0, 10)}` : ""}`,
  ];
  return {
    completedConcepts,
    reviewConcepts,
    masteredConcepts,
    misconceptions,
    workedExamplesUsed,
    hintUsage,
    confidenceSummary,
    recommendedNextConcept,
    recommendedReviewDate: reviewDates[0] ?? null,
    sessionDuration,
    summary,
    completedGoals: input.goalState?.completedGoals ?? [],
    nextGoal: input.goalState?.nextGoal ?? null,
    missionCompleted: input.goalState?.missionCompleted ?? false,
    newMisconceptions,
    resolvedMisconceptions,
    remainingMisconceptions,
    learningStyleChanges: input.adaptiveProfile?.styleHistory ?? [],
  };
}

export function buildSessionSummaryContext(summary?: SummaryState | null) {
  if (!summary) return "";
  return `[세션 학습 정리 — 내부 전용]\n- summary: ${summary.summary.join(" / ")}\n- reviewConcepts: ${summary.reviewConcepts.join(", ") || "없음"}\n- nextRecommendation: ${summary.recommendedNextConcept}\n학생에게는 5줄 이하로만 정리하고 점수·confidence·내부 reason을 노출하지 마세요.`;
}
