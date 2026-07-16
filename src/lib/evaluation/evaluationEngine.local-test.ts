import { misconceptionLibrary } from "@/lib/knowledge/misconceptions";
import type { DialoguePlan } from "@/lib/dialogue/types";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import { evaluateStudentAnswer } from "./evaluationEngine";

function check(condition: boolean, message: string) { if (!condition) throw new Error(`Evaluation test failed: ${message}`); }
const plan = (action: DialoguePlan["action"] = "ask", focus = "품사의 판단 기준"): DialoguePlan => ({ activeConcept: "품사", action, questionPurpose: action === "confirm" ? "새 문장 적용" : "판단 기준 확인", requiredFocus: focus, forbiddenTopics: [], suggestedReplyMode: "choice", maxQuestions: 1, reason: [], hintLevel: 0, hintType: "none" });
const evidence: KnowledgeEvidenceBundle = { reason: [], selectedSources: [], usedEvidence: [
  { id: "definition", role: "definition", content: "품사는 단어를 문법적 성질에 따라 나눈 종류이다." },
  { id: "example", role: "worked_example", content: "새 가방에서 새는 가방을 꾸민다." },
] };
const evaluate = (studentAnswer: string, dialoguePlan = plan(), activeConcept = "품사") => evaluateStudentAnswer({ studentAnswer, activeConcept, dialoguePlan, retrievedEvidence: evidence, misconceptionLibrary, completionCriteria: ["새 문장에 판단 기준 적용"] });

export function runEvaluationEngineLocalTests() {
  const correct = evaluate("품사는 단어의 종류예요."); check(correct.evaluation === "correct" && correct.confidence >= 0.8, "correct and confidence");
  check(evaluate("단어요.").evaluation === "partial_correct", "partial correct");
  const misconception = evaluate("생김새가 다르면 품사가 달라요."); check(misconception.evaluation === "misconception" && misconception.matchedMisconceptions.length > 0, "misconception pattern");
  check(evaluate("잘 모르겠어").evaluation === "unknown", "unknown");
  const applicationPlan = { ...plan("ask", "‘두 학생’의 ‘두’ 품사 적용"), activeConcept: "수사와 수 관형사" };
  check(evaluate("수사요", applicationPlan, "수사와 수 관형사").evaluation === "apply_fail", "apply fail");
  const completion = evaluate("단어의 종류이고 새 가방의 새는 가방을 꾸며요", plan("confirm")); check(completion.completionSatisfied, "completion");
  check(correct.matchedKeywords.includes("단어") && correct.matchedEvidence.includes("definition"), "keyword and evidence");
  const example = evaluate("새 가방에서 새가 가방을 꾸며요", plan("confirm")); check(example.matchedExamples.includes("example"), "example match");
  check(evaluate("품사는 단어를 문법적 성질에 따라 나눈 갈래예요").reason.includes("answer_rule_matched"), "answer pattern");
}
