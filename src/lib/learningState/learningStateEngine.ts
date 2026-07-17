import { getConceptDependency, getDependencyConceptName } from "@/lib/knowledge/dependency";
import type { DependencyResult } from "@/lib/knowledge/dependency/types";
import type { ConceptProgress, LearningProgress } from "@/lib/progress/types";
import type {
  LearningGoal,
  LearningMode,
  StudentSessionModel,
  TutorStrategy,
} from "@/lib/types/chat";
import type { LearningState } from "./types";
import {
  createInitialMasteryState,
  isMastered,
} from "@/lib/mastery/masteryEngine";
import type { MasteryState } from "@/lib/mastery/types";
import { createInitialHintState } from "@/lib/hint/hintEngine";
import type { HintState } from "@/lib/hint/types";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import type { GoalState } from "@/lib/goal/types";
import type { AdaptiveProfile } from "@/lib/adaptive/types";
import { getStudentConceptState, isStudentConceptMastered } from "@/lib/studentModel/studentModelEngine";

const CONCEPT_PATTERNS: Array<[RegExp, string]> = [
  [/품사와\s*문장\s*성분/, "parts-of-speech-vs-sentence-component"],
  [/수사와\s*수\s*관형사|수\s*관형사|수관형사/, "numeral-vs-numeral-determiner"],
  [/문장\s*성분/, "sentence-component"], [/형태소/, "morpheme"],
  [/체언/, "substantive"], [/대명사/, "pronoun"], [/명사/, "noun"],
  [/용언/, "predicate"], [/수식언/, "modifier"], [/관계언/, "relational"],
  [/독립언/, "independent"], [/조사/, "particle"], [/수사/, "numeral"],
  [/품사/, "parts-of-speech-overview"], [/단어/, "word"],
];

