import { getConceptId } from "@/lib/progress/progressEngine";
import type { ConceptProgress, LearningProgress } from "@/lib/progress/types";
import type { StudentSessionModel } from "@/lib/types/chat";
import { determineConceptProgressStatus } from "@/lib/learningState/learningStateEngine";

export type ProgressLookupInput = {
  concept?: string | null;
  question?: string | null;
  currentConcept?: string | null;
};

const CONCEPT_PATTERNS: Array<{ pattern: RegExp; conceptId: string }> = [
  {
    pattern: /수사와\s*수\s*관형사|수\s*관형사|수관형사/,
    conceptId: "numeral-vs-numeral-determiner",
  },
  { pattern: /수사/, conceptId: "numeral-vs-numeral-determiner" },
  { pattern: /품사/, conceptId: "parts-of-speech-overview" },
  { pattern: /문장\s*성분/, conceptId: "sentence-component" },
  { pattern: /조사/, conceptId: "particle" },
];

export function inferProgressConceptId(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  return (
    CONCEPT_PATTERNS.find(({ pattern }) => pattern.test(normalized))
      ?.conceptId ?? getConceptId(normalized)
  );
}

export function findRelevantConceptProgress(
  progress: LearningProgress,
  input: ProgressLookupInput,
) {
  const candidates = [input.concept, input.question, input.currentConcept]
    .map(inferProgressConceptId)
    .filter((value): value is string => Boolean(value));

  for (const conceptId of candidates) {
    const exact = progress.concepts.find(
      (concept) => concept.conceptId === conceptId,
    );
    if (exact) return exact;
    const related = progress.concepts.find(
      (concept) => inferProgressConceptId(concept.conceptName) === conceptId,
    );
    if (related) return related;
  }
  return null;
}

export function buildPriorProgressContext(progress: ConceptProgress | null) {
  if (!progress) return null;
  return [
    `[이전 학습 진행도]`,
    `- 개념명: ${progress.conceptName}`,
    `- 현재 상태: ${progress.status}`,
    `- 이해 점수: ${progress.masteryScore}`,
    `- 대표 오개념 ID: ${progress.misconceptionIds.join(", ") || "없음"}`,
    `- 지원 필요 횟수: ${progress.needsSupportCount}`,
    `- 적용 성공 횟수: ${progress.successfulApplications}`,
    `- 완료 세션 수: ${progress.completedSessionCount}`,
    `- 마지막 학습 방식: ${progress.lastLearningMode}`,
    `- 마지막 학습 목표: ${progress.lastLearningGoal}`,
    `- 마지막 학습 시각: ${progress.lastStudiedAt}`,
  ].join("\n").slice(0, 2_000);
}

function addUnique(values: string[], additions: string[]) {
  return [...new Set([...values, ...additions].filter(Boolean))];
}

export function applyPriorProgressToStudentModel(
  model: StudentSessionModel,
  progress: ConceptProgress | null,
): StudentSessionModel {
  if (!progress) {
    return {
      ...model,
      priorProgressLoaded: false,
      priorMasteryScore: null,
      priorConceptStatus: null,
    };
  }

  const resolvedStatus = determineConceptProgressStatus(progress);
  const understood = resolvedStatus === "understood";
  const needsSupport =
    resolvedStatus === "learning" || resolvedStatus === "needs_review";
  return {
    ...model,
    understoodConcepts: addUnique(
      model.understoodConcepts,
      understood ? [progress.conceptName] : [],
    ),
    needsSupportConcepts: addUnique(
      model.needsSupportConcepts,
      needsSupport ? [progress.conceptName] : [],
    ),
    misconceptions: addUnique(
      model.misconceptions,
      progress.misconceptionIds,
    ),
    priorProgressLoaded: true,
    priorMasteryScore: progress.masteryScore,
    priorConceptStatus: resolvedStatus,
  };
}
