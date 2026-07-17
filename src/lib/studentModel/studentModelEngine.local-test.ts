import { createEmptyRuntimeStudentModel, getStudentConceptState, isStudentConceptMastered, normalizeRuntimeStudentModel, recordExplanation, updateRuntimeStudentModel } from "./studentModelEngine";

function check(value: unknown, message: string) { if (!value) throw new Error(`Student Model test failed: ${message}`); }

export function runStudentModelTests() {
  const t = "2026-01-01T00:00:00.000Z";
  let model = createEmptyRuntimeStudentModel(t);
  model = updateRuntimeStudentModel({ previous: model, studentAnswer: "명사는 이름을 나타내는 말이기 때문이에요.", concept: "명사", evaluation: "correct", now: t });
  const nounBefore = getStudentConceptState(model, "명사");
  model = updateRuntimeStudentModel({ previous: model, studentAnswer: "잘 모르겠어요.", concept: "형태소", evaluation: "unknown", now: t });
  check(getStudentConceptState(model, "명사").understandingLevel === nounBefore.understandingLevel, "A concept isolation");
  check(getStudentConceptState(model, "형태소").confidence === "LOW", "B confidence low");
  model = updateRuntimeStudentModel({ previous: model, studentAnswer: "학생들을 학생+들을로 나눌 수 없어.", concept: "형태소", evaluation: "misconception", now: t });
  check(getStudentConceptState(model, "형태소").misconceptionSummary === "형태소 분리 기준 이해 부족", "C misconception summary");
  model = updateRuntimeStudentModel({ previous: model, studentAnswer: "학생 + 들입니다. 둘 다 뜻이 있기 때문이에요.", concept: "형태소", evaluation: "correct", now: t });
  check(!model.masteredConcepts.includes("형태소"), "D one success is not mastery");
  model = updateRuntimeStudentModel({ previous: model, studentAnswer: "책 + 들입니다. 각각 뜻이 있기 때문이에요.", concept: "형태소", evaluation: "correct", hasUnresolvedMisconception: false, now: t });
  const resolved = { ...getStudentConceptState(model, "형태소"), misconceptionSummary: undefined };
  model = { ...model, concepts: { ...model.concepts, 형태소: resolved } };
  check(isStudentConceptMastered(resolved, false), "E protected mastery predicate");
  model = recordExplanation({ model, concept: "형태소", strategy: "EXAMPLE", message: "‘학생들’은 ‘학생’과 ‘들’로 나뉘어.", now: t });
  const once = model.explanationHistory.length;
  model = recordExplanation({ model, concept: "형태소", strategy: "EXAMPLE", message: "‘학생들’은 ‘학생’과 ‘들’로 나뉘어.", now: t });
  check(model.explanationHistory.length === once, "F duplicate explanation blocked");
  for (let index = 0; index < 35; index += 1) model = recordExplanation({ model, concept: "형태소", strategy: "EXAMPLE", message: `‘예시${index}’를 확인해.`, now: t });
  check(model.explanationHistory.length === 30, "G history bounded");
  const normalized = normalizeRuntimeStudentModel(JSON.parse(JSON.stringify(model)), t);
  check(JSON.stringify(normalized.concepts) === JSON.stringify(model.concepts), "H serialization restore");
  return 8;
}
