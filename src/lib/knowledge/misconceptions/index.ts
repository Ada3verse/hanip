import { numeralMisconceptions } from "./numeral";
import { partsOfSpeechMisconceptions } from "./partsOfSpeech";
import { particleMisconceptions } from "./particle";
import { sentenceComponentMisconceptions } from "./sentenceComponent";
import type { MisconceptionDefinition, MisconceptionMatch } from "./types";

export const misconceptionLibrary: readonly MisconceptionDefinition[] = [
  ...numeralMisconceptions,
  ...sentenceComponentMisconceptions,
  ...particleMisconceptions,
  ...partsOfSpeechMisconceptions,
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function includesNormalized(text: string, candidate: string) {
  return normalize(text).includes(normalize(candidate));
}

function countOccurrences(
  misconception: MisconceptionDefinition,
  studentMessages: readonly string[],
) {
  return studentMessages.filter((message) =>
    misconception.misconceptionPatterns.some((pattern) =>
      includesNormalized(message, pattern),
    ),
  ).length;
}

export function findRelevantMisconception({
  recentStudentMessage,
  currentConcept = "",
  studentMisconceptions = [],
  studentMessages = [],
}: {
  recentStudentMessage: string;
  currentConcept?: string;
  studentMisconceptions?: readonly string[];
  studentMessages?: readonly string[];
}): MisconceptionMatch | null {
  const knownMisconceptions = studentMisconceptions.join(" ");
  const scored = misconceptionLibrary
    .map((misconception, index) => {
      const patternScore = misconception.misconceptionPatterns.filter(
        (pattern) => includesNormalized(recentStudentMessage, pattern),
      ).length * 10;
      const knownScore =
        includesNormalized(knownMisconceptions, misconception.id) ||
        misconception.misconceptionPatterns.some((pattern) =>
          includesNormalized(knownMisconceptions, pattern),
        )
        ? 6
        : 0;
      const triggerScore = misconception.triggerKeywords.filter((keyword) =>
        includesNormalized(recentStudentMessage, keyword),
      ).length * 2;
      const conceptScore = misconception.concepts.some((concept) =>
        includesNormalized(currentConcept, concept),
      )
        ? 1
        : 0;

      return {
        misconception,
        index,
        score: patternScore + knownScore + triggerScore + conceptScore,
        hasDirectSignal: patternScore > 0 || knownScore > 0,
      };
    })
    .filter(({ hasDirectSignal }) => hasDirectSignal)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const selected = scored[0]?.misconception;

  if (!selected) return null;

  const occurrenceCount = countOccurrences(selected, studentMessages);
  return {
    misconception: selected,
    occurrenceCount,
    useNewCompareExample: occurrenceCount >= 3,
  };
}

export type { MisconceptionDefinition, MisconceptionMatch } from "./types";
