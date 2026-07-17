import { classifyUserIntent, createDialoguePlan } from "./dialoguePlanner";
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
  const direct = plan(MODEL, [{ role: "user", content: "명사와 대명사의 차이를 예문 두 개로 설명해줘." }]);
  check(direct.activeConcept === "명사와 대명사" && direct.directAnswerRequired === true && direct.requestedExampleCount === 2 && direct.responseMode === "direct_answer_then_check", "K: explicit comparison overrides route");
  check(classifyUserIntent("명사와 대명사의 차이를 예문 두 개로 설명해줘.").includes("compare_request") && classifyUserIntent("잘 모르겠어").includes("uncertainty_or_confusion"), "L: user intent classification");
  const reexplain = plan({ ...MODEL, consecutiveUnknownResponses: 1 }, [
    { role: "user", content: "명사와 대명사의 차이를 예문 두 개로 설명해줘." },
    { role: "assistant", content: "명사는 이름이고 대명사는 대신하는 말이야." },
    { role: "user", content: "잘 모르겠어" },
  ]);
  check(reexplain.activeConcept === "명사와 대명사" && reexplain.responseMode === "same_concept_reexplain" && reexplain.prerequisiteAllowed === false, "M: first failure stays in concept");
  const bridge = plan({ ...MODEL, consecutiveUnknownResponses: 2 }, [
    { role: "user", content: "명사와 대명사의 차이를 예문 두 개로 설명해줘." },
    { role: "assistant", content: "명사는 이름이고 대명사는 대신하는 말이야." },
    { role: "user", content: "아직도 모르겠어" },
  ]);
  check(bridge.responseMode === "bridge_to_prerequisite" && bridge.prerequisiteAllowed === true && bridge.suspendedConcept === "명사와 대명사", "N: repeated failure allows nearest prerequisite");
  check(direct.teachingLevel === 2 && direct.teachingStrategy === "COMPARE" && /명사는 이름.*대명사는 명사를 대신/.test(direct.teachingGoal ?? ""), "O: comparison teaching goal and default level");
  const particleGoal = plan({ ...MODEL, learningRoute: null }, [{ role: "user", content: "조사가 뭐야?" }]);
  check(particleGoal.teachingStrategy === "DIRECT_EXPLANATION" && /문법적 관계/.test(particleGoal.teachingGoal ?? ""), "P: particle definition teaching goal");
  const pronounNeed = plan({ ...MODEL, learningRoute: null }, [{ role: "user", content: "왜 대명사가 필요해?" }]);
  check(Boolean(pronounNeed.userIntent?.includes("necessity_request")) && /반복을 피하고/.test(pronounNeed.teachingGoal ?? ""), "Q: pronoun necessity teaching goal");
  return 17;
}
