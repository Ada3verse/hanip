import type { WorkedExample } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "numeral-observe-modified-noun",
    concept: "수사와 수 관형사",
    relatedMisconception: ["numeral-determiner-follows-numeral"],
    difficulty: 1,
    sentenceA: "학생이 둘 왔다.",
    sentenceB: "두 학생이 왔다.",
    focusPoint: "수 표현이 뒤의 명사를 직접 꾸미는지",
    expectedObservation: "두는 학생을 꾸미지만 둘은 체언의 자리를 차지한다.",
    followUpQuestion: "‘두 학생’에서 ‘두’가 직접 꾸미는 말은 무엇일까?",
  },
  {
    id: "numeral-compare-particle",
    concept: "수사와 수 관형사",
    relatedMisconception: ["all-number-expressions-are-numerals"],
    difficulty: 2,
    sentenceA: "사과 하나를 먹었다.",
    sentenceB: "한 사람을 만났다.",
    focusPoint: "조사 결합과 뒤 명사 수식의 차이",
    expectedObservation: "하나는 조사와 결합하고 한은 사람을 직접 꾸민다.",
    followUpQuestion: "‘하나’가 수사라고 판단할 수 있는 근거는 무엇일까?",
  },
  {
    id: "numeral-apply-order-expression",
    concept: "수사와 수 관형사",
    relatedMisconception: ["numeral-by-memorized-form"],
    difficulty: 3,
    sentenceA: "내가 첫째다.",
    sentenceB: "첫 번째 학생이다.",
    focusPoint: "새로운 순서 표현에 기존 판별 기준 적용",
    expectedObservation: "첫째는 체언 자리에 있고 첫은 번째를 꾸민다.",
    followUpQuestion: "두 표현을 구분할 때 사용한 기준을 짧게 설명해 볼래?",
  },
] as const;
export const numeralExamples = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly WorkedExample[];
