import { applyTutorPersona, createTutorPersonaPlan, PERSONA_AVOID_EXPRESSIONS } from "./tutorPersona";
import type { DialogueAction, DialoguePlan } from "@/lib/dialogue/types";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import type { AiEvaluation, ChatMessage, StudentSessionModel } from "@/lib/types/chat";

const BASE_MODEL: Partial<StudentSessionModel> = {
  currentConcept: "수사와 수 관형사", learningMode: "learn", learningGoal: "concept",
  learningStatus: "in_progress", hintLevel: 0, understoodConcepts: [],
  needsSupportConcepts: [], misconceptions: [], completionEvidence: [],
};

function dialogue(action: DialogueAction): DialoguePlan {
  return {
    activeConcept: "수사와 수 관형사", action,
    questionPurpose: "뒤 명사 수식 확인", requiredFocus: "뒤의 명사를 꾸미는지 확인",
    forbiddenTopics: ["품사 정의"], suggestedReplyMode: "choice",
    maxQuestions: 1, reason: [], hintLevel: 0, hintType: "none",
  };
}

function persona(evaluation: AiEvaluation | null, action: DialogueAction, messages: ChatMessage[] = []) {
  const learningState = calculateLearningState({
    studentModel: { ...BASE_MODEL, lastEvaluation: evaluation },
  });
  return createTutorPersonaPlan({ dialoguePlan: dialogue(action), learningState, messages });
}

export function runTutorPersonaLocalTests() {
  const check = (condition: boolean, label: string) => {
    if (!condition) throw new Error(`Tutor Persona local test failed: ${label}`);
  };
  check(persona("correct", "confirm").tone === "encouraging", "A: correct");
  check(persona("partial_correct", "ask").acknowledgeStudent, "B: partial correct");
  check(persona("misconception", "hint").responseShape === "acknowledge_then_question", "C: misconception");
  check(persona("unknown", "hint").tone === "calm", "D: unknown");
  check(persona("apply_fail", "explain").responseShape === "brief_explanation_then_question", "E: apply fail");
  check(persona("unknown", "hint").maxQuestions === 1, "F: hint");
  check(persona(null, "bridge").responseShape === "brief_explanation_then_question", "G: bridge");
  check(persona("correct", "return_to_route").responseShape === "brief_explanation_then_question", "H: return route");
  check(persona("correct", "complete").responseShape === "summary_only", "I: complete");
  const sanitized = applyTutorPersona("완전히 틀렸어. 정답은 이것이야. 확인할까?", persona("misconception", "hint"));
  check(PERSONA_AVOID_EXPRESSIONS.every((item) => !sanitized.includes(item)), "J: forbidden expressions");
  const repeated = persona("unknown", "hint", [{ role: "assistant", content: "조금 더 쉽게 볼게. 앞말을 보자." }]);
  check(!repeated.preferredExpressions.includes("조금 더 쉽게 볼게."), "K: repeated opening");
  const oneQuestion = applyTutorPersona("학생일까? 명사일까?", persona(null, "diagnose"));
  check((oneQuestion.match(/[?？]/g) ?? []).length === 1, "L: one question");
  const plan = dialogue("hint");
  createTutorPersonaPlan({ learningState: calculateLearningState({ studentModel: BASE_MODEL }), dialoguePlan: plan });
  check(plan.activeConcept === "수사와 수 관형사" && plan.requiredFocus === "뒤의 명사를 꾸미는지 확인", "M: concept and focus unchanged");
  return 13;
}
