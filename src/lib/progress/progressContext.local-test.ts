import assert from "node:assert/strict";

import {
  applyPriorProgressToStudentModel,
  buildPriorProgressContext,
  findRelevantConceptProgress,
  inferProgressConceptId,
} from "./progressContext";
import type { ConceptProgress, LearningProgress } from "./types";
import type { StudentSessionModel } from "../types/chat";

const concept: ConceptProgress = {
  conceptId: "parts-of-speech-overview",
  conceptName: "품사",
  status: "needs_review",
  masteryScore: 42,
  successfulApplications: 1,
  misconceptionIds: ["meaning-only"],
  needsSupportCount: 3,
  completedSessionCount: 0,
  lastLearningMode: "review",
  lastLearningGoal: "review",
  lastStudiedAt: "2026-07-15T00:00:00.000Z",
};

const progress: LearningProgress = {
  version: 1,
  updatedAt: concept.lastStudiedAt,
  totalSessions: 1,
  concepts: [concept],
};

const emptyModel: StudentSessionModel = {
  currentConcept: "",
  currentFlowStage: "",
  understoodConcepts: [],
  needsSupportConcepts: [],
  misconceptions: [],
  lastEvaluation: null,
  lastNextAction: null,
  confidence: null,
  consecutiveSuggestedReplyUses: 0,
  lastResponseMode: null,
  hintLevel: 0,
  consecutiveUnknownResponses: 0,
  learningStatus: "in_progress",
  completionEvidence: [],
  learningMode: "learn",
  learningGoal: "concept",
  priorProgressLoaded: false,
  priorMasteryScore: null,
  priorConceptStatus: null,
  activePrerequisite: null,
  completedPrerequisites: [],
  prerequisiteReturnConcept: null,
  learningRoute: null,
  suspendedConcept: null,
};

export function runProgressContextLocalTests() {
  assert.equal(inferProgressConceptId("수 관형사"), "numeral-vs-numeral-determiner");
  assert.equal(
    findRelevantConceptProgress(progress, { question: "품사가 뭐예요?" })
      ?.conceptId,
    concept.conceptId,
  );
  const context = buildPriorProgressContext(concept);
  assert.ok(context?.includes("meaning-only"));
  assert.ok(!context?.includes("학생 메시지"));
  const model = applyPriorProgressToStudentModel(emptyModel, concept);
  assert.equal(model.priorConceptStatus, "needs_review");
  assert.deepEqual(model.misconceptions, ["meaning-only"]);
  assert.deepEqual(model.needsSupportConcepts, ["품사"]);
  return true;
}
