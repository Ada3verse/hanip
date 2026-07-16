import {
  dependencyGraph,
  getConceptDependency,
  getDependencyConceptName,
} from "./index";
import { inferDependencyConceptId } from "./dependencyEngine";
import type { ConceptDependency } from "./types";
import type { LearningProgress } from "@/lib/progress/types";
import type { StudentSessionModel } from "@/lib/types/chat";

export interface LearningRoute {
  targetConcept: string;
  route: string[];
  currentIndex: number;
  completedConcepts: string[];
  startedAt: string;
}

function toConceptId(value: string) {
  return inferDependencyConceptId(value) ?? value;
}

function collectDependencyPath(
  conceptId: string,
  graph: ConceptDependency[],
  visiting: Set<string>,
  visited: Set<string>,
  path: string[],
) {
  if (visited.has(conceptId)) return;
  if (visiting.has(conceptId)) return;
  visiting.add(conceptId);
  const dependency = graph.find(({ id }) => id === conceptId);
  for (const prerequisite of dependency?.prerequisites ?? []) {
    collectDependencyPath(prerequisite, graph, visiting, visited, path);
  }
  visiting.delete(conceptId);
  visited.add(conceptId);
  path.push(conceptId);
}

function isConceptUnderstood(
  conceptId: string,
  studentModel: Partial<StudentSessionModel>,
  learningProgress?: LearningProgress,
) {
  const conceptName = getDependencyConceptName(conceptId);
  const needsSupport = studentModel.needsSupportConcepts?.some(
    (value) => toConceptId(value) === conceptId || value === conceptName,
  );
  if (needsSupport) return false;
  if (studentModel.completedPrerequisites?.includes(conceptId)) return true;
  if (
    studentModel.understoodConcepts?.some(
      (value) => toConceptId(value) === conceptId || value === conceptName,
    )
  ) return true;
  return learningProgress?.concepts.some(
    (concept) =>
      concept.status === "understood" &&
      (concept.conceptId === conceptId ||
        toConceptId(concept.conceptName) === conceptId),
  ) ?? false;
}

export function createLearningRoute({
  targetConcept,
  studentModel,
  learningProgress,
  graph = dependencyGraph,
  startedAt = new Date().toISOString(),
}: {
  targetConcept: string;
  studentModel: Partial<StudentSessionModel>;
  learningProgress?: LearningProgress;
  graph?: ConceptDependency[];
  startedAt?: string;
}): LearningRoute | null {
  const targetId = toConceptId(targetConcept);
  if (!graph.some(({ id }) => id === targetId)) return null;
  const fullPath: string[] = [];
  collectDependencyPath(
    targetId,
    graph,
    new Set(),
    new Set(),
    fullPath,
  );
  const uniquePath = [...new Set(fullPath)];
  const route = uniquePath.filter(
    (conceptId) =>
      conceptId === targetId ||
      !isConceptUnderstood(conceptId, studentModel, learningProgress),
  );
  if (!route.includes(targetId)) route.push(targetId);
  if (route.length <= 1) return null;
  return {
    targetConcept: targetId,
    route,
    currentIndex: 0,
    completedConcepts: [],
    startedAt,
  };
}

export function getCurrentRouteConcept(route: LearningRoute | null) {
  return route?.route[route.currentIndex] ?? null;
}

export function advanceLearningRoute(
  route: LearningRoute | null,
  concept: string,
  succeeded: boolean,
) {
  if (!route || !succeeded) return route;
  const current = getCurrentRouteConcept(route);
  if (!current || toConceptId(concept) !== current) return route;
  const completedConcepts = [...new Set([
    ...route.completedConcepts,
    current,
  ])];
  const nextIndex = route.currentIndex + 1;
  if (nextIndex >= route.route.length) return null;
  return {
    ...route,
    currentIndex: nextIndex,
    completedConcepts,
  };
}

export function getLearningRouteContext(route: LearningRoute | null) {
  if (!route) return "";
  const current = getCurrentRouteConcept(route);
  return `[현재 학습 경로]
- 최종 목표: ${getDependencyConceptName(route.targetConcept)}
- 현재 확인 중인 개념: ${current ? getDependencyConceptName(current) : "없음"}
- 완료한 선수 개념: ${route.completedConcepts.map(getDependencyConceptName).join(", ") || "없음"}
- 남은 경로: ${route.route
    .slice(route.currentIndex)
    .map(getDependencyConceptName)
    .join(" → ")}
이 경로는 내부 진행 정보입니다. 객체명, 인덱스, 배열 구조를 학생에게 노출하지 마세요.`;
}

export function getRouteBridge(route: LearningRoute | null) {
  const current = getCurrentRouteConcept(route);
  return current ? getConceptDependency(current) : null;
}

