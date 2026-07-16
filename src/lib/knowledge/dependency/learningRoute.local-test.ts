import {
  advanceLearningRoute,
  createLearningRoute,
} from "./learningRoute";
import type { ConceptDependency } from "./types";

export function runLearningRouteLocalTests() {
  const assert = (condition: boolean, label: string) => {
    if (!condition) throw new Error(`Learning Route local test failed: ${label}`);
  };
  const route = createLearningRoute({
    targetConcept: "수사와 수 관형사",
    studentModel: {},
    startedAt: "2026-07-15T00:00:00.000Z",
  });
  assert(
    JSON.stringify(route?.route) ===
      JSON.stringify([
        "morpheme",
        "word",
        "parts-of-speech-overview",
        "substantive",
        "numeral",
        "numeral-vs-numeral-determiner",
      ]),
    "A: full dependency order",
  );
  const skipped = createLearningRoute({
    targetConcept: "수사와 수 관형사",
    studentModel: {
      completedPrerequisites: ["morpheme", "word"],
    },
  });
  assert(
    skipped?.route[0] === "parts-of-speech-overview",
    "B: understood prerequisites skipped",
  );
  const failed = advanceLearningRoute(route, "형태소", false);
  assert(failed?.currentIndex === 0, "D: failure keeps current index");
  const advanced = advanceLearningRoute(route, "형태소", true);
  assert(advanced?.currentIndex === 1, "C: success advances route");

  const supportOverridesProgress = createLearningRoute({
    targetConcept: "수사와 수 관형사",
    studentModel: { needsSupportConcepts: ["형태소"] },
    learningProgress: {
      version: 1,
      updatedAt: "2026-07-15T00:00:00.000Z",
      totalSessions: 1,
      concepts: [
        {
          conceptId: "morpheme",
          conceptName: "형태소",
          status: "understood",
          masteryScore: 80,
          successfulApplications: 1,
          misconceptionIds: [],
          needsSupportCount: 0,
          completedSessionCount: 1,
          lastLearningMode: "learn",
          lastLearningGoal: "concept",
          lastStudiedAt: "2026-07-15T00:00:00.000Z",
        },
      ],
    },
  });
  assert(
    supportOverridesProgress?.route[0] === "morpheme",
    "H: current support need overrides prior understanding",
  );

  const cyclicGraph: ConceptDependency[] = [
    {
      id: "a",
      prerequisites: ["b"],
      recommendedAfter: [],
      bridgeQuestion: "a?",
      bridgeExplanation: "a",
    },
    {
      id: "b",
      prerequisites: ["a"],
      recommendedAfter: [],
      bridgeQuestion: "b?",
      bridgeExplanation: "b",
    },
  ];
  const cyclic = createLearningRoute({
    targetConcept: "a",
    studentModel: {},
    graph: cyclicGraph,
  });
  assert((cyclic?.route.length ?? 0) <= 2, "G: cycle is bounded");
  return true;
}
