import assert from "node:assert/strict";

import { findMissingPrerequisite } from "./dependencyEngine";

export function runDependencyEngineLocalTests() {
  const base = {
    currentConcept: "수사와 수 관형사",
    studentModel: { completedPrerequisites: [] },
  };
  assert.equal(findMissingPrerequisite(base)?.missingPrerequisite, "morpheme");
  assert.equal(
    findMissingPrerequisite({
      ...base,
      studentModel: {
        completedPrerequisites: [
          "morpheme",
          "word",
          "parts-of-speech-overview",
          "substantive",
        ],
      },
    })?.missingPrerequisite,
    "numeral",
  );
  assert.equal(
    findMissingPrerequisite({
      ...base,
      studentModel: {
        completedPrerequisites: [
          "morpheme",
          "word",
          "parts-of-speech-overview",
          "substantive",
          "numeral",
        ],
      },
    }),
    null,
  );
  return true;
}

