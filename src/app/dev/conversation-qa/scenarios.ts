import type { ConversationQaScenario } from "@/lib/qa/types";

const ROUTE_TO_NUMERAL = {
  targetConcept: "numeral-vs-numeral-determiner",
  route: ["morpheme", "word", "parts-of-speech-overview", "substantive", "numeral", "numeral-vs-numeral-determiner"],
  currentIndex: 5,
  completedConcepts: ["morpheme", "word", "parts-of-speech-overview", "substantive", "numeral"],
  startedAt: "2026-07-15T00:00:00.000Z",
};

const BASE_EXPECTATION = {
  maxAssistantSentences: 3,
  maxQuestionsPerTurn: 1,
  forbidRepeatedSuggestedReplies: true,
  forbidRepeatedOpening: true,
  forbiddenPhrases: ["이 질문에서 가장 궁금한 말은 무엇이야?"],
};

export const CONVERSATION_QA_SCENARIOS: ConversationQaScenario[] = [
  {
    id: "A", title: "품사 첫 학습 Route와 Hint", startQuestion: "품사가 뭐야?",
    mode: "learn", goal: "concept",
    initialStudentModel: { currentConcept: "형태소", learningRoute: { ...ROUTE_TO_NUMERAL, currentIndex: 0, completedConcepts: [] } },
    studentTurns: ["모르겠어", "생김새가 다르니까", "아니", "잘 모르겠어"],
    expected: { ...BASE_EXPECTATION },
  },
  {
    id: "B", title: "품사 understood Progress 적용", startQuestion: "품사가 뭐야?",
    mode: "learn", goal: "concept", priorProgress: { conceptId: "품사", status: "understood", masteryScore: 85 },
    studentTurns: ["관형사"], expected: { ...BASE_EXPECTATION, mustUseProgress: true },
  },
  {
    id: "C", title: "품사 needs_review 복습", startQuestion: "품사가 뭐야?",
    mode: "review", goal: "review",
    priorProgress: { conceptId: "품사", status: "needs_review", masteryScore: 45, misconceptionIds: ["meaning-only"] },
    studentTurns: ["다를 수 있어"], expected: { ...BASE_EXPECTATION, mustUseProgress: true },
  },
  {
    id: "D", title: "수 관형사 뒤 명사 수식", startQuestion: "수사와 수 관형사는 어떻게 구분해?",
    mode: "learn", goal: "concept", initialStudentModel: { currentConcept: "수사와 수 관형사", learningRoute: ROUTE_TO_NUMERAL },
    studentTurns: ["학생", "뒤의 명사를 꾸미기 때문이야"],
    expected: {
      ...BASE_EXPECTATION,
      activeConceptMustRemain: "수사와 수 관형사",
      requiredFocusKeywords: ["뒤의 명사", "명사를", "바로 뒤", "두 학생", "조사"],
      forbiddenPhrases: [...(BASE_EXPECTATION.forbiddenPhrases ?? []), "품사는 단어를 문법적 성질"],
    },
  },
  {
    id: "E", title: "수사 조사 결합 기준", startQuestion: "수사와 수 관형사는 어떻게 구분해?",
    mode: "review", goal: "concept",
    initialStudentModel: { currentConcept: "수사와 수 관형사", learningRoute: ROUTE_TO_NUMERAL },
    studentTurns: ["조사 결합", "둘은 조사가 붙을 수 있어"],
    expected: { ...BASE_EXPECTATION, activeConceptMustRemain: "수사와 수 관형사", requiredFocusKeywords: ["둘", "두", "학생", "조사", "뒤의 명사", "명사를"] },
  },
  {
    id: "F", title: "연속 선택지 전환", startQuestion: "수사와 수 관형사는 어떻게 구분해?",
    mode: "learn", goal: "concept", initialStudentModel: { currentConcept: "수사와 수 관형사", learningRoute: ROUTE_TO_NUMERAL },
    studentTurns: ["학생", "응"], expected: { ...BASE_EXPECTATION },
  },
  {
    id: "G", title: "이해 불가 세 번 Hint Ladder", startQuestion: "수사와 수 관형사는 어떻게 구분해?",
    mode: "learn", goal: "concept", initialStudentModel: { currentConcept: "수사와 수 관형사", learningRoute: ROUTE_TO_NUMERAL },
    studentTurns: ["몰라", "모르겠어", "이해가 안 돼"], expected: { ...BASE_EXPECTATION, requiredFocusKeywords: ["두", "학생", "명사", "꾸며"] },
  },
  {
    id: "H", title: "명시적 범위 내 질문 우선", startQuestion: "수사와 수 관형사는 어떻게 구분해?",
    mode: "learn", goal: "concept", initialStudentModel: { currentConcept: "수사와 수 관형사", learningRoute: ROUTE_TO_NUMERAL },
    studentTurns: ["형태소는 뭐야?", "잘 모르겠어"], expected: { ...BASE_EXPECTATION },
  },
  {
    id: "I", title: "명시적 새 주제 전환", startQuestion: "품사가 뭐야?",
    mode: "learn", goal: "concept", studentTurns: ["이제 조사를 공부할래", "학생이의 이는 뭐야?"],
    expected: { ...BASE_EXPECTATION },
  },
  {
    id: "J", title: "new 세션 이전 메시지 제외", startQuestion: "품사가 뭐야?",
    mode: "learn", goal: "concept", startType: "new",
    previousMessages: [{ role: "user", content: "이전 질문" }, { role: "assistant", content: "이전 답변" }],
    studentTurns: [], expected: { ...BASE_EXPECTATION, mustNotRestorePreviousMessages: true },
  },
  {
    id: "K", title: "resume_session 메시지 복원", startQuestion: "계속할게",
    mode: "learn", goal: "concept", startType: "resume_session",
    previousMessages: [{ role: "user", content: "품사가 뭐야?" }, { role: "assistant", content: "단어 종류를 확인해 볼게." }],
    studentTurns: [], expected: { ...BASE_EXPECTATION },
  },
  {
    id: "L", title: "resume_progress Progress만 적용", startQuestion: "품사가 뭐야?",
    mode: "review", goal: "review", startType: "resume_progress",
    previousMessages: [{ role: "assistant", content: "복원되면 안 되는 이전 답변" }],
    priorProgress: { conceptId: "품사", status: "learning", masteryScore: 55 },
    studentTurns: [], expected: { ...BASE_EXPECTATION, mustUseProgress: true, mustNotRestorePreviousMessages: true },
  },
  {
    id: "U", title: "연속 이해 불가 선택지 생명주기", startQuestion: "계속할게",
    mode: "learn", goal: "concept",
    initialStudentModel: { currentConcept: "형태소", learningRoute: { ...ROUTE_TO_NUMERAL, currentIndex: 0, completedConcepts: [] } },
    studentTurns: ["잘 모르겠어", "잘 모르겠어", "잘 모르겠어"],
    expected: { ...BASE_EXPECTATION, activeConceptMustRemain: "형태소", requiredFocusKeywords: ["학생", "들", "형태소"] },
  },
  {
    id: "V", title: "세 번째 힌트 정답 후 다음 Route", startQuestion: "계속할게",
    mode: "learn", goal: "concept",
    initialStudentModel: { currentConcept: "형태소", learningRoute: { ...ROUTE_TO_NUMERAL, currentIndex: 0, completedConcepts: [] } },
    studentTurns: ["잘 모르겠어", "잘 모르겠어", "잘 모르겠어", "학생 + 들"],
    expected: { ...BASE_EXPECTATION },
  },
  {
    id: "W", title: "형태소 직접 입력 후 다음 Route", startQuestion: "계속할게",
    mode: "learn", goal: "concept",
    initialStudentModel: { currentConcept: "형태소", learningRoute: { ...ROUTE_TO_NUMERAL, currentIndex: 0, completedConcepts: [] } },
    studentTurns: ["학생하고 들"],
    expected: { ...BASE_EXPECTATION },
  },
  {
    id: "X", title: "명사·대명사 비교 Teaching Goal", startQuestion: "명사와 대명사의 차이를 알려줘.",
    mode: "learn", goal: "concept", studentTurns: [],
    expected: { ...BASE_EXPECTATION, expectedTeachingStrategy: "COMPARE", teachingGoalPattern: /명사는 이름.*대명사는 명사를 대신/ },
  },
  {
    id: "Y", title: "조사 정의 Teaching Goal", startQuestion: "조사가 뭐야?",
    mode: "learn", goal: "concept", studentTurns: [],
    expected: { ...BASE_EXPECTATION, expectedTeachingStrategy: "DIRECT_EXPLANATION", teachingGoalPattern: /문법적 관계/ },
  },
  {
    id: "Z", title: "대명사 필요성 Teaching Goal", startQuestion: "왜 대명사가 필요해?",
    mode: "learn", goal: "concept", studentTurns: [],
    expected: { ...BASE_EXPECTATION, expectedTeachingStrategy: "DIRECT_EXPLANATION", teachingGoalPattern: /반복을 피하고/ },
  },
  {
    id: "AA", title: "Student Model 설명 이력 반영", startQuestion: "명사와 대명사의 차이를 알려줘.",
    mode: "learn", goal: "concept", studentTurns: ["명사와 대명사의 차이를 다시 알려줘."],
    expected: { ...BASE_EXPECTATION, expectedTeachingStrategy: "COMPARE", teachingGoalPattern: /명사는 이름.*대명사는 명사를 대신/ },
  },
];
