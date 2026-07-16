import type { DependencyResult } from "./types";
import type { LearningProgress } from "@/lib/progress/types";
import type { StudentSessionModel } from "@/lib/types/chat";
import { calculateLearningState, inferLearningConceptId } from "@/lib/learningState/learningStateEngine";

export function inferDependencyConceptId(value: string | null | undefined) {
  return inferLearningConceptId(value);
}

export function findMissingPrerequisite({
  currentConcept,
  studentModel,
  learningProgress,
  misconception = "",
}: {
  currentConcept: string;
  studentModel: Partial<StudentSessionModel>;
  learningProgress?: LearningProgress;
  misconception?: string;
}): DependencyResult | null {
  return calculateLearningState({
    studentModel: {
      ...studentModel,
      misconceptions: misconception
        ? [...(studentModel.misconceptions ?? []), misconception]
        : studentModel.misconceptions,
    },
    learningProgress,
    currentConcept,
  }).dependencyState;
}
