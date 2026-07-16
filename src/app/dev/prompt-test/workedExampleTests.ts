export const WORKED_EXAMPLE_SELECTION_CASES = [
  {
    concept: "품사",
    evaluation: "unknown",
    expectedExampleId: "pos-observe-basic-words",
    expectedDifficulty: 1,
  },
  {
    concept: "수사와 수 관형사",
    evaluation: "unknown",
    expectedExampleId: "numeral-observe-modified-noun",
    expectedDifficulty: 1,
  },
  {
    concept: "품사와 문장 성분",
    evaluation: "unknown",
    expectedExampleId: "sentence-role-same-noun",
    expectedDifficulty: 1,
  },
  {
    concept: "조사와 어미",
    evaluation: "unknown",
    expectedExampleId: "particle-ending-attached-word",
    expectedDifficulty: 1,
  },
] as const;

export const WORKED_EXAMPLE_DIFFICULTY_CASES = [
  { evaluation: "unknown", expectedDifficulty: 1 },
  { evaluation: "partial_correct", expectedDifficulty: 2 },
  { evaluation: "correct", expectedDifficulty: 3 },
] as const;

export const WORKED_EXAMPLE_DUPLICATE_CASE = {
  concept: "수사와 수 관형사",
  previouslyUsedSentences: ["학생이 둘 왔다.", "두 학생이 왔다."],
  excludedExampleId: "numeral-observe-modified-noun",
  expectedNextExampleId: "numeral-compare-particle",
} as const;
