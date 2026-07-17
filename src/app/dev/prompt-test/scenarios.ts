import type {
  AiEvaluation,
  ChatMessage,
  LearningGoal,
  LearningMode,
  LearningStatus,
  StudentSessionModel,
  TutorStrategy,
  ChatStartType,
} from "@/lib/types/chat";

export type ScenarioId =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p1"
  | "p2"
  | "p3"
  | "p4"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "r"
  | "s"
  | "t";

export type MessagePattern = {
  label: string;
  pattern: RegExp;
};

export type PromptTestScenario = {
  id: ScenarioId;
  title: string;
  description: string;
  messages: ChatMessage[];
  expectedEvaluation: AiEvaluation;
  expectedConceptKeywords: string[];
  expectedNextActions: string[];
  requiredMessagePatterns: MessagePattern[];
  forbiddenMessagePatterns: MessagePattern[];
  studentModel?: Partial<StudentSessionModel>;
  learningMode?: LearningMode;
  learningGoal?: LearningGoal;
  expectedSuggestedReplies?: {
    min: number;
    max: number;
    requiredPatterns: MessagePattern[];
  };
  expectedHintLevelUsed?: 0 | 1 | 2 | 3;
  expectedLearningStatus?: LearningStatus;
  expectedStrategy?: TutorStrategy;
  requiredCompletionEvidencePatterns?: MessagePattern[];
  expectedDialogueActions?: Array<"hint" | "explain">;
  expectedPersona?: {
    tones: Array<"warm" | "encouraging" | "calm" | "direct">;
    acknowledgeStudent: boolean;
  };
  startType?: ChatStartType;
};

const ONE_QUESTION_PATTERN = /^[^?？]*[?？][^?？]*$/;

