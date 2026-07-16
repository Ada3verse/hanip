import type { AiMeta, LearningGoal, LearningMode, StudentResponseMode } from "@/lib/types/chat";
import type { ConceptProgress, LearningProgress } from "@/lib/progress/types";
import { determineConceptProgressStatus } from "@/lib/learningState/learningStateEngine";
import { calculateMastery, isMastered } from "@/lib/mastery/masteryEngine";

export type ProgressUpdate = {
  meta: AiMeta;
  learningMode: LearningMode;
  learningGoal: LearningGoal;
  responseMode: StudentResponseMode;
  previousLearningStatus: "in_progress" | "ready_to_complete" | "completed";
  startsNewSession?: boolean;
  studiedAt?: string;
};

const APPLICATION_EVIDENCE_PATTERN =
  /적용|새로운|새 예문|처음 보는|전이|판별 성공|문제.*성공/;

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value));
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function getConceptId(conceptName: string) {
  const normalized = conceptName.trim();
  if (/수사.*관형사|관형사.*수사/.test(normalized)) {
    return "numeral-vs-numeral-determiner";
  }
  if (normalized.includes("품사")) return "parts-of-speech-overview";
  return normalized
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "unknown-concept";
}

function evaluationScore(
  evaluation: AiMeta["evaluation"],
  responseMode: StudentResponseMode,
) {
  if (evaluation === "correct") return responseMode === "suggested" ? 6 : 10;
  if (evaluation === "partial_correct") {
    return responseMode === "suggested" ? 3 : 5;
  }
  if (evaluation === "misconception") return -8;
  if (evaluation === "apply_fail") return -5;
  return -3;
}

function hasApplicationEvidence(evidence: string[]) {
  return evidence.some((item) => APPLICATION_EVIDENCE_PATTERN.test(item));
}

export function updateLearningProgress(
  current: LearningProgress,
  update: ProgressUpdate,
): LearningProgress {
  const conceptName = update.meta.concept.trim() || "국어 문법";
  const conceptId = getConceptId(conceptName);
  const existing = current.concepts.find((item) => item.conceptId === conceptId);
  const studiedAt = update.studiedAt ?? new Date().toISOString();
  const evidence = unique(update.meta.completionEvidence);
  const applicationSucceeded =
    update.meta.evaluation === "correct" && hasApplicationEvidence(evidence);
  const mastery = update.meta.mastery ?? calculateMastery({
    conceptId,
    evaluation: update.meta.evaluation,
    evaluationConfidence:
      update.responseMode === "suggested"
        ? update.meta.confidence * 0.75
        : update.meta.confidence,
    previous: existing?.mastery,
    completionEvidence: evidence,
    matchedMisconceptions: update.meta.misconception
      ? [update.meta.misconception]
      : [],
    now: studiedAt,
  });
  const completedNow =
    update.meta.learningStatus === "completed" &&
    update.previousLearningStatus !== "completed" &&
    evidence.length >= 2 &&
    applicationSucceeded &&
    isMastered(mastery);
  const supportAdded = [
    "partial_correct",
    "misconception",
    "apply_fail",
    "unknown",
  ].includes(update.meta.evaluation)
    ? 1
    : 0;
  const misconceptionIds = unique([
    ...(existing?.misconceptionIds ?? []),
    update.meta.misconception,
  ]).slice(-20);
  const legacyScoreDelta = evaluationScore(
    update.meta.evaluation,
    update.responseMode,
  );
  const nextWithoutStatus: Omit<ConceptProgress, "status"> = {
    conceptId,
    conceptName,
    masteryScore: clampScore(
      update.meta.mastery
        ? mastery.masteryScore
        : Math.max(
            mastery.masteryScore,
            (existing?.masteryScore ?? 0) + legacyScoreDelta,
          ),
    ),
    successfulApplications:
      (existing?.successfulApplications ?? 0) +
      (applicationSucceeded ? 1 : 0),
    misconceptionIds,
    needsSupportCount: (existing?.needsSupportCount ?? 0) + supportAdded,
    completedSessionCount:
      (existing?.completedSessionCount ?? 0) + (completedNow ? 1 : 0),
    lastLearningMode: update.learningMode,
    lastLearningGoal: update.learningGoal,
    lastStudiedAt: studiedAt,
    mastery,
  };
  const nextConcept: ConceptProgress = {
    ...nextWithoutStatus,
    status: determineConceptProgressStatus(nextWithoutStatus),
  };

  return {
    version: 1,
    updatedAt: studiedAt,
    totalSessions: current.totalSessions + (update.startsNewSession ? 1 : 0),
    concepts: [
      ...current.concepts.filter((item) => item.conceptId !== conceptId),
      nextConcept,
    ].slice(-100),
  };
}

export function createProgressChatHref(
  concept: ConceptProgress,
  action: "continue" | "review" | "practice",
) {
  const mode =
    action === "review"
      ? "review"
      : action === "practice"
        ? "practice"
        : concept.lastLearningMode;
  const goal =
    action === "review"
      ? "review"
      : action === "practice"
        ? "practice"
        : concept.lastLearningGoal;
  return `/chat?concept=${encodeURIComponent(concept.conceptName)}&q=${encodeURIComponent(concept.conceptName)}&mode=${mode}&goal=${goal}&startType=resume_progress`;
}
