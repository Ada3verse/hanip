import {
  CONCEPT_PROGRESS_STATUSES,
} from "@/lib/progress/types";
import type { ConceptProgress, LearningProgress } from "@/lib/progress/types";
import { LEARNING_GOALS, LEARNING_MODES } from "@/lib/types/chat";
import { LocalLearningRepository } from "@/lib/repository/localLearningRepository";
import { getLocalLearningRepository } from "@/lib/repository/repositoryFactory";
import { getAuthSession } from "@/lib/auth/authSession";

export const HANIP_LEARNING_PROGRESS_STORAGE_KEY =
  "HANIP_LEARNING_PROGRESS_V1";

const MAX_CONCEPTS = 100;
const MAX_MISCONCEPTIONS = 20;
const MAX_STRING_LENGTH = 200;

export function createEmptyLearningProgress(): LearningProgress {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    totalSessions: 0,
    concepts: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isConceptProgress(value: unknown): value is ConceptProgress {
  if (!isRecord(value)) return false;
  return (
    typeof value.conceptId === "string" &&
    value.conceptId.length > 0 &&
    value.conceptId.length <= MAX_STRING_LENGTH &&
    typeof value.conceptName === "string" &&
    value.conceptName.length > 0 &&
    value.conceptName.length <= MAX_STRING_LENGTH &&
    CONCEPT_PROGRESS_STATUSES.some((status) => status === value.status) &&
    typeof value.masteryScore === "number" &&
    Number.isFinite(value.masteryScore) &&
    value.masteryScore >= 0 &&
    value.masteryScore <= 100 &&
    isNonNegativeInteger(value.successfulApplications) &&
    Array.isArray(value.misconceptionIds) &&
    value.misconceptionIds.length <= MAX_MISCONCEPTIONS &&
    value.misconceptionIds.every(
      (item) => typeof item === "string" && item.length <= MAX_STRING_LENGTH,
    ) &&
    isNonNegativeInteger(value.needsSupportCount) &&
    isNonNegativeInteger(value.completedSessionCount) &&
    LEARNING_MODES.some((mode) => mode === value.lastLearningMode) &&
    LEARNING_GOALS.some((goal) => goal === value.lastLearningGoal) &&
    typeof value.lastStudiedAt === "string" &&
    !Number.isNaN(Date.parse(value.lastStudiedAt)) &&
    (!("mastery" in value) || isMasteryState(value.mastery))
  );
}

function isMasteryState(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    typeof value.conceptId === "string" &&
    typeof value.masteryScore === "number" && value.masteryScore >= 0 && value.masteryScore <= 100 &&
    typeof value.confidence === "number" && value.confidence >= 0 && value.confidence <= 1 &&
    isNonNegativeInteger(value.correctStreak) &&
    typeof value.lastReviewedAt === "string" && !Number.isNaN(Date.parse(value.lastReviewedAt)) &&
    typeof value.needsReview === "boolean" &&
    isNonNegativeInteger(value.reviewCount) &&
    (value.masteredAt === null || (typeof value.masteredAt === "string" && !Number.isNaN(Date.parse(value.masteredAt)))) &&
    typeof value.reviewInterval === "number" && [1, 3, 7, 14, 30].includes(value.reviewInterval) &&
    (value.nextReviewAt === null || (typeof value.nextReviewAt === "string" && !Number.isNaN(Date.parse(value.nextReviewAt))))
  );
}

function mergeConcepts(concepts: ConceptProgress[]) {
  const merged = new Map<string, ConceptProgress>();
  for (const concept of concepts.slice(-MAX_CONCEPTS)) {
    const previous = merged.get(concept.conceptId);
    if (!previous) {
      merged.set(concept.conceptId, concept);
      continue;
    }
    const latest =
      Date.parse(concept.lastStudiedAt) >= Date.parse(previous.lastStudiedAt)
        ? concept
        : previous;
    merged.set(concept.conceptId, {
      ...latest,
      masteryScore: Math.max(previous.masteryScore, concept.masteryScore),
      successfulApplications: Math.max(
        previous.successfulApplications,
        concept.successfulApplications,
      ),
      misconceptionIds: [...new Set([
        ...previous.misconceptionIds,
        ...concept.misconceptionIds,
      ])].slice(-MAX_MISCONCEPTIONS),
      needsSupportCount: Math.max(
        previous.needsSupportCount,
        concept.needsSupportCount,
      ),
      completedSessionCount: Math.max(
        previous.completedSessionCount,
        concept.completedSessionCount,
      ),
    });
  }
  return [...merged.values()].slice(-MAX_CONCEPTS);
}

export function sanitizeLearningProgress(
  progress: LearningProgress,
): LearningProgress {
  return {
    version: 1,
    updatedAt: Number.isNaN(Date.parse(progress.updatedAt))
      ? new Date().toISOString()
      : progress.updatedAt,
    totalSessions: Math.max(0, Math.trunc(progress.totalSessions)),
    concepts: mergeConcepts(progress.concepts).map((concept) => ({
      ...concept,
      conceptId: concept.conceptId.slice(0, MAX_STRING_LENGTH),
      conceptName: concept.conceptName.slice(0, MAX_STRING_LENGTH),
      masteryScore: Math.min(100, Math.max(0, concept.masteryScore)),
      misconceptionIds: [...new Set(concept.misconceptionIds)]
        .slice(-MAX_MISCONCEPTIONS)
        .map((item) => item.slice(0, MAX_STRING_LENGTH)),
    })),
  };
}

function isLearningProgress(value: unknown): value is LearningProgress {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt)) &&
    isNonNegativeInteger(value.totalSessions) &&
    Array.isArray(value.concepts) &&
    value.concepts.length <= MAX_CONCEPTS &&
    value.concepts.every(isConceptProgress)
  );
}

function repositoryFor(storage?: Storage) {
  return storage ? new LocalLearningRepository(storage) : getLocalLearningRepository();
}

function userIdFor(storage?: Storage) {
  return storage ? "test-user" : getAuthSession().getRequiredUser().id;
}

export function loadLearningProgress(storage?: Storage) {
  const repository = repositoryFor(storage);
  const progress = repository.loadUserDataSync(userIdFor(storage))?.progress;
  return progress && isLearningProgress(progress)
    ? sanitizeLearningProgress(progress)
    : createEmptyLearningProgress();
}

export function saveLearningProgress(
  progress: LearningProgress,
  storage?: Storage,
) {
  const repository = repositoryFor(storage);
  const userId = userIdFor(storage);
  const data = repository.loadUserDataSync(userId);
  const sanitized = sanitizeLearningProgress(progress);
  if (data) repository.saveUserDataSync(userId, { ...data, progress: sanitized });
  return sanitized;
}

export function clearLearningProgress(storage?: Storage) {
  const repository = repositoryFor(storage);
  const userId = userIdFor(storage);
  const data = repository.loadUserDataSync(userId);
  if (data) repository.saveUserDataSync(userId, { ...data, progress: createEmptyLearningProgress() });
}
