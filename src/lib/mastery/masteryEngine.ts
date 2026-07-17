import {
  MASTERY_REVIEW_INTERVALS,
  type MasteryEngineInput,
  type MasteryState,
} from "./types";
import { isStudentConceptMastered } from "@/lib/studentModel/studentModelEngine";

const DAY_MS = 86_400_000;
const SUCCESS_EVIDENCE = /적용|판별|근거|기준|이유|성공|새 예문|전이/;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addDays(iso: string, days: number) {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

function intervalIndex(interval: number) {
  const exact = MASTERY_REVIEW_INTERVALS.indexOf(
    interval as (typeof MASTERY_REVIEW_INTERVALS)[number],
  );
  return exact < 0 ? 0 : exact;
}

export function createInitialMasteryState(
  conceptId: string,
  now = new Date().toISOString(),
): MasteryState {
  return {
    conceptId,
    masteryScore: 0,
    confidence: 0,
    correctStreak: 0,
    lastReviewedAt: now,
    needsReview: false,
    reviewCount: 0,
    masteredAt: null,
    reviewInterval: 1,
    nextReviewAt: null,
  };
}

export function calculateMastery(input: MasteryEngineInput): MasteryState {
  const now = input.now ?? new Date().toISOString();
  const previous = input.previous ?? createInitialMasteryState(input.conceptId, now);
  const confidence = clamp(input.evaluationConfidence, 0, 1);
  const confidenceFactor = 0.75 + confidence * 0.5;
  const correct = input.evaluation === "correct";
  const partial = input.evaluation === "partial_correct";
  const failed = ["misconception", "unknown", "apply_fail"].includes(
    input.evaluation,
  );
  const evidenceCount = (input.completionEvidence ?? []).filter((item) =>
    SUCCESS_EVIDENCE.test(item),
  ).length;
  const correctStreak = correct
    ? Math.max(previous.correctStreak + 1, Math.min(2, evidenceCount))
    : partial
      ? previous.correctStreak
      : 0;
  const streakBonus = correct ? Math.min(8, Math.max(0, correctStreak - 1) * 3) : 0;
  const baseDelta = correct
    ? input.workedExampleSuccess ? 3 : 10
    : partial
      ? 4
      : input.evaluation === "misconception"
        ? -10
        : input.evaluation === "apply_fail"
          ? -7
          : -5;
  const preparationScore =
    previous.masteryScore === 0 &&
    evidenceCount >= 2 &&
    correct
      ? 75
      : previous.masteryScore;
  let masteryScore = clamp(
    Math.round(preparationScore + baseDelta * confidenceFactor + streakBonus),
    0,
    100,
  );
  const recentMisconception =
    input.evaluation === "misconception" ||
    (input.matchedMisconceptions?.length ?? 0) > 0;
  const unresolvedMisconception = (input.misconceptionProfiles ?? []).some(
    (profile) => profile.concept === input.conceptId && !profile.resolved,
  );
  if (unresolvedMisconception && masteryScore > 69) masteryScore = 69;
  const canonicalMasterySatisfied = input.studentConceptState
    ? isStudentConceptMastered(input.studentConceptState, unresolvedMisconception)
    : null;
  if (canonicalMasterySatisfied) masteryScore = Math.max(80, masteryScore);
  const masteryFormulaSatisfied =
    masteryScore >= 80 &&
    confidence >= 0.75 &&
    correctStreak >= 2 &&
    !recentMisconception && !unresolvedMisconception;
  const mastered = masteryFormulaSatisfied && (
    canonicalMasterySatisfied ?? true
  );
  const wasMastered = previous.masteredAt !== null;
  const wasDue =
    previous.nextReviewAt !== null && Date.parse(previous.nextReviewAt) <= Date.parse(now);
  let reviewInterval = previous.reviewInterval || 1;
  if (wasMastered && correct) {
    reviewInterval = MASTERY_REVIEW_INTERVALS[
      Math.min(
        MASTERY_REVIEW_INTERVALS.length - 1,
        intervalIndex(reviewInterval) + 1,
      )
    ];
  } else if (wasMastered && failed) {
    reviewInterval = MASTERY_REVIEW_INTERVALS[
      Math.max(0, intervalIndex(reviewInterval) - 1)
    ];
  }
  const masteredAt = mastered ? previous.masteredAt ?? now : wasMastered ? previous.masteredAt : null;
  const needsReview =
    (wasMastered && failed) || recentMisconception || unresolvedMisconception || (!correct && wasDue);

  return {
    conceptId: input.conceptId,
    masteryScore,
    confidence,
    correctStreak,
    lastReviewedAt: now,
    needsReview,
    reviewCount: previous.reviewCount + (wasMastered || wasDue ? 1 : 0),
    masteredAt,
    reviewInterval,
    nextReviewAt: masteredAt ? addDays(now, reviewInterval) : null,
  };
}

export function isMastered(state: MasteryState) {
  return (
    state.masteryScore >= 80 &&
    state.confidence >= 0.75 &&
    state.correctStreak >= 2 &&
    state.masteredAt !== null &&
    !state.needsReview
  );
}

export function getMasteryHintPreference(state: MasteryState) {
  if (state.needsReview) return "worked_example" as const;
  if (state.masteryScore >= 80) return "minimal" as const;
  return "standard" as const;
}

export function buildMasteryContext(state: MasteryState) {
  return `[현재 Mastery — 내부 전용]\n- mastery: ${state.masteryScore}\n- review 필요: ${state.needsReview}\n- 다음 복습: ${state.nextReviewAt ?? "없음"}\n점수, streak, interval과 내부 계산은 학생에게 노출하지 마세요.`;
}

export function getMasterySummaryEvidence(states: readonly MasteryState[]) {
  return {
    masteredConcepts: states.filter(isMastered).map(({ conceptId }) => conceptId),
    reviewConcepts: states.filter(({ needsReview }) => needsReview).map(({ conceptId }) => conceptId),
    recommendedReviewDate: states
      .map(({ nextReviewAt }) => nextReviewAt)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null,
  };
}

export function getGoalMasteryContribution(state: MasteryState) {
  return Math.round(Math.min(40, Math.max(0, state.masteryScore * 0.4)));
}

export function masteryUsesAdaptiveStyleDirectly() {
  return false;
}
