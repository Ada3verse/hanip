import { createDialoguePlan } from "./dialoguePlanner";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import type { ChatMessage, StudentSessionModel } from "@/lib/types/chat";

const ROUTE = {
  targetConcept: "numeral-vs-numeral-determiner",
  route: ["morpheme", "word", "numeral-vs-numeral-determiner"],
  currentIndex: 0,
  completedConcepts: [],
  startedAt: "2026-07-15T00:00:00.000Z",
};

const MODEL: Partial<StudentSessionModel> = {
  currentConcept: "형태소", learningMode: "learn", learningGoal: "concept",
  learningStatus: "in_progress", hintLevel: 0, learningRoute: ROUTE,
  understoodConcepts: [], needsSupportConcepts: [], misconceptions: [],
  completionEvidence: [], lastEvaluation: null, lastResponseMode: null,
};

function plan(model: Partial<StudentSessionModel>, messages: ChatMessage[] = []) {
  const state = calculateLearningState({ studentModel: model });
  return createDialoguePlan({ learningState: state, studentModel: model, messages });
}

export function runDialoguePlannerLocalTests() {
  const check = (condition: boolean, label: string) => {
    if (!condition) throw new Error(`Dialogue Planner local test failed: ${label}`);
  };
  const active = plan(MODEL);
  check(active.activeConcept === "형태소" && active.action !== "diagnose", "A: route blocks representative diagnosis");
  const unknown = plan({ ...MODEL, lastEvaluation: "unknown", hintLevel: 1 }, [{ role: "user", content: "모르겠어" }]);
  check(unknown.activeConcept === "형태소" && unknown.action === "hint", "B: unknown keeps concept and hints");
  const misconception = plan({ ...MODEL, lastEvaluation: "misconception", hintLevel: 2 });
  check(misconception.action === "hint" && misconception.hintType === "misconception_correction", "C: misconception gets correction hint");
  const suggestedCorrect = plan({ ...MODEL, lastEvaluation: "correct", lastResponseMode: "suggested" });
  check(suggestedCorrect.action === "ask", "D: one choice does not advance");
  const reasonedCorrect = plan({ ...MODEL, lastEvaluation: "correct", lastResponseMode: "typed" });
  check(reasonedCorrect.action === "return_to_route", "E: reasoned correct advances");
  const noRoute = plan({ ...MODEL, learningRoute: null, currentConcept: "품사" });
  check(noRoute.action === "diagnose", "F: diagnosis allowed without route");
  const unrelated = plan(MODEL, [{ role: "user", content: "날씨는 어때?" }]);
  check(unrelated.activeConcept === "형태소", "G: unrelated question returns to active concept");
  const currentWins = plan({ ...MODEL, needsSupportConcepts: ["형태소"], priorConceptStatus: "understood", lastEvaluation: "unknown" });
  check(currentWins.action === "hint", "H: current session wins over progress");
  const repeated = plan({ ...MODEL, lastEvaluation: "unknown" }, [
    { role: "assistant", content: "형태소가 무엇인지 알고 있을까?" },
    { role: "user", content: "몰라" },
  ]);
  check(repeated.reason.includes("avoid_repeating_previous_question"), "I: repeat prevention");
  check(active.maxQuestions === 1, "J: one question maximum");
  return 10;
}
