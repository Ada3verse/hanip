import type { ConceptDependency } from "./types";

export const dependencyGraph: ConceptDependency[] = [
  {
    id: "morpheme",
    prerequisites: [],
    recommendedAfter: ["word"],
    bridgeQuestion: "먼저 단어를 이루는 가장 작은 뜻 단위를 알고 있을까?",
    bridgeExplanation: "형태소는 뜻을 가진 가장 작은 말의 단위야.",
  },
  {
    id: "word",
    prerequisites: ["morpheme"],
    recommendedAfter: ["parts-of-speech-overview"],
    bridgeQuestion: "형태소가 모여 문장에서 홀로 쓰일 수 있는 단위를 무엇이라고 할까?",
    bridgeExplanation: "단어는 홀로 쓰이거나 조사와 결합해 쓰이는 말의 단위야.",
  },
  {
    id: "parts-of-speech-overview",
    prerequisites: ["morpheme", "word"],
    recommendedAfter: ["substantive", "predicate", "modifier", "relational", "independent"],
    bridgeQuestion: "단어를 문법적 성질에 따라 나눈 갈래를 무엇이라고 할까?",
    bridgeExplanation: "품사는 단어를 문법적 성질에 따라 나눈 갈래야.",
  },
  {
    id: "substantive",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview"],
    recommendedAfter: ["noun", "pronoun", "numeral"],
    bridgeQuestion: "명사·대명사·수사처럼 문장에서 몸이 되는 말을 무엇이라고 할까?",
    bridgeExplanation: "체언은 명사·대명사·수사를 묶어 부르는 갈래야.",
  },
  {
    id: "predicate",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview"],
    recommendedAfter: ["verb", "adjective"],
    bridgeQuestion: "동사와 형용사처럼 활용하는 말을 묶어 무엇이라고 할까?",
    bridgeExplanation: "용언은 동사와 형용사를 묶어 부르는 갈래야.",
  },
  {
    id: "modifier",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview"],
    recommendedAfter: ["determiner", "adverb"],
    bridgeQuestion: "다른 말을 꾸며 주는 관형사와 부사를 묶어 무엇이라고 할까?",
    bridgeExplanation: "수식언은 관형사와 부사를 묶어 부르는 갈래야.",
  },
  {
    id: "relational",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview"],
    recommendedAfter: ["particle"],
    bridgeQuestion: "다른 말과의 관계를 나타내는 품사 갈래를 알고 있을까?",
    bridgeExplanation: "관계언은 다른 말과의 관계를 나타내며 조사만 포함해.",
  },
  {
    id: "independent",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview"],
    recommendedAfter: ["interjection"],
    bridgeQuestion: "문장에서 비교적 독립적으로 쓰이는 품사 갈래를 알고 있을까?",
    bridgeExplanation: "독립언은 문장에서 독립적으로 쓰이는 감탄사를 포함해.",
  },
  {
    id: "numeral",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview", "substantive"],
    recommendedAfter: ["numeral-vs-numeral-determiner"],
    bridgeQuestion: "‘두 사람이 왔다’에서 ‘두’는 뒤에서 무엇을 꾸미고 있을까?",
    bridgeExplanation: "수사는 수량이나 순서를 나타내며 체언의 자리를 차지하는 말이야.",
  },
  {
    id: "noun",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview", "substantive"],
    recommendedAfter: ["pronoun", "numeral"],
    bridgeQuestion: "사람·사물·장소·개념의 이름을 나타내는 품사를 알고 있을까?",
    bridgeExplanation: "명사는 사람·사물·장소·개념의 이름을 나타내는 체언이야.",
  },
  {
    id: "pronoun",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview", "substantive", "noun"],
    recommendedAfter: ["numeral"],
    bridgeQuestion: "명사를 대신해 가리키는 체언을 무엇이라고 할까?",
    bridgeExplanation: "대명사는 명사를 대신하여 사람이나 사물을 가리키는 체언이야.",
  },
  {
    id: "numeral-vs-numeral-determiner",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview", "substantive", "numeral"],
    recommendedAfter: ["particle", "sentence-component"],
    bridgeQuestion: "‘두 사람이 왔다’에서 ‘두’는 뒤에서 무엇을 꾸미고 있을까?",
    bridgeExplanation: "수 관형사는 뒤의 명사를 직접 꾸미고, 수사는 체언의 자리를 차지해.",
  },
  {
    id: "particle",
    prerequisites: ["morpheme", "word", "parts-of-speech-overview", "relational"],
    recommendedAfter: ["sentence-component"],
    bridgeQuestion: "‘학생이’의 ‘이’처럼 앞말과 다른 말의 관계를 나타내는 말을 알고 있을까?",
    bridgeExplanation: "조사는 체언 뒤에 붙어 다른 말과의 관계를 나타내는 관계언이야.",
  },
  {
    id: "sentence-component",
    prerequisites: ["word", "parts-of-speech-overview"],
    recommendedAfter: ["parts-of-speech-vs-sentence-component"],
    bridgeQuestion: "문장 안에서 한 단어가 맡는 역할을 무엇이라고 할까?",
    bridgeExplanation: "문장 성분은 문장 안에서 각 말이 맡는 역할이야.",
  },
  {
    id: "parts-of-speech-vs-sentence-component",
    prerequisites: ["parts-of-speech-overview", "sentence-component"],
    recommendedAfter: [],
    bridgeQuestion: "품사는 단어의 종류이고 문장 성분은 무엇을 나타내는지 기억나?",
    bridgeExplanation: "품사는 단어의 종류이고 문장 성분은 문장 안에서 맡는 역할이야.",
  },
];

const CONCEPT_NAMES: Record<string, string> = {
  morpheme: "형태소",
  word: "단어",
  "parts-of-speech-overview": "품사",
  substantive: "체언",
  predicate: "용언",
  modifier: "수식언",
  relational: "관계언",
  independent: "독립언",
  noun: "명사",
  pronoun: "대명사",
  numeral: "수사",
  "numeral-vs-numeral-determiner": "수사와 수 관형사",
  particle: "조사",
  "sentence-component": "문장 성분",
  "parts-of-speech-vs-sentence-component": "품사와 문장 성분",
};

export function getDependencyConceptName(id: string) {
  return CONCEPT_NAMES[id] ?? id;
}

export function getConceptDependency(id: string) {
  return dependencyGraph.find((dependency) => dependency.id === id) ?? null;
}

export type { ConceptDependency, DependencyResult } from "./types";
