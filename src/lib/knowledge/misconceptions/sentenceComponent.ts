import type { MisconceptionDefinition } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "parts-of-speech-equals-sentence-component",
    concepts: ["품사", "문장 성분"],
    triggerKeywords: ["품사", "문장 성분", "같은"],
    misconceptionPatterns: ["품사와 문장 성분은 같은", "품사가 문장 성분", "둘이 같은 개념"],
    correctionStrategy:
      "둘 다 문법 분류라는 관련성을 인정하고, 품사는 단어의 종류이며 문장 성분은 문장 안의 역할임을 같은 단어의 역할 변화로 구분한다.",
    compareExamples: ["학생이 웃는다/학생을 만난다", "꽃이 예쁘다/예쁜 꽃"],
    nextQuestionStyle: "같은 단어가 두 문장에서 맡는 역할을 비교하는 질문",
    completionCondition: "단어의 종류와 문장 안의 역할을 서로 구분한다.",
  },
  {
    id: "all-modifiers-are-modifier-parts-of-speech",
    concepts: ["관형사", "부사", "관형어", "부사어", "문장 성분"],
    triggerKeywords: ["꾸며", "관형사", "부사", "관형어", "부사어"],
    misconceptionPatterns: ["꾸며 주면 모두 관형사", "꾸미면 다 부사", "관형어는 관형사"],
    correctionStrategy:
      "꾸미는 기능을 찾은 점을 인정하고, 품사와 문장 성분을 구분한 뒤 원래 단어와 활용 여부를 확인하게 한다.",
    compareExamples: ["새 가방/예쁜 가방", "매우 빠르다/빠르게 달린다"],
    nextQuestionStyle: "꾸미는 말의 기본형이나 활용 여부를 하나 확인하는 질문",
    completionCondition: "꾸미는 기능만으로 품사를 확정하지 않고 형태를 함께 확인한다.",
  },
] as const;
export const sentenceComponentMisconceptions = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly MisconceptionDefinition[];