export const SCENARIOS: PromptTestScenario[] = [
  {
    id: "a",
    title: "시나리오 A: 첫 질문 진단",
    description: "첫 질문에서 바로 설명하지 않고 이해 수준을 진단하는지 확인합니다.",
    messages: [{ role: "user", content: "품사가 뭐예요?" }],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["확인", "진단", "판단", "질문", "관찰"],
    requiredMessagePatterns: [
      {
        label: "설명보다 학생의 생각을 확인하는 진단 질문을 제시함",
        pattern: /확인|생각|같은 종류|다른 종류|어떻게 보/,
      },
      {
        label: "질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "품사의 전체 정의를 길게 바로 설명하지 않음",
        pattern:
          /품사는[^?？]*(?:문법적 성질|형태와 기능|의미와 기능)[^?？]{30,}(?:갈래|분류)/,
      },
    ],
  },
  {
    id: "b",
    title: "시나리오 B: 부분 정답",
    description: "맞는 부분을 인정하고 빠진 범위를 보완하는지 확인합니다.",
    messages: [
      { role: "user", content: "명사는 사람을 나타내는 말이에요." },
    ],
    expectedEvaluation: "partial_correct",
    expectedConceptKeywords: ["명사"],
    expectedNextActions: ["확인", "보완", "범위", "질문", "발견", "적용"],
    requiredMessagePatterns: [
      {
        label: "학생 답변에서 맞는 부분을 먼저 인정함",
        pattern: /맞아|맞는|잘 찾|가리킨다는 점|주목했|알고 있/,
      },
      {
        label: "사람 외의 명사 범위를 보완함",
        pattern: /사물|장소|개념/,
      },
      {
        label: "질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "c",
    title: "시나리오 C: 오개념",
    description: "오개념을 낙인찍지 않고 판별 기준으로 유도하는지 확인합니다.",
    messages: [
      { role: "user", content: "수 관형사는 수사 뒤에 오는 말이에요." },
    ],
    expectedEvaluation: "misconception",
    expectedConceptKeywords: ["관형사"],
    expectedNextActions: ["기준", "확인", "꾸미", "명사"],
    requiredMessagePatterns: [
      {
        label: "학생 답변에서 수와 관련된 부분을 먼저 인정함",
        pattern: /[‘'“"]?수[’'”"]?와 관련|수를 나타낸|그 점은|수가 관련/,
      },
      {
        label: "수 관형사의 기준을 뒤 명사 수식과 연결함",
        pattern: /뒤(?:의|에 오는)?\s*(?:명사|말)[^?？]*(?:꾸미|꾸며|수식)|(?:꾸미|꾸며|수식)[^?？]*뒤(?:의|에 오는)?\s*(?:명사|말)/,
      },
      {
        label: "확인 질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "학생에게 오개념이나 틀렸다고 직접 표현하지 않음",
        pattern: /오개념|완전히\s*틀렸어|틀렸어|틀렸습니다|틀린 답/,
      },
    ],
  },
  {
    id: "d",
    title: "시나리오 D: 이해 불가",
    description: "막힌 표현을 쉬운 말과 예시로 바꾸는지 확인합니다.",
    messages: [
      {
        role: "user",
        content: "무엇을 나타낸다는 말이 무슨 말이야?",
      },
    ],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["의미"],
    expectedNextActions: ["설명", "확인", "구별", "차이"],
    requiredMessagePatterns: [
      {
        label: "‘나타낸다’를 쉬운 말로 설명함",
        pattern: /가리키|뜻을 (?:담|말)|무엇인지|어떤 뜻/,
      },
      {
        label: "익숙한 예시를 제시함",
        pattern: /예를 들어|학생|사람|행동/,
      },
      {
        label: "질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "원문을 다시 적거나 보내라고 요구하지 않음",
        pattern:
          /원문[^?？]*(?:다시|적어|보내)|(?:다시|한 번 더)[^?？]*(?:적어|써|보내)/,
      },
    ],
  },
  {
    id: "e",
    title: "시나리오 E: 적용 실패",
    description: "정의를 알지만 예문에 적용하지 못한 경우의 반응을 확인합니다.",
    messages: [
      {
        role: "user",
        content: "수사는 수량이나 순서를 나타내는 체언이에요.",
      },
      {
        role: "assistant",
        content: "그럼 ‘두 학생’의 ‘두’는 수사일까?",
      },
      { role: "user", content: "수사요." },
    ],
    expectedEvaluation: "apply_fail",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["확인", "기준", "꾸미", "적용"],
    requiredMessagePatterns: [
      {
        label: "‘두’가 뒤 명사를 꾸미는지 확인함",
        pattern: /두[^?？]*(?:학생|명사)[^?？]*(?:꾸미|수식)|(?:꾸미|수식)[^?？]*(?:두|학생)/,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "수사의 정의를 길게 반복하지 않음",
        pattern: /수사는\s+수량이나\s+순서를\s+나타내는\s+체언[^?？]{35,}/,
      },
    ],
  },
  {
    id: "f",
    title: "시나리오 F: 수사와 수 관형사 첫 질문",
    description: "명시적인 구분 요청에 직접 답한 뒤 판별 기준을 확인하는지 확인합니다.",
    messages: [
      {
        role: "user",
        content: "수사와 수 관형사는 어떻게 구분해요?",
      },
    ],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사"],
    expectedNextActions: ["확인", "진단", "판단", "기준", "질문", "관찰"],
    requiredMessagePatterns: [
      {
        label: "수사와 수 관형사의 차이에 직접 답함",
        pattern: /수사[^?？]*(?:체언|조사)[^?？]*수\s*관형사[^?？]*(?:뒤의 명사|직접 꾸)/,
      },
      {
        label: "뒤 명사 수식 또는 조사 결합 기준으로 접근함",
        pattern: /뒤[^?？]*(?:명사|말)[^?？]*(?:꾸미|꾸며|수식)|조사[^?？]*(?:결합|붙)|학생이[^?？]*둘[^?？]*두[^?？]*학생/,
      },
      {
        label: "질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "g",
    title: "시나리오 G: 품사 기초 첫 질문",
    description: "품사 기초 지식을 사용해 전체 나열보다 학생의 현재 생각을 먼저 확인하는지 확인합니다.",
    messages: [{ role: "user", content: "품사가 뭐예요?" }],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["확인", "진단", "관찰", "비교", "판단"],
    requiredMessagePatterns: [
      {
        label: "학생의 현재 생각을 확인하는 진단 질문을 제시함",
        pattern: /확인|생각|같은 종류|다른 종류|어떻게 보/,
      },
      {
        label: "사람·예쁘다·빨리 등의 비교 예문을 활용함",
        pattern: /사람[^?？]*예쁘다[^?？]*빨리/,
      },
      {
        label: "질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "전체 9품사를 곧바로 나열하지 않음",
        pattern: /체언[^?？]*용언[^?？]*수식언[^?？]*관계언[^?？]*독립언/,
      },
      {
        label: "품사의 정의를 길게 먼저 설명하지 않음",
        pattern: /품사는[^?？]*(?:문법적 성질|형태[^?？]*기능[^?？]*의미)[^?？]{45,}/,
      },
    ],
  },
  {
    id: "h",
    title: "시나리오 H: 품사와 문장 성분 비교",
    description: "품사와 문장 성분을 종류와 역할의 차이로 짧게 구분하는지 확인합니다.",
    messages: [{ role: "user", content: "품사와 문장 성분은 같은 거예요?" }],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사", "문장 성분"],
    expectedNextActions: ["확인", "구분", "비교", "역할", "적용"],
    requiredMessagePatterns: [
      {
        label: "품사는 단어의 종류, 문장 성분은 문장 안의 역할이라는 기준으로 접근함",
        pattern: /단어의 종류|말의 종류|단어를[^?？]*나눈 갈래|어떤 종류의 단어인지|(?:같은|다른) 종류의 단어|문장(?:\s*안)?에서\s*(?:맡는 역할|하는 일|담당하는 기능)|학생이[^?？]*학생을[^?？]*(?:같은|다른)\s*(?:종류|종류의 단어|말)/,
      },
      {
        label: "같은 단어가 문장에 따라 다른 문장 성분이 되는 예시를 활용함",
        pattern: /학생이[^?？]*학생을|학생을[^?？]*학생이|같은 단어[^?？]*(?:주어[^?？]*목적어|목적어[^?？]*주어)/,
      },
      {
        label: "질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "품사와 문장 성분을 한꺼번에 길게 설명하지 않음",
        pattern: /품사는[^?？]{220,}문장 성분|문장 성분은[^?？]{220,}품사/,
      },
    ],
  },
  {
    id: "i",
    title: "시나리오 I: 첫 진단 선택지",
    description: "첫 진단 질문에 직접 답할 수 있는 짧은 선택지를 함께 제공하는지 확인합니다.",
    messages: [{ role: "user", content: "품사가 뭐예요?" }],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["확인", "진단", "관찰", "비교", "판단"],
    requiredMessagePatterns: [
      {
        label: "진단 질문 하나를 제시함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "품사의 전체 정의를 길게 먼저 설명하지 않음",
        pattern: /품사는[^?？]*(?:문법적 성질|형태[^?？]*기능[^?？]*의미)[^?？]{45,}/,
      },
    ],
    expectedSuggestedReplies: {
      min: 2,
      max: 4,
      requiredPatterns: [
        {
          label: "‘잘 모르겠어’ 선택지를 제공함",
          pattern: /잘\s*모르겠어/,
        },
      ],
    },
  },
  {
    id: "j",
    title: "시나리오 J: 연속 선택 후 자유 표현 전환",
    description: "선택지를 두 번 연속 사용한 뒤 선택지를 멈추고 짧은 판단 근거를 묻는지 확인합니다.",
    messages: [
      { role: "user", content: "품사가 뭐예요?" },
      {
        role: "assistant",
        content: "‘사람’, ‘예쁘다’, ‘빨리’는 같은 종류의 단어라고 생각해?",
      },
      { role: "user", content: "다른 종류야" },
      {
        role: "assistant",
        content: "어떤 점이 달라 보였어?",
      },
      { role: "user", content: "뜻이 달라서" },
    ],
    studentModel: {
      currentConcept: "품사",
      currentFlowStage: "진단",
      consecutiveSuggestedReplyUses: 2,
      lastResponseMode: "suggested",
    },
    expectedEvaluation: "partial_correct",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["이유", "근거", "기준", "설명", "표현", "확인"],
    requiredMessagePatterns: [
      {
        label: "학생의 판단 이유나 핵심어를 짧게 요구함",
        pattern: /이유|근거|기준|한 단어|핵심어|빈칸|짧게/,
      },
      {
        label: "질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "긴 서술을 요구하지 않음",
        pattern: /자세히 설명|길게 설명|여러 문장|문단으로/,
      },
    ],
    expectedSuggestedReplies: {
      min: 0,
      max: 0,
      requiredPatterns: [],
    },
  },
  {
    id: "k",
    title: "시나리오 K: Hint Ladder 세 번째 도움",
    description: "같은 개념에서 세 번 막힌 뒤 핵심 답과 매우 쉬운 확인 질문을 제공하는지 확인합니다.",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해?" },
      {
        role: "assistant",
        content: "‘두 학생’에서 ‘두’ 뒤에 어떤 말이 오는지 먼저 볼까?",
      },
      { role: "user", content: "몰라" },
      {
        role: "assistant",
        content: "수 관형사는 뒤의 명사를 직접 꾸며 줘. ‘두 학생’에서 ‘두’는 무엇을 꾸미고 있을까?",
      },
      { role: "user", content: "모르겠어" },
      {
        role: "assistant",
        content: "‘두’는 뒤의 명사 ‘학생’을 살펴보게 하는 말이야. ‘두’가 ‘학생’을 꾸미고 있을까?",
      },
      { role: "user", content: "이해가 안 돼" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사 구분",
      currentFlowStage: "비교",
      hintLevel: 3,
      consecutiveUnknownResponses: 3,
      lastResponseMode: "typed",
    },
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["확인", "적용", "예문", "꾸미", "기준"],
    expectedHintLevelUsed: 3,
    requiredMessagePatterns: [
      {
        label: "세 번째 도움에서 핵심 답을 명확히 알려 줌",
        pattern: /수\s*관형사[^?？]*(?:뒤의|뒤)\s*명사[^?？]*(?:꾸미|수식)|(?:뒤의|뒤)\s*명사[^?？]*(?:꾸미|수식)[^?？]*수\s*관형사/,
      },
      {
        label: "매우 쉬운 확인 질문 하나로 응답함",
        pattern: ONE_QUESTION_PATTERN,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "학생에게 내부 도움 단계나 실패 횟수를 노출하지 않음",
        pattern: /Hint\s*Level|Level\s*[123]|힌트\s*레벨|실패\s*횟수|내부\s*평가/,
      },
    ],
  },
  {
    id: "l",
    title: "시나리오 L: 학습 완료 정리",
    description: "완료 기준의 실제 증거가 충분할 때 질문을 멈추고 짧게 정리하는지 확인합니다.",
    messages: [
      { role: "user", content: "수사와 수 관형사를 구분해 볼래." },
      {
        role: "assistant",
        content: "‘학생이 둘 왔다’의 ‘둘’과 ‘두 학생’의 ‘두’를 구분해 볼까?",
      },
      {
        role: "user",
        content: "‘둘’은 수사이고 ‘두’는 수 관형사예요.",
      },
      {
        role: "assistant",
        content: "어떤 기준으로 구분했어?",
      },
      {
        role: "user",
        content: "뒤의 명사를 직접 꾸미면 수 관형사이고, 조사와 결합하거나 명사 자리에 있으면 수사예요.",
      },
      {
        role: "assistant",
        content: "그럼 처음 보는 예문 ‘네 권을 읽었다’의 ‘네’는 어느 품사일까?",
      },
      {
        role: "user",
        content: "‘네’가 뒤의 명사 ‘권’을 직접 꾸미니까 수 관형사예요.",
      },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사 구분",
      currentFlowStage: "적용",
      learningStatus: "ready_to_complete",
      completionEvidence: [
        "대표 예문에서 수사와 수 관형사를 구분함",
        "뒤 명사 수식과 조사 결합을 판별 근거로 설명함",
      ],
      lastResponseMode: "typed",
    },
    expectedEvaluation: "correct",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["완료", "정리", "마무리", "전이"],
    expectedLearningStatus: "completed",
    requiredCompletionEvidencePatterns: [
      {
        label: "판별 기준을 완료 증거로 기록함",
        pattern: /뒤[^\n]*(?:명사|수식|꾸미)|조사[^\n]*(?:결합|붙)/,
      },
      {
        label: "새로운 예문 적용 성공을 완료 증거로 기록함",
        pattern: /새로운|새 예문|처음 보는|전이|네[^\n]*권|적용/,
      },
    ],
    requiredMessagePatterns: [
      {
        label: "사용한 판단 기준과 핵심을 짧게 정리함",
        pattern: /뒤[^?？]*(?:명사|꾸미|수식)[^?？]*(?:수사|수 관형사)|(?:수사|수 관형사)[^?？]*뒤[^?？]*(?:명사|꾸미|수식)/,
      },
    ],
    forbiddenMessagePatterns: [
      {
        label: "완료 뒤 추가 학습 질문을 강제로 제시하지 않음",
        pattern: /[?？]/,
      },
    ],
    expectedSuggestedReplies: {
      min: 3,
      max: 3,
      requiredPatterns: [
        { label: "‘새 문제로 확인할래’를 제공함", pattern: /^새 문제로 확인할래$/ },
        { label: "‘다른 개념을 물어볼래’를 제공함", pattern: /^다른 개념을 물어볼래$/ },
        { label: "‘오늘은 여기까지’를 제공함", pattern: /^오늘은 여기까지$/ },
      ],
    },
  },
  {
    id: "m",
    title: "시나리오 M: 처음부터 배우기",
    description: "개념 학습 모드에서도 명시적인 구분 요청에 직접 답하는지 확인합니다.",
    learningMode: "learn",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["진단", "확인", "관찰", "질문"],
    requiredMessagePatterns: [
      {
        label: "핵심 차이를 설명한 뒤 확인 질문을 제시함",
        pattern: /수사[^?？]*(?:체언|조사)[^?？]*수\s*관형사[^?？]*(?:뒤의 명사|직접 꾸)/,
      },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "n",
    title: "시나리오 N: 짧게 복습하기",
    description: "핵심 기준을 짧게 확인하고 대표 예문으로 빠르게 이동하는지 확인합니다.",
    learningMode: "review",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["복습", "기준", "비교", "확인", "예문"],
    requiredMessagePatterns: [
      {
        label: "핵심 판별 기준을 짧게 확인함",
        pattern: /핵심|기준|뒤(?:의)?\s*명사|조사/, 
      },
      {
        label: "대표 비교 예문을 사용함",
        pattern: /학생이\s*둘|두\s*학생|사과\s*하나|한\s*사람/,
      },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [
      {
        label: "전체 정의를 길게 반복하지 않음",
        pattern: /수사는[^?？]{40,}수\s*관형사는/,
      },
    ],
  },
  {
    id: "o",
    title: "시나리오 O: 문제로 연습하기",
    description: "설명 없이 새로운 판별 문제와 이유 확인으로 바로 시작하는지 확인합니다.",
    learningMode: "practice",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["문제", "적용", "판별", "이유", "연습"],
    requiredMessagePatterns: [
      {
        label: "새로운 판별 예문을 바로 제시함",
        pattern: /에서|문장|예문|‘[^’]+’|'[^']+'/, 
      },
      {
        label: "판단 또는 이유를 요구함",
        pattern: /수사|수\s*관형사|판단|이유|근거/,
      },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [
      {
        label: "정의를 길게 설명하지 않음",
        pattern: /수사는[^?？]{30,}(?:체언|수량|순서)/,
      },
    ],
  },
  {
    id: "p1",
    title: "시나리오 P-1: 개념 이해 목표",
    description: "정의 암기보다 품사의 원리와 판단 기준 이해를 우선하는지 확인합니다.",
    learningMode: "learn",
    learningGoal: "concept",
    messages: [{ role: "user", content: "품사가 뭐예요?" }],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["이해", "기준", "진단", "확인", "관찰"],
    requiredMessagePatterns: [
      {
        label: "개념의 원리나 판단 기준을 생각하게 함",
        pattern: /생각|기준|종류|문법적|하는 일|나타내/,
      },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "p2",
    title: "시나리오 P-2: 시험 대비 목표",
    description: "시험에서 자주 생기는 혼동 기준과 대표 함정을 우선하는지 확인합니다.",
    learningMode: "learn",
    learningGoal: "exam",
    messages: [{ role: "user", content: "품사가 뭐예요?" }],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["함정", "혼동", "오답", "기준", "비교"],
    requiredMessagePatterns: [
      {
        label: "혼동 기준이나 시험 함정을 확인함",
        pattern: /시험|헷갈|혼동|함정|틀리|오답/,
      },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "p3",
    title: "시나리오 P-3: 문제 풀이 목표",
    description: "설명을 줄이고 새로운 적용 문제를 우선하는지 확인합니다.",
    learningMode: "learn",
    learningGoal: "practice",
    messages: [{ role: "user", content: "품사가 뭐예요?" }],
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["문제", "적용", "판별", "이유"],
    requiredMessagePatterns: [
      {
        label: "새 예문 적용 문제를 제시함",
        pattern: /문장|예문|에서|어느 품사|판별/,
      },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [
      {
        label: "정의를 길게 설명하지 않음",
        pattern: /품사는[^?？]{40,}(?:갈래|분류|종류)/,
      },
    ],
  },
  {
    id: "p4",
    title: "시나리오 P-4: 오답 정리 목표",
    description: "이전 오개념과 지원 필요 개념을 우선 재확인하는지 확인합니다.",
    learningMode: "review",
    learningGoal: "review",
    messages: [{ role: "user", content: "품사가 뭐예요?" }],
    studentModel: {
      currentConcept: "품사",
      currentFlowStage: "분류기준",
      misconceptions: ["parts-of-speech-by-meaning-only"],
      needsSupportConcepts: ["형태·기능·의미"],
      completionEvidence: ["품사가 단어의 종류임을 설명함"],
    },
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["복습", "재확인", "오개념", "지원", "기준"],
    requiredMessagePatterns: [
      {
        label: "이전에 헷갈린 기준이나 부족한 부분을 재확인함",
        pattern: /이전|헷갈|다시|기준|형태|기능|의미/,
      },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [
      {
        label: "이미 이해한 품사의 기본 정의를 길게 반복하지 않음",
        pattern: /품사는[^?？]{40,}(?:갈래|종류)/,
      },
    ],
  },
  {
    id: "q1",
    title: "시나리오 Q-1: discover 전략",
    description: "Level 1의 확인되지 않은 학생에게 쉬운 비교 질문을 사용하는지 확인합니다.",
    learningMode: "learn",
    learningGoal: "concept",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사",
      currentFlowStage: "진단",
      lastEvaluation: "unknown",
    },
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["확인", "관찰", "비교", "진단"],
    expectedStrategy: "discover",
    requiredMessagePatterns: [
      { label: "쉬운 비교 질문을 사용함", pattern: /같|다르|비교|어느|생각/ },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "q2",
    title: "시나리오 Q-2: guide 전략",
    description: "부분 정답을 바탕으로 이유와 판단 기준을 확인하는지 확인합니다.",
    learningMode: "learn",
    learningGoal: "concept",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사",
      currentFlowStage: "분류기준",
      lastEvaluation: "partial_correct",
    },
    expectedEvaluation: "partial_correct",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["이유", "기준", "확인", "예문"],
    expectedStrategy: "guide",
    requiredMessagePatterns: [
      { label: "예문과 판단 이유를 확인함", pattern: /예문|기준|이유|근거/ },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "q3",
    title: "시나리오 Q-3: challenge 전략",
    description: "숙련도가 높고 문제 중심인 학생에게 새 적용 문제를 제시하는지 확인합니다.",
    learningMode: "practice",
    learningGoal: "concept",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사",
      currentFlowStage: "적용",
      lastEvaluation: "correct",
      completionEvidence: ["대표 예문 판별 성공", "판단 기준 설명 성공"],
    },
    expectedEvaluation: "correct",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["적용", "반례", "문제", "전이"],
    expectedStrategy: "challenge",
    requiredMessagePatterns: [
      { label: "새 문장이나 반례를 적용함", pattern: /새 문장|반례|도전|적용/ },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "q4",
    title: "시나리오 Q-4: review 전략",
    description: "이전 오개념을 새로운 비교 예시로 재확인하는지 확인합니다.",
    learningMode: "learn",
    learningGoal: "concept",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사",
      currentFlowStage: "비교",
      lastEvaluation: "misconception",
      misconceptions: ["all-number-expressions-are-numerals"],
      needsSupportConcepts: ["뒤 명사 수식"],
    },
    expectedEvaluation: "misconception",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["복습", "재확인", "비교", "오개념"],
    expectedStrategy: "review",
    requiredMessagePatterns: [
      { label: "이전 판단을 다른 예시로 재확인함", pattern: /이전|다른 예시|다시|헷갈/ },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "q5",
    title: "시나리오 Q-5: mastery 전략",
    description: "완료된 학생에게 교과서 수준의 연결·적용 문제를 제시하는지 확인합니다.",
    learningMode: "learn",
    learningGoal: "concept",
    messages: [
      { role: "user", content: "수사와 수 관형사는 어떻게 구분해요?" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사",
      currentFlowStage: "정리",
      lastEvaluation: "correct",
      understoodConcepts: ["수사와 수 관형사"],
      learningStatus: "completed",
      completionEvidence: ["대표 예문 판별 성공", "새 예문 적용 성공"],
      hintLevel: 0,
    },
    expectedEvaluation: "correct",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["전이", "연결", "적용", "심화"],
    expectedStrategy: "mastery",
    requiredMessagePatterns: [
      { label: "교과서 수준의 연결·적용 문제를 사용함", pattern: /교과서|연결|적용|새 문장/ },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [],
  },
  {
    id: "r",
    title: "시나리오 R: Route와 Hint 연속성",
    description: "현재 수사·수 관형사 Route에서 막혔을 때 다른 대표 질문으로 점프하지 않는지 확인합니다.",
    messages: [
      { role: "user", content: "품사가 뭐야?" },
      { role: "assistant", content: "형태소를 알고 있을까?" },
      { role: "user", content: "모르겠어" },
      { role: "assistant", content: "‘학생들’을 작은 뜻 단위로 나눠 볼까?" },
      { role: "user", content: "생김새가 다르니까" },
      { role: "assistant", content: "형태소가 모여 단어가 돼. ‘학생’은 하나의 단어일까?" },
      { role: "user", content: "아니" },
      { role: "assistant", content: "단어를 확인했으니 원래 경로로 돌아갈게." },
      { role: "assistant", content: "‘두 학생’의 ‘두’는 뒤의 어떤 말을 꾸미고 있을까?" },
      { role: "user", content: "잘 모르겠어" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사",
      currentFlowStage: "비교",
      lastEvaluation: "unknown",
      hintLevel: 2,
      learningRoute: {
        targetConcept: "numeral-vs-numeral-determiner",
        route: ["morpheme", "word", "parts-of-speech-overview", "substantive", "numeral", "numeral-vs-numeral-determiner"],
        currentIndex: 5,
        completedConcepts: ["morpheme", "word", "parts-of-speech-overview", "substantive", "numeral"],
        startedAt: "2026-07-15T00:00:00.000Z",
      },
    },
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["막힌", "쉽게", "힌트", "확인"],
    expectedHintLevelUsed: 0,
    expectedDialogueActions: ["hint", "explain"],
    requiredMessagePatterns: [
      { label: "두·학생·뒤 명사 수식에 집중함", pattern: /두|학생|뒤의 명사|꾸며/ },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [
      { label: "품사 정의나 문법적 성질 질문으로 이동하지 않음", pattern: /문법적 성질|품사를.*나눈 갈래/ },
      { label: "직전 질문을 그대로 반복하지 않음", pattern: /^‘두 학생’의 ‘두’는 뒤의 어떤 말을 꾸미고 있을까\?$/ },
    ],
  },
  {
    id: "s",
    title: "시나리오 S: 자연스러운 Route 도움 표현",
    description: "Route와 Hint 초점을 유지하면서 부담 없는 중학생 말투를 사용하는지 확인합니다.",
    messages: [
      { role: "user", content: "품사가 뭐야?" },
      { role: "assistant", content: "형태소를 알고 있을까?" },
      { role: "user", content: "모르겠어" },
      { role: "assistant", content: "‘학생들’을 작은 뜻 단위로 나눠 볼까?" },
      { role: "user", content: "생김새가 다르니까" },
      { role: "assistant", content: "모양 차이에 주목했구나. ‘학생’은 하나의 단어일까?" },
      { role: "user", content: "아니" },
      { role: "assistant", content: "단어는 문장에서 하나의 단위로 쓰여. 이제 원래 질문으로 돌아가 볼게." },
      { role: "user", content: "잘 모르겠어" },
    ],
    studentModel: {
      currentConcept: "수사와 수 관형사",
      currentFlowStage: "비교",
      lastEvaluation: "unknown",
      hintLevel: 2,
      learningRoute: {
        targetConcept: "numeral-vs-numeral-determiner",
        route: ["morpheme", "word", "parts-of-speech-overview", "substantive", "numeral", "numeral-vs-numeral-determiner"],
        currentIndex: 5,
        completedConcepts: ["morpheme", "word", "parts-of-speech-overview", "substantive", "numeral"],
        startedAt: "2026-07-15T00:00:00.000Z",
      },
    },
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["수사", "관형사"],
    expectedNextActions: ["막힌", "쉽게", "확인"],
    expectedDialogueActions: ["hint", "explain"],
    expectedPersona: { tones: ["calm", "warm"], acknowledgeStudent: true },
    requiredMessagePatterns: [
      { label: "학생이 막힌 지점을 자연스럽게 인정함", pattern: /막힌|알겠|살펴|쉽게/ },
      { label: "문장이 최대 세 개임", pattern: /^(?:[^.!?。！？]*[.!?。！？]\s*){1,3}$/ },
      { label: "질문 하나로 응답함", pattern: ONE_QUESTION_PATTERN },
      { label: "현재 수식 관계에 집중함", pattern: /두|학생|명사|꾸며/ },
    ],
    forbiddenMessagePatterns: [
      { label: "내부 용어나 금지 표현을 사용하지 않음", pattern: /오개념이야|완전히 틀렸어|힌트 레벨|평가 결과|학습 전략|Student Model|Learning State/ },
      { label: "품사 정의로 이동하지 않음", pattern: /품사를.*나눈 갈래|문법적 성질/ },
    ],
  },
  {
    id: "t",
    title: "시나리오 T: 새 대화와 장기 Progress 분리",
    description: "새 질문은 이전 메시지 없이 시작하되 장기 품사 기록을 활용하는지 확인합니다.",
    startType: "new",
    messages: [{ role: "user", content: "품사가 뭐야?" }],
    studentModel: {
      currentConcept: "품사",
      priorProgressLoaded: true,
      priorMasteryScore: 45,
      priorConceptStatus: "learning",
      needsSupportConcepts: ["품사"],
    },
    expectedEvaluation: "unknown",
    expectedConceptKeywords: ["품사"],
    expectedNextActions: ["기준", "확인", "이전"],
    expectedSuggestedReplies: {
      min: 3,
      max: 4,
      requiredPatterns: [
        { label: "질문과 직접 연결된 형태·기능·의미 선택지를 제공함", pattern: /형태|기능|의미/ },
      ],
    },
    requiredMessagePatterns: [
      { label: "구체적인 품사 판단 대상을 제시함", pattern: /형태|기능|의미|사람|예쁘다|빨리/ },
      { label: "질문 하나로 끝남", pattern: ONE_QUESTION_PATTERN },
    ],
    forbiddenMessagePatterns: [
      { label: "모호한 범용 질문을 사용하지 않음", pattern: /이 질문에서 가장 궁금한 말|어떻게 생각해|무엇을 알겠어/ },
      { label: "단순 응·아니 선택지만 사용하지 않음", pattern: /^(?:응|아니|잘 모르겠어)$/ },
    ],
  },
];
