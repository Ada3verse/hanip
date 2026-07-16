import type { MisconceptionDefinition } from "./types";
import { draftGrammarProvenance } from "../source/defaultSources";

const definitions = [
  {
    id: "all-number-expressions-are-numerals",
    concepts: ["수사", "수 관형사"],
    triggerKeywords: ["수량", "순서", "모두 수사", "다 수사"],
    misconceptionPatterns: ["수량을 나타내면 다 수사", "숫자는 모두 수사", "순서를 나타내면 수사"],
    correctionStrategy:
      "수와 관련된 의미를 찾은 점을 인정하고, 뒤 명사를 직접 꾸미는지를 첫 판별 기준으로 안내한다.",
    compareExamples: ["학생이 둘 왔다/두 학생이 왔다", "내가 첫째다/첫 번째 학생"],
    nextQuestionStyle: "수 표현이 뒤 명사를 직접 꾸미는지 묻는 관찰 질문",
    completionCondition: "수량·순서의 의미만이 아니라 뒤 명사 수식 여부로 구분한다.",
  },
  {
    id: "numeral-by-memorized-form",
    concepts: ["수사", "수 관형사"],
    triggerKeywords: ["하나", "한", "둘", "두", "모양", "외워"],
    misconceptionPatterns: ["하나면 수사", "한이면 수 관형사", "둘은 수사고 두는", "모양만 보면"],
    correctionStrategy:
      "형태 차이를 관찰한 점을 인정하되 외운 모양 대신 문장 속 자리와 조사 결합 가능성을 확인하게 한다.",
    compareExamples: ["사과 하나를 먹었다/한 사과를 먹었다", "둘이 왔다/두 학생이 왔다"],
    nextQuestionStyle: "같은 수 표현의 문장 속 자리나 조사 결합을 비교하는 질문",
    completionCondition: "단어 모양을 외우지 않고 수식 여부나 조사 결합으로 판별한다.",
  },
  {
    id: "numeral-determiner-follows-numeral",
    concepts: ["수사", "수 관형사"],
    triggerKeywords: ["수사 뒤", "뒤에 오는", "수 관형사"],
    misconceptionPatterns: ["수 관형사는 수사 뒤에 오는", "수사 다음 말이 수 관형사", "수사 뒤의 말"],
    correctionStrategy:
      "수와 관련된 말이라는 점을 먼저 인정하고, 수 관형사는 수사 뒤의 말이 아니라 뒤 명사를 직접 꾸미는 말이라고 구분한다.",
    compareExamples: ["세 사람", "두 학생"],
    nextQuestionStyle: "예문에서 수 표현이 꾸미는 뒤 명사 하나를 찾는 질문",
    completionCondition: "수 관형사를 뒤 명사를 직접 꾸미는 관형사로 설명한다.",
  },
] as const;
export const numeralMisconceptions = definitions.map((definition) => ({ ...definition, provenance: draftGrammarProvenance })) satisfies readonly MisconceptionDefinition[];
