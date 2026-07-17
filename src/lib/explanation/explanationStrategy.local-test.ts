import { createEmptyRuntimeStudentModel, getStudentConceptState, recordExplanation } from "@/lib/studentModel/studentModelEngine";
import { selectExplanationPlan } from "./explanationStrategy";

function check(value: unknown, label: string) { if (!value) throw new Error(`Explanation Strategy local test failed: ${label}`); }

export function runExplanationStrategyLocalTests() {
  let model = createEmptyRuntimeStudentModel();
  const strategies = new Set<string>(); const examples = new Set<string>(); const questions = new Set<string>();
  for (let turn = 0; turn < 5; turn += 1) {
    const plan = selectExplanationPlan({ concept: "명사와 대명사", confidence: "LOW", understandingLevel: 1, consecutiveFailures: turn, history: model.explanationHistory });
    strategies.add(plan.strategy); if (plan.exampleId) examples.add(plan.exampleId); questions.add(plan.checkQuestion);
    model = recordExplanation({ model, concept: plan.concept, strategy: "DIRECT_EXPLANATION", explanationStrategy: plan.strategy, exampleIds: plan.exampleId ? [plan.exampleId] : [], message: plan.example ?? "", now: `2026-01-01T00:00:0${turn}.000Z` });
  }
  check(strategies.size >= 4, "A five repetitions use at least four strategies");
  check(examples.size === 5, "B examples do not repeat");
  check(questions.size >= 4, "C questions do not repeat mechanically");
  const failed = selectExplanationPlan({ concept: "명사", confidence: "LOW", understandingLevel: 1, misconception: "기능과 의미 혼동", consecutiveFailures: 3, history: [] });
  check(["analogy", "step_by_step", "visualization", "counterexample"].includes(failed.strategy), "D repeated failure changes strategy");
  const high = selectExplanationPlan({ concept: "명사", confidence: "HIGH", understandingLevel: 3, consecutiveFailures: 0, history: [] });
  check(["quiz", "direct_application", "student_explanation"].includes(high.strategy) && high.depth === 5, "E student model controls depth");
  check(getStudentConceptState(model, "명사와 대명사").understandingLevel === 0, "F strategy history does not mutate understanding");
  return 6;
}
