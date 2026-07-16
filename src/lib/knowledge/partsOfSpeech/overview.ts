import { draftGrammarProvenance } from "@/lib/knowledge/source/defaultSources";

export const partsOfSpeechOverviewKnowledge = {
  id: "parts-of-speech-overview",
  title: "품사의 개념과 분류 기준",
  concept: "품사",
  provenance: draftGrammarProvenance,
  prerequisiteConcepts: [
    "단어는 문법적 성질에 따라 여러 종류로 나눌 수 있다.",
    "문장 성분은 문장 안에서 각 말이 맡는 역할이다.",
  ],
  coreDefinitions: {
    partsOfSpeech: "품사는 단어를 문법적 성질에 따라 나눈 갈래이다.",
    judgmentBasis: "품사를 판단할 때 형태·기능·의미를 살핀다.",
    distinctionFromSentenceComponents: {
      partsOfSpeech: "품사는 단어의 종류이다.",
      sentenceComponent: "문장 성분은 문장 안에서 맡는 역할이다.",
      relationship: "품사와 문장 성분은 서로 다른 개념이다.",
    },
  },
  classificationCriteria: {
    form: {
      name: "형태",
      checks: ["형태가 변하는지, 즉 활용하는지 확인한다."],
      cautions: ["형태는 글자 모양이나 단어 길이를 뜻하지 않는다."],
    },
    function: {
      name: "기능",
      checks: [
        "문장에서 다른 말과 어떤 관계를 맺고 주로 어떤 일을 하는지 확인한다.",
      ],
      cautions: ["기능을 문장 성분과 동일한 개념으로 설명하지 않는다."],
    },
    meaning: {
      name: "의미",
      checks: ["무엇을 나타내는지 확인한다."],
      cautions: [
        "의미만으로 품사를 확정하지 않는다.",
        "형태와 기능을 함께 확인한다.",
      ],
    },
  },
  categoryStructure: [
    { category: "체언", partsOfSpeech: ["명사", "대명사", "수사"] },
    { category: "용언", partsOfSpeech: ["동사", "형용사"] },
    { category: "수식언", partsOfSpeech: ["관형사", "부사"] },
    { category: "관계언", partsOfSpeech: ["조사"] },
    { category: "독립언", partsOfSpeech: ["감탄사"] },
  ],
  categoryPresentationRule:
    "학생에게 처음부터 전체 내용을 모두 나열하지 않고, 현재 학습에 필요한 갈래만 단계적으로 제시한다.",
  misconceptions: [
    "단어의 생김새가 다르면 품사가 다르다고 판단함",
    "뜻이 비슷하면 같은 품사라고 판단함",
    "문장에서 꾸며 주면 모두 관형사 또는 부사라고 판단함",
    "품사와 문장 성분을 같은 것으로 생각함",
    "형태가 변한다는 말을 글자 모양이 달라지는 것으로 이해함",
    "의미만으로 품사를 확정함",
  ],
  teachingFlow: [
    "학생의 현재 생각 확인",
    "서로 다른 단어를 관찰하고 비교",
    "품사를 나누는 이유 확인",
    "형태·기능·의미의 차이 확인",
    "5언과 개별 품사의 관계 확인",
    "대표 단어 판별",
    "새로운 문장에 적용",
    "판단 이유 정리",
  ],
  completionCriteria: [
    "품사가 단어의 종류라는 점을 설명함",
    "형태·기능·의미 중 적절한 판단 기준을 사용할 수 있음",
    "품사와 문장 성분을 구분함",
    "대표 단어의 품사 후보를 판단함",
    "판단 이유를 짧게 설명함",
  ],
  completionEvidenceExamples: [
    "품사를 단어의 종류 또는 문법적 성질에 따른 갈래로 설명함",
    "형태·기능·의미 중 알맞은 기준을 사용해 대표 단어의 품사 후보를 판단함",
    "판단한 품사의 이유를 짧게 설명함",
  ],
  examples: [
    { expression: "사람", focus: "사람의 이름을 나타내는 명사" },
    { expression: "예쁘다", focus: "상태나 성질을 나타내며 활용하는 형용사" },
    { expression: "빨리", focus: "주로 용언을 꾸미는 부사" },
    { sentence: "학생이 책을 읽는다.", focus: "'학생이'는 문장에서 주어 역할을 한다." },
    { sentence: "나는 학생을 만났다.", focus: "같은 '학생'이 문장에서 목적어 역할을 한다." },
    { sentence: "새 가방을 샀다.", focus: "'새'는 뒤의 명사 '가방'을 꾸미는 관형사이다." },
    { sentence: "예쁜 꽃이 피었다.", focus: "'예쁜'은 형용사 '예쁘다'의 활용형이며 문장에서는 관형어 역할을 한다." },
  ],
} as const;
