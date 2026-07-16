import {
  classifyQaIssues,
  inspectConversationQaTurn,
  progressWasReflected,
  routeAdvancedWithoutEvidence,
  runConversationQaScenario,
} from "./conversationQa";
import type { ConversationQaIssue, ConversationQaScenario } from "./types";
import type { ChatApiResponse } from "@/lib/types/chat";

const SCENARIO: ConversationQaScenario = {
  id: "local", title: "local", startQuestion: "품사가 뭐야?", mode: "learn", goal: "concept",
  studentTurns: [], expected: {
    activeConceptMustRemain: "품사", requiredFocusKeywords: ["사람"],
    maxAssistantSentences: 3, maxQuestionsPerTurn: 1,
    forbidRepeatedOpening: true, forbidRepeatedSuggestedReplies: true,
  },
};

function response(message: string, replies: string[] = [], activeConcept = "품사"): ChatApiResponse {
  return {
    message, suggestedReplies: replies,
    meta: {
      concept: activeConcept, flowStage: "진단", evaluation: "unknown",
      nextAction: "확인", misconception: "", confidence: 1, learningStatus: "in_progress",
      completionEvidence: [], strategy: "discover",
      dialoguePlan: { activeConcept, action: "diagnose", questionPurpose: "확인", requiredFocus: "사람 비교", suggestedReplyMode: "choice", hintLevel: 0, hintType: "none" },
    },
  };
}

function inspect(value: ChatApiResponse, previousResponse = "", previousReplies: string[] = []) {
  const issues: ConversationQaIssue[] = [];
  inspectConversationQaTurn({ scenario: SCENARIO, issues, turn: 1, response: value, previousResponse, previousReplies });
  return issues;
}

export function runConversationQaLocalTests() {
  const check = (condition: boolean, label: string) => {
    if (!condition) throw new Error(`Conversation QA local test failed: ${label}`);
  };
  check(inspect(response("어떻게 생각해?")).some(({ code }) => code === "QUESTION_AMBIGUOUS"), "A: ambiguous");
  check(inspect(response("사람일까? 단어일까?")).some(({ code }) => code === "QUESTION_COUNT_EXCEEDED"), "B: question count");
  check(inspect(response("사람을 볼까?", [], "형태소")).some(({ code }) => code === "ACTIVE_CONCEPT_DRIFT"), "C: drift");
  check(inspect(response("같은 시작 문구를 반복하며 사람을 볼까?"), "같은 시작 문구를 반복하며 앞을 봤어.").some(({ code }) => code === "REPEATED_OPENING"), "D: opening");
  check(inspect(response("사람을 볼까?", ["같아", "달라"]), "", ["같아", "달라"]).some(({ code }) => code === "REPEATED_SUGGESTED_REPLIES"), "E: replies");
  check(inspect(response("사람의 종류를 말해 볼래?", ["응", "아니"])).some(({ code }) => code === "GENERIC_YES_NO_REPLIES"), "F: generic yes-no");
  check(inspect(response("Learning State를 보고 사람을 고를까?")).some(({ code }) => code === "INTERNAL_TERM_EXPOSED"), "G: internal term");
  check(routeAdvancedWithoutEvidence(0, 1, false), "H: route evidence");
  const newResult = runConversationQaScenario({ ...SCENARIO, startType: "new", previousMessages: [{ role: "assistant", content: "이전" }], expected: { ...SCENARIO.expected, mustNotRestorePreviousMessages: true } });
  check(!newResult.transcript.some(({ content }) => content === "이전"), "I: new session");
  check(!progressWasReflected("처음부터 정의를 말할게."), "J: progress ignored");
  check(classifyQaIssues([]) === "pass", "K: pass");
  check(classifyQaIssues([{ code: "QUESTION_AMBIGUOUS", turn: 1, message: "w" }, { code: "INTERNAL_TERM_EXPOSED", turn: 1, message: "f" }]) === "fail", "L: fail priority");
  return 12;
}
