import { getConceptQuestionAndReplies } from "@/lib/testing/mockChatResponse";

export function runQuestionUxLocalTests() {
  const check = (condition: boolean, label: string) => {
    if (!condition) throw new Error(`Question UX local test failed: ${label}`);
  };
  const parts = getConceptQuestionAndReplies("parts-of-speech-overview");
  check(/사람|예쁘다|빨리/.test(parts.question), "H: explicit answer target");
  const numeral = getConceptQuestionAndReplies("numeral-vs-numeral-determiner");
  check(/두.*학생|꾸미는 말/.test(numeral.question), "I: focus in question");
  check(!/이 질문에서 가장 궁금한 말|어떻게 생각해|무엇을 알겠어/.test(parts.question), "J: vague question blocked");
  check(numeral.replies.includes("학생") && parts.replies.includes("다른 종류"), "K: concept replies");
  check(!parts.replies.includes("응") && !parts.replies.includes("아니"), "L: no yes-no for non-binary wording");
  const repeated = getConceptQuestionAndReplies("numeral-vs-numeral-determiner", 1);
  check(JSON.stringify(repeated.replies) !== JSON.stringify(numeral.replies), "M: repeated replies changed");
  const reason = getConceptQuestionAndReplies("numeral-vs-numeral-determiner", 2);
  check(reason.replies.length === 0 && /기준/.test(reason.question), "N: reason uses free input");
  check((numeral.question.match(/[?？]/g) ?? []).length === 1, "O: one question");
  return 8;
}
