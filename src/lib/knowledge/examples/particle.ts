import type { WorkedExample } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "particle-ending-attached-word",
    concept: "조사와 어미",
    relatedMisconception: ["particle-equals-ending"],
    difficulty: 1,
    sentenceA: "학생이 웃는다.",
    sentenceB: "학생은 웃었다.",
    focusPoint: "조사는 체언 뒤에, 어미는 용언 어간 뒤에 붙음",
    expectedObservation: "이와 은은 학생 뒤에, 는다와 었다는 웃다의 어간 뒤에 붙는다.",
    followUpQuestion: "‘학생이’의 ‘이’는 어떤 종류의 말 뒤에 붙었을까?",
  },
  {
    id: "particle-separate-function",
    concept: "조사와 단어",
    relatedMisconception: ["particle-is-not-a-word"],
    difficulty: 2,
    sentenceA: "학생이 왔다.",
    sentenceB: "학생을 만났다.",
    focusPoint: "조사가 체언에 붙어 서로 다른 문법 관계를 나타냄",
    expectedObservation: "이와 을은 붙여 쓰지만 각각 주어와 목적어 관계를 나타낸다.",
    followUpQuestion: "‘이’와 ‘을’이 문장에서 더하는 기능은 서로 같을까?",
  },
  {
    id: "particle-ending-apply",
    concept: "조사와 어미",
    relatedMisconception: ["particle-equals-ending"],
    difficulty: 3,
    sentenceA: "책도 읽었다.",
    sentenceB: "책을 읽고 잤다.",
    focusPoint: "새 문장에서 조사와 연결 어미를 결합 대상 기준으로 판별",
    expectedObservation: "도와 을은 책 뒤의 조사이고 고는 읽- 뒤의 어미이다.",
    followUpQuestion: "‘도’와 ‘고’를 구분한 기준을 한 문장으로 설명해 볼래?",
  },
] as const;
export const particleExamples = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly WorkedExample[];