export function inferLearningConceptId(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return CONCEPT_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function progressForConcept(
  progress: LearningProgress | undefined,
  conceptId: string,
) {
  return progress?.concepts.find(
    (item) =>
      item.conceptId === conceptId ||
      inferLearningConceptId(item.conceptName) === conceptId,
  );
}

function conceptUnderstood(
  id: string,
  model: Partial<StudentSessionModel>,
  progress?: LearningProgress,
) {
  const names = [id, getDependencyConceptName(id)];
  if (model.needsSupportConcepts?.some((item) => names.includes(item))) return false;
  const canonical = getStudentConceptState(model.studentProfile, id);
  if (canonical.understandingLevel > 0 || canonical.evidenceCount > 0) {
    return isStudentConceptMastered(canonical, Boolean(canonical.misconceptionSummary));
  }
  if (model.completedPrerequisites?.includes(id)) return true;
  if (model.understoodConcepts?.some((item) => names.includes(item))) return true;
  return progressForConcept(progress, id)?.status === "understood";
}

function calculateDependency(
  concept: string,
  model: Partial<StudentSessionModel>,
  progress?: LearningProgress,
): DependencyResult | null {
  const route = model.learningRoute;
  if (route) {
    const current = route.route[route.currentIndex];
    if (!current || current === route.targetConcept) return null;
    const item = getConceptDependency(current);
    return item ? {
      missingPrerequisite: item.id,
      bridgeQuestion: item.bridgeQuestion,
      bridgeExplanation: item.bridgeExplanation,
    } : null;
  }
  const active = model.activePrerequisite;
  if (active) {
    const item = getConceptDependency(active);
    return item ? {
      missingPrerequisite: item.id,
      bridgeQuestion: item.bridgeQuestion,
      bridgeExplanation: item.bridgeExplanation,
    } : null;
  }
  const id = inferLearningConceptId(concept) ?? concept;
  const target = getConceptDependency(id);
  const missing = target?.prerequisites.find(
    (prerequisite) => !conceptUnderstood(prerequisite, model, progress),
  );
  const item = missing ? getConceptDependency(missing) : null;
  return item ? {
    missingPrerequisite: item.id,
    bridgeQuestion: item.bridgeQuestion,
    bridgeExplanation: item.bridgeExplanation,
  } : null;
}

function calculateStrategy({
  model, mode, goal, adaptiveLevel, reviewRequired, mastery,
}: {
  model: Partial<StudentSessionModel>;
  mode: LearningMode;
  goal: LearningGoal;
  adaptiveLevel: 1 | 2 | 3;
  reviewRequired: boolean;
  mastery: MasteryState;
}): TutorStrategy {
  const evaluation = model.lastEvaluation;
  if (
    model.learningStatus === "completed" &&
    isMastered(mastery) &&
    (model.understoodConcepts?.length ?? 0) > 0 &&
    (adaptiveLevel === 3 || (model.completionEvidence?.length ?? 0) >= 2) &&
    (model.hintLevel ?? 0) === 0
  ) return "mastery";
  if (mastery.needsReview || reviewRequired) return "review";
  if (evaluation === "unknown" || evaluation === "apply_fail") return "discover";
  if (evaluation === "partial_correct" || (model.hintLevel ?? 0) > 0) return "guide";
  if (evaluation === "misconception") return "review";
  if (evaluation === "correct") return "challenge";
  if (model.priorConceptStatus === "understood") return "challenge";
  if (model.priorConceptStatus === "needs_review") return "review";
  if (model.priorConceptStatus === "learning") return "guide";
  if (mode === "practice") return "challenge";
  if (goal === "review") return "review";
  return "discover";
}

export function determineConceptProgressStatus(
  progress: Omit<ConceptProgress, "status">,
) {
  if (
    (progress.misconceptionIds.length > 0 && progress.needsSupportCount >= 2) ||
    progress.needsSupportCount >= 3
  ) return "needs_review" as const;
  if (
    (progress.mastery ? isMastered(progress.mastery) : progress.masteryScore >= 70) &&
    progress.completedSessionCount > 0 &&
    progress.successfulApplications > 0
  ) return "understood" as const;
  return progress.masteryScore === 0 &&
    progress.completedSessionCount === 0 &&
    progress.needsSupportCount === 0
    ? "not_started" as const
    : "learning" as const;
}

export function calculateLearningState({
  studentModel,
  learningProgress,
  currentConcept,
  learningMode,
  learningGoal,
  adaptiveLevel = 1,
  masteryState,
  hintState,
  workedExampleState,
  goalState,
  adaptiveProfile,
}: {
  studentModel: Partial<StudentSessionModel>;
  learningProgress?: LearningProgress;
  currentConcept?: string;
  learningMode?: LearningMode;
  learningGoal?: LearningGoal;
  adaptiveLevel?: 1 | 2 | 3;
  masteryState?: MasteryState;
  hintState?: HintState;
  workedExampleState?: WorkedExampleState | null;
  goalState?: GoalState | null;
  adaptiveProfile?: AdaptiveProfile | null;
}): LearningState {
  const mode = learningMode ?? studentModel.learningMode ?? "learn";
  const goal = learningGoal ?? studentModel.learningGoal ?? "concept";
  const route = studentModel.learningRoute ?? null;
  const routeCurrent = route?.route[route.currentIndex] ?? null;
  const concept = routeCurrent
    ? getDependencyConceptName(routeCurrent)
    : currentConcept?.trim() || studentModel.currentConcept?.trim() || "국어 문법";
  const conceptId = inferLearningConceptId(concept) ?? concept;
  const progress = progressForConcept(learningProgress, conceptId);
  const canonicalConcept = getStudentConceptState(studentModel.studentProfile, conceptId);
  const canonicalMastered = isStudentConceptMastered(canonicalConcept, Boolean(canonicalConcept.misconceptionSummary));
  const masteryScore = progress?.masteryScore ?? studentModel.priorMasteryScore ?? 0;
  const legacyCompletionVerified =
    studentModel.learningStatus === "completed" &&
    studentModel.lastEvaluation === "correct" &&
    (studentModel.completionEvidence?.length ?? 0) >= 2;
  const canonicalConfidence = canonicalConcept.confidence === "HIGH" ? .9 : canonicalConcept.confidence === "MEDIUM" ? .6 : 0;
  const mastery = masteryState ?? progress?.mastery ?? {
    ...createInitialMasteryState(conceptId),
    masteryScore: canonicalMastered || legacyCompletionVerified ? Math.max(85, masteryScore) : masteryScore,
    confidence: canonicalConcept.evidenceCount > 0 ? canonicalConfidence : legacyCompletionVerified ? Math.max(0.85, studentModel.confidence ?? 0) : studentModel.confidence ?? 0,
    correctStreak: canonicalConcept.evidenceCount > 0 ? canonicalConcept.consecutiveSuccesses : legacyCompletionVerified ? 2 : 0,
    masteredAt: canonicalMastered ? canonicalConcept.updatedAt : legacyCompletionVerified ? new Date().toISOString() : null,
    nextReviewAt: canonicalMastered || legacyCompletionVerified
      ? new Date(Date.now() + 86_400_000).toISOString()
      : null,
  };
  const misconception = canonicalConcept.misconceptionSummary ?? studentModel.misconceptions?.at(-1) ?? "";
  const reviewRequired =
    studentModel.lastEvaluation === "misconception" ||
    (studentModel.needsSupportConcepts?.length ?? 0) > 0 ||
    progress?.status === "needs_review" ||
    mastery.needsReview;
  const effectiveReviewRequired = reviewRequired || canonicalConcept.consecutiveFailures > 0 || Boolean(canonicalConcept.misconceptionSummary);
  const dependencyState = calculateDependency(conceptId, studentModel, learningProgress);
  const status = studentModel.learningStatus ?? "in_progress";
  const effectiveStatus =
    status === "completed" && !isMastered(mastery) ? "in_progress" : status;
  const adaptiveHint =
    hintState ??
    studentModel.hintStates?.[conceptId] ?? {
      ...createInitialHintState(conceptId),
      hintLevel: Math.min(5, studentModel.hintLevel ?? 0) as HintState["hintLevel"],
      lastHintType:
        studentModel.lastEvaluation === "misconception"
          ? "misconception_correction"
          : (studentModel.hintLevel ?? 0) >= 3
            ? "core_criterion"
            : (studentModel.hintLevel ?? 0) === 2
              ? "partial_criterion"
              : (studentModel.hintLevel ?? 0) === 1
                ? "observation"
                : "none",
    };
  const strategy = calculateStrategy({
    model: studentModel,
    mode,
    goal,
    adaptiveLevel,
    reviewRequired: effectiveReviewRequired,
    mastery,
  });
  const reason: string[] = [];
  if (effectiveReviewRequired) reason.push("needs_support");
  if (dependencyState) reason.push("dependency_required");
  if ((studentModel.hintLevel ?? 0) > 0) reason.push(`hint_level_${studentModel.hintLevel}`);
  if (misconception) reason.push("review_after_misconception");
  if (status === "completed" && isMastered(mastery)) reason.push("completion_confirmed");
  if (mastery.needsReview) reason.push("mastery_review_due");
  if (route) reason.push("learning_route_active");
  const workedExample = workedExampleState ?? studentModel.workedExampleStates?.[conceptId] ?? null;
  if (workedExample && !workedExample.completedExample) reason.push("worked_example_active");
  if (workedExample?.completedExample) reason.push("worked_example_return_pending");

  return {
    currentConcept: concept,
    evaluation: studentModel.lastEvaluation ?? null,
    learningStatus: effectiveStatus,
    masteryScore: mastery.masteryScore,
    tutorStrategy: strategy,
    learningMode: mode,
    learningGoal: goal,
    dependencyState,
    learningRouteState: {
      active: Boolean(route),
      targetConcept: route?.targetConcept ?? null,
      currentConcept: routeCurrent,
      remainingConcepts: route?.route.slice(route.currentIndex) ?? [],
      completedConcepts: route?.completedConcepts ?? [],
    },
    hintLevel: Math.min(3, adaptiveHint.hintLevel) as 0 | 1 | 2 | 3,
    misconception,
    completionState: {
      status: effectiveStatus,
      evidence: studentModel.completionEvidence ?? [],
      complete: status === "completed" && isMastered(mastery),
    },
    reviewRequired: effectiveReviewRequired,
    nextRecommendedConcept:
      route?.route[route.currentIndex + 1] ??
      getConceptDependency(conceptId)?.recommendedAfter[0] ?? null,
    reason,
    mastery,
    review: {
      required: effectiveReviewRequired,
      concept: effectiveReviewRequired ? concept : null,
    },
    nextReview: mastery.nextReviewAt,
    recommendedReviewConcept: effectiveReviewRequired ? concept : null,
    hint: adaptiveHint,
    workedExample,
    sessionSummaryReady: effectiveStatus === "completed" || Boolean(route?.completedConcepts.length),
    goal: goalState ?? studentModel.goalState ?? null,
    adaptive: adaptiveProfile ?? studentModel.adaptiveProfile ?? null,
  };
}

export function buildLearningStateContext(state: LearningState) {
  return `[현재 Learning State — 내부 전용]\n${JSON.stringify(state)}\n이 상태가 현재 학습 판단의 유일한 기준입니다. 내부 필드와 reason은 학생에게 노출하지 마세요.`;
}
