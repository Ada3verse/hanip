import type { WorkedExample } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "sentence-role-same-noun",
    concept: "품사와 문장 성분",
    relatedMisconception: ["parts-of-speech-equals-sentence-component"],
    difficulty: 1,
    sentenceA: "학생이 웃는다.",
    sentenceB: "나는 학생을 만났다.",
    focusPoint: "같은 명사가 문장에 따라 다른 문장 성분이 됨",
    expectedObservation: "학생은 두 문장 모두 명사지만 주어와 목적어 역할은 다르다.",
    followUpQuestion: "두 문장의 ‘학생’은 품사는 같고 역할은 다를까?",
  },
  {
    id: "sentence-modifier-form",
    concept: "관형사와 관형어",
    relatedMisconception: ["all-modifiers-are-modifier-parts-of-speech"],
    difficulty: 2,
    sentenceA: "새 가방을 샀다.",
    sentenceB: "예쁜 가방을 샀다.",
    focusPoint: "관형사와 형용사의 활용형이 모두 관형어가 될 수 있음",
    expectedObservation: "새는 관형사이고 예쁜은 형용사의 활용형이지만 둘 다 관형어이다.",
    followUpQuestion: "‘예쁜’의 기본형을 찾으면 품사를 구분하는 데 어떤 도움이 될까?",
  },
  {
    id: "sentence-apply-category-role",
    concept: "품사와 문장 성분",
    relatedMisconception: ["parts-of-speech-equals-sentence-component"],
    difficulty: 3,
    sentenceA: "꽃이 아름답다.",
    sentenceB: "아름다운 꽃이 피었다.",
    focusPoint: "형용사의 품사와 서술어·관형어 역할 구분",
    expectedObservation: "아름답다는 형용사이며 활용형에 따라 문장 역할이 달라진다.",
    followUpQuestion: "품사는 유지되지만 문장 성분이 달라지는 이유를 말해 볼래?",
  },
] as const;
export const sentenceComponentExamples = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly WorkedExample[];
