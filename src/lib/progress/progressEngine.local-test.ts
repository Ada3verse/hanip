import {
  createProgressChatHref,
  updateLearningProgress,
} from "./progressEngine";
import type { AiMeta } from "../types/chat";
import type { ConceptProgress, LearningProgress } from "./types";

const NOW = "2026-07-15T00:00:00.000Z";

const assert = {
  equal(actual: unknown, expected: unknown, message: string) {
    if (actual !== expected) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
  },
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message);
  },
  match(value: string, pattern: RegExp, message: string) {
    if (!pattern.test(value)) throw new Error(message);
  },
};

function emptyProgress(): LearningProgress {
  return { version: 1, updatedAt: NOW, totalSessions: 0, concepts: [] };
}

function meta(overrides: Partial<AiMeta> = {}): AiMeta {
  return {
    concept: "품사",
    flowStage: "적용",
    evaluation: "correct",
    nextAction: "확인",
    misconception: "",
    confidence: 1,
    hintLevelUsed: 0,
    learningStatus: "in_progress",
    completionEvidence: [],
    strategy: "guide",
    ...overrides,
  };
}

function apply(
  progress: LearningProgress,
  responseMeta: AiMeta,
  responseMode: "typed" | "suggested" = "typed",
) {
  return updateLearningProgress(progress, {
    meta: responseMeta,
    learningMode: "learn",
    learningGoal: "concept",
    responseMode,
    previousLearningStatus: "in_progress",
    studiedAt: NOW,
  });
}

export function runProgressEngineLocalTests() {
  const correct = apply(emptyProgress(), meta());
  assert.ok(correct.concepts[0].masteryScore > 0, "A: correct increases mastery");

  const firstMisconception = apply(
    emptyProgress(),
    meta({ evaluation: "misconception", misconception: "meaning-only" }),
  );
  const repeatedMisconception = apply(
    firstMisconception,
    meta({ evaluation: "misconception", misconception: "meaning-only" }),
  );
  assert.equal(
    repeatedMisconception.concepts[0].status,
    "needs_review",
    "B: repeated misconception needs review",
  );

  const seeded: LearningProgress = {
    version: 1,
    updatedAt: NOW,
    totalSessions: 0,
    concepts: [{
      ...correct.concepts[0],
      masteryScore: 75,
      mastery: correct.concepts[0].mastery
        ? {
            ...correct.concepts[0].mastery,
            masteryScore: 75,
            correctStreak: 1,
          }
        : undefined,
    }],
  };
  const completed = apply(
    seeded,
    meta({
      learningStatus: "completed",
      completionEvidence: ["판별 기준을 설명함", "새 예문 적용 성공"],
    }),
  );
  assert.ok(
    completed.concepts[0].masteryScore >= 80,
    `C: completion score (${completed.concepts[0].masteryScore})`,
  );
  assert.equal(completed.concepts[0].status, "understood", "C: understood");

  const typed = apply(emptyProgress(), meta(), "typed");
  const suggested = apply(emptyProgress(), meta(), "suggested");
  assert.ok(
    typed.concepts[0].masteryScore > suggested.concepts[0].masteryScore,
    "D: typed correct receives more weight",
  );

  const concept: ConceptProgress = {
    ...correct.concepts[0],
    lastLearningMode: "learn",
    lastLearningGoal: "concept",
  };
  assert.match(
    createProgressChatHref(concept, "review"),
    /mode=review&goal=review(?:&|$)/,
    "G: review link",
  );

  return ["A", "B", "C", "D", "G"];
}
