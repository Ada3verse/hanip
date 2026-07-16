import type { MisconceptionDefinition } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "parts-of-speech-by-appearance",
    concepts: ["품사", "형태"],
    triggerKeywords: ["생김새", "모양", "길이"],
    misconceptionPatterns: [
      "생김새가 다르면 품사가 다르",
      "생김새가 다르면 품사가 다른",
      "모양이 다르면 품사가 다르",
    ],
    correctionStrategy:
      "단어의 겉모양에 주목한 점을 먼저 인정하고, 형태는 글자 모양이 아니라 활용 여부라는 점을 짧게 구분한다.",
    compareExamples: ["사람/학교", "예쁘다/예쁜"],
    nextQuestionStyle: "두 단어가 활용하는지 관찰하게 하는 비교 질문",
    completionCondition: "형태를 글자 모양이 아니라 활용 여부로 설명한다.",
  },
  {
    id: "parts-of-speech-by-meaning-only",
    concepts: ["품사", "분류 기준", "의미"],
    triggerKeywords: ["뜻", "의미", "같은 품사"],
    misconceptionPatterns: ["뜻이 같으면 같은 품사", "의미만 보면", "뜻으로 품사"],
    correctionStrategy:
      "의미를 살핀 점을 인정하되 의미만으로 확정하지 않고 형태와 기능을 함께 확인하도록 안내한다.",
    compareExamples: ["새 가방/가방이 새롭다", "빨리/빠르다"],
    nextQuestionStyle: "의미가 비슷한 두 말의 형태나 기능을 하나만 비교하는 질문",
    completionCondition: "의미와 함께 형태 또는 기능을 판별 근거로 사용한다.",
  },
  {
    id: "form-means-spelling-change",
    concepts: ["품사", "형태", "활용"],
    triggerKeywords: ["글자", "철자", "모양", "형태가 변"],
    misconceptionPatterns: ["형태가 변한다는 건 글자", "글자 모양이 바뀌", "단어 길이가 달라"],
    correctionStrategy:
      "형태 변화가 글자 장식이나 길이 변화가 아니라 문법적 활용임을 용언의 실제 변화로 보여 준다.",
    compareExamples: ["먹다/먹고/먹었다", "예쁘다/예쁜/예뻐서"],
    nextQuestionStyle: "기본형이 문장 속에서 활용하는지 확인하는 짧은 질문",
    completionCondition: "활용형을 보고 형태가 변하는 품사임을 판단한다.",
  },
] as const;
export const partsOfSpeechMisconceptions = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly MisconceptionDefinition[];
