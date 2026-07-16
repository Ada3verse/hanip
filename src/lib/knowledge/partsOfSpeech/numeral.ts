import { draftGrammarProvenance } from "@/lib/knowledge/source/defaultSources";

export const numeralKnowledge = {
  id: "numeral-vs-numeral-determiner",
  title: "수사와 수 관형사",
  concept: "수사와 수 관형사",
  provenance: draftGrammarProvenance,
  prerequisiteConcepts: [
    "품사는 단어를 문법적 성질에 따라 나눈 갈래이다.",
    "체언은 문장에서 명사와 비슷한 자리를 차지하며 조사와 결합할 수 있다.",
    "관형사는 뒤의 체언을 꾸며 주는 말이다.",
    "조사는 주로 체언 뒤에 붙어 문법적 관계나 뜻을 더한다.",
  ],
  coreDefinitions: {
    numeral: {
      term: "수사",
      definition: "수량이나 순서를 나타내는 체언",
      properties: [
        "조사와 결합할 수 있다.",
        "문장에서 체언의 자리를 차지할 수 있다.",
      ],
    },
    numeralDeterminer: {
      term: "수 관형사",
      definition: "수량이나 순서를 나타내는 관형사",
      properties: [
        "뒤의 명사를 직접 꾸민다.",
        "조사와 결합하지 않는다.",
      ],
    },
  },
  decisionCriteria: [
    {
      order: 1,
      criterion: "뒤의 명사를 직접 꾸미는지 확인한다.",
      numeral: "뒤의 명사를 직접 꾸미지 않고 체언의 자리를 차지한다.",
      numeralDeterminer: "뒤의 명사를 직접 꾸민다.",
    },
    {
      order: 2,
      criterion: "조사와 결합할 수 있는지 확인한다.",
      numeral: "조사와 결합할 수 있다.",
      numeralDeterminer: "조사와 결합하지 않는다.",
    },
    {
      order: 3,
      criterion: "문장에서 체언의 자리를 차지하는지 확인한다.",
      numeral: "체언의 자리를 차지할 수 있다.",
      numeralDeterminer: "체언 앞에서 그 체언을 꾸민다.",
    },
  ],
  examples: {
    quantity: [
      {
        sentence: "학생이 둘 왔다.",
        target: "둘",
        classification: "수사",
        reason: "'둘'이 체언의 자리를 차지하며 뒤의 명사를 꾸미지 않는다.",
      },
      {
        sentence: "두 학생이 왔다.",
        target: "두",
        classification: "수 관형사",
        reason: "'두'가 뒤의 명사 '학생'을 직접 꾸민다.",
      },
      {
        sentence: "사과 하나를 먹었다.",
        target: "하나",
        classification: "수사",
        reason: "'하나'가 조사 '를'과 결합했다.",
      },
      {
        sentence: "한 사람을 만났다.",
        target: "한",
        classification: "수 관형사",
        reason: "'한'이 뒤의 명사 '사람'을 직접 꾸민다.",
      },
    ],
    order: [
      {
        sentence: "내가 첫째다.",
        target: "첫째",
        classification: "수사",
        reason: "'첫째'가 문장에서 체언의 자리를 차지한다.",
      },
      {
        sentence: "첫 번째 학생이다.",
        target: "첫",
        classification: "수 관형사",
        reason: "'첫'이 뒤의 의존 명사 '번째'를 직접 꾸민다.",
      },
    ],
    particleOmission: [
      {
        sentence: "사과 하나 주세요.",
        target: "하나",
        classification: "수사",
        reason: "조사가 생략되었지만 '하나'가 체언의 자리를 차지한다.",
      },
      {
        sentence: "사과 하나를 주세요.",
        target: "하나",
        classification: "수사",
        reason: "'하나'가 조사 '를'과 결합한다.",
      },
    ],
  },
  misconceptions: [
    "수량이나 순서를 나타내면 모두 수사라고 판단함",
    "'하나/한', '둘/두'의 모양만 외워 판별함",
    "뒤 명사 수식 여부를 확인하지 않음",
    "조사 결합 가능 여부를 사용하지 않음",
    "수 관형사를 '수사 뒤에 오는 말'이라고 생각함",
  ],
  teachingFlow: [
    "현재 생각 진단",
    "수사와 수 관형사의 공통점 확인",
    "뒤 명사 수식 여부 확인",
    "조사 결합 가능 여부 확인",
    "대표 예문 판별",
    "판단 이유 설명",
    "새로운 예문 적용",
  ],
  completionCriteria: [
    "대표 예문에서 수사와 수 관형사를 구분함",
    "조사 결합 또는 뒤 명사 수식을 근거로 설명함",
    "새로운 예문에 같은 기준을 적용함",
  ],
  completionEvidenceExamples: [
    "'학생이 둘 왔다'의 '둘'과 '두 학생'의 '두'를 서로 다른 품사로 구분함",
    "뒤의 명사를 직접 꾸미는지 또는 조사와 결합하는지를 판별 근거로 설명함",
    "처음 보인 수 표현에도 같은 판별 기준을 적용해 이유를 설명함",
  ],
} as const;
