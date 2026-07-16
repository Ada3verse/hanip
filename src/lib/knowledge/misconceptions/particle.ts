import type { MisconceptionDefinition } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "particle-equals-ending",
    concepts: ["조사", "어미", "형태소"],
    triggerKeywords: ["조사", "어미", "붙", "같아"],
    misconceptionPatterns: ["조사와 어미는 같", "둘 다 붙으니까 같", "조사도 어미"],
    correctionStrategy:
      "다른 말에 붙는 공통점을 인정하고, 조사는 주로 체언 뒤에, 어미는 용언의 어간 뒤에 붙는 차이를 비교한다.",
    compareExamples: ["학생이/먹는다", "책을/예쁘다"],
    nextQuestionStyle: "붙어 있는 앞말이 체언인지 용언 어간인지 고르는 질문",
    completionCondition: "조사와 어미가 결합하는 앞말의 종류를 구분한다.",
  },
  {
    id: "particle-is-not-a-word",
    concepts: ["조사", "단어", "형태소"],
    triggerKeywords: ["혼자", "단어가 아니", "조사", "붙여"],
    misconceptionPatterns: ["조사는 혼자 못 쓰니까 단어가 아니", "붙여 쓰니까 단어가 아니", "조사는 단어가 아니"],
    correctionStrategy:
      "혼자 쓰기 어렵다는 관찰을 인정하고, 학교 문법에서는 자립성뿐 아니라 분리성과 문법 기능을 고려해 조사를 단어로 다룸을 짧게 안내한다.",
    compareExamples: ["학생/이", "책/을"],
    nextQuestionStyle: "체언과 조사를 나누어 각각의 기능을 확인하는 질문",
    completionCondition: "조사가 체언에 붙지만 별도의 문법 기능을 하는 단어임을 설명한다.",
  },
] as const;
export const particleMisconceptions = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly MisconceptionDefinition[];
