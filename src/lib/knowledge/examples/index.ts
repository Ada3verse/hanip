import { numeralExamples } from "./numeral";
import { particleExamples } from "./particle";
import { partsOfSpeechExamples } from "./partsOfSpeech";
import { sentenceComponentExamples } from "./sentenceComponent";
import type {
  ExampleDifficulty,
  WorkedExample,
  WorkedExampleMatch,
} from "./types";

export const workedExampleLibrary: readonly WorkedExample[] = [
  ...numeralExamples,
  ...sentenceComponentExamples,
  ...particleExamples,
  ...partsOfSpeechExamples,
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function isRelatedConcept(currentConcept: string, exampleConcept: string) {
  const current = normalize(currentConcept);
  const example = normalize(exampleConcept);
  return current.includes(example) || example.includes(current);
}

function wasExampleUsed(example: WorkedExample, messages: readonly string[]) {
  return messages.some(
    (message) =>
      message.includes(example.sentenceA) || message.includes(example.sentenceB),
  );
}

export function deriveAdaptiveLevel({
  hintLevel = 0,
  lastEvaluation,
}: {
  hintLevel?: 0 | 1 | 2 | 3;
  lastEvaluation?: string | null;
}): ExampleDifficulty {
  if (hintLevel >= 2 || lastEvaluation === "misconception" || lastEvaluation === "apply_fail") {
    return 1;
  }
  if (lastEvaluation === "correct") return 3;
  if (lastEvaluation === "partial_correct") return 2;
  return 1;
}

export function findRelevantWorkedExample({
  currentConcept,
  misconceptionId = "",
  hintLevel = 0,
  adaptiveLevel,
  conversationMessages = [],
}: {
  currentConcept: string;
  misconceptionId?: string;
  hintLevel?: 0 | 1 | 2 | 3;
  adaptiveLevel?: ExampleDifficulty;
  conversationMessages?: readonly string[];
}): WorkedExampleMatch | null {
  const targetDifficulty =
    adaptiveLevel ?? deriveAdaptiveLevel({ hintLevel, lastEvaluation: null });
  const exactConceptMatches = workedExampleLibrary.filter(
    (example) => normalize(currentConcept) === normalize(example.concept),
  );
  const conceptMatches =
    exactConceptMatches.length > 0
      ? exactConceptMatches
      : workedExampleLibrary.filter((example) =>
          isRelatedConcept(currentConcept, example.concept),
        );
  const misconceptionMatches = misconceptionId
    ? conceptMatches.filter((example) =>
        example.relatedMisconception.includes(misconceptionId),
      )
    : [];
  const unusedRelatedCandidates = misconceptionMatches.filter(
    (example) => !wasExampleUsed(example, conversationMessages),
  );
  const unusedConceptCandidates = conceptMatches.filter(
    (example) => !wasExampleUsed(example, conversationMessages),
  );
  const unusedCandidates =
    unusedRelatedCandidates.length > 0
      ? unusedRelatedCandidates
      : unusedConceptCandidates;

  if (unusedCandidates.length === 0) return null;

  const example = [...unusedCandidates].sort(
    (left, right) =>
      Math.abs(left.difficulty - targetDifficulty) -
        Math.abs(right.difficulty - targetDifficulty) ||
      left.difficulty - right.difficulty,
  )[0];

  return example ? { example, adaptiveLevel: targetDifficulty } : null;
}

export type {
  ExampleDifficulty,
  WorkedExample,
  WorkedExampleMatch,
} from "./types";
