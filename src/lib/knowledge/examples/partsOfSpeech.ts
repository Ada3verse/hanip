import type { WorkedExample } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "pos-observe-basic-words",
    concept: "품사",
    relatedMisconception: ["parts-of-speech-by-appearance"],
    difficulty: 1,
    sentenceA: "사람",
    sentenceB: "예쁘다",
    focusPoint: "두 말이 나타내는 대상과 문장에서 하는 일",
    expectedObservation: "사람은 이름을, 예쁘다는 성질을 나타낸다.",
    followUpQuestion: "‘사람’과 ‘예쁘다’는 문장에서 같은 일을 할까?",
  },
  {
    id: "pos-compare-inflection",
    concept: "품사",
    relatedMisconception: ["form-means-spelling-change"],
    difficulty: 2,
    sentenceA: "학생이 책을 읽는다.",
    sentenceB: "학생이 책을 읽었다.",
    focusPoint: "용언의 활용과 단순한 글자 모양 변화의 차이",
    expectedObservation: "읽다는 문장에 맞게 읽는다와 읽었다로 활용한다.",
    followUpQuestion: "두 문장에서 형태가 변한 기본형은 무엇일까?",
  },
  {
    id: "pos-apply-form-function-meaning",
    concept: "품사",
    relatedMisconception: ["parts-of-speech-by-meaning-only"],
    difficulty: 3,
    sentenceA: "새 가방을 샀다.",
    sentenceB: "가방이 새롭다.",
    focusPoint: "뜻이 관련되어도 형태와 기능에 따라 품사가 달라짐",
    expectedObservation: "새는 명사를 꾸미고, 새롭다는 활용하며 서술한다.",
    followUpQuestion: "‘새’와 ‘새롭다’를 구분할 기준 하나를 말해 볼래?",
  },
] as const;
export const partsOfSpeechExamples = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly WorkedExample[];
