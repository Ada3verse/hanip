import type { AuthoringConcept, ConceptCoverage } from "./types";

export function calculateConceptCoverage(concept: AuthoringConcept): ConceptCoverage {
  const values: Record<string, [number, number]> = {
    definitions: [Object.values(concept.definition).filter(Boolean).length, 3], coreUnderstanding: [concept.coreUnderstanding.length, 1],
    discriminationRules: [concept.discriminationRules.length, 1], originalExamples: [concept.examples.filter(({ isOriginal }) => isOriginal).length, 6],
    counterexamples: [concept.counterexamples.length, 2], misconceptions: [concept.misconceptions.length, 3], checks: [concept.checks.length, 5],
    workedExamples: [concept.workedExamples.length, 2], completionCriteria: [concept.completionCriteria.length, 1], provenance: [concept.provenanceIds.length, 1],
  };
  const roles = Object.fromEntries(Object.entries(values).map(([key, [current, required]]) => [key, { current, required, complete: current >= required }]));
  const score = Math.round(Object.values(roles).reduce((sum, item) => sum + Math.min(item.current / item.required, 1), 0) / Object.keys(roles).length * 100);
  return { conceptId: concept.conceptId, score, roles };
}
