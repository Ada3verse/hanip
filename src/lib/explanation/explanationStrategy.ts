import type { ExplanationHistoryEntry } from "@/lib/studentModel/types";
import {
  EXPLANATION_STRATEGIES,
  type ExplanationDepth,
  type ExplanationPlan,
  type ExplanationSelectionInput,
  type ExplanationStrategy,
  type ExplanationStrategyDefinition,
} from "./types";

export const explanationStrategyLibrary: ExplanationStrategyDefinition[] = [
  { id: "definition", difficulty: 1, recommendedWhen: ["low_confidence", "new_concept"], effect: "핵심 뜻을 짧게 세운다." },
  { id: "daily_example", difficulty: 2, recommendedWhen: ["low_confidence"], effect: "익숙한 대상에 개념을 연결한다." },
  { id: "comparison", difficulty: 3, recommendedWhen: ["partial_understanding"], effect: "공통점과 차이를 찾는다." },
  { id: "contrast", difficulty: 3, recommendedWhen: ["misconception"], effect: "서로 다른 판단 기준을 선명하게 한다." },
  { id: "analogy", difficulty: 2, recommendedWhen: ["repeated_failure"], effect: "낯선 개념을 익숙한 구조에 빗댄다." },
  { id: "counterexample", difficulty: 4, recommendedWhen: ["misconception", "high_confidence"], effect: "잘못된 기준의 한계를 발견한다." },
  { id: "error_correction", difficulty: 2, recommendedWhen: ["misconception"], effect: "학생 생각의 타당한 부분에서 기준을 고친다." },
  { id: "step_by_step", difficulty: 2, recommendedWhen: ["repeated_failure"], effect: "판단 과정을 작은 단계로 나눈다." },
  { id: "visualization", difficulty: 2, recommendedWhen: ["repeated_failure"], effect: "말의 관계를 장면으로 상상한다." },
  { id: "rule_discovery", difficulty: 3, recommendedWhen: ["partial_understanding"], effect: "예에서 공통 규칙을 찾는다." },
  { id: "direct_application", difficulty: 5, recommendedWhen: ["high_confidence"], effect: "새 문장에 기준을 옮겨 쓴다." },
  { id: "quiz", difficulty: 5, recommendedWhen: ["high_confidence"], effect: "짧은 판별로 이해를 확인한다." },
  { id: "fill_blank", difficulty: 2, recommendedWhen: ["low_confidence"], effect: "짧은 문장 틀로 이유를 표현한다." },
  { id: "student_explanation", difficulty: 5, recommendedWhen: ["high_confidence"], effect: "학생이 자기 말로 개념을 정리한다." },
  { id: "teacher_feedback", difficulty: 4, recommendedWhen: ["partial_understanding"], effect: "좋은 기준을 짚고 빠진 부분만 보완한다." },
];

const EXAMPLES: Record<string, Array<{ id: string; text: string }>> = {
  "명사": ["학생", "나무", "학교", "고양이", "책", "자동차", "서울"].map((text) => ({ id: `noun-${text}`, text })),
  "명사와 대명사": [
    { id: "noun-pronoun-minji", text: "‘민지가 왔다’와 ‘그가 왔다’" },
    { id: "noun-pronoun-teacher", text: "‘선생님이 웃었다’와 ‘그분이 웃었다’" },
    { id: "noun-pronoun-cat", text: "‘고양이가 잔다’와 ‘그것이 잔다’" },
    { id: "noun-pronoun-seoul", text: "‘서울은 크다’와 ‘그곳은 크다’" },
    { id: "noun-pronoun-book", text: "‘책을 샀다’와 ‘그것을 샀다’" },
  ],
  "품사": ["사람", "예쁘다", "빨리", "새", "웃는다", "아주", "학교"].map((text) => ({ id: `pos-${text}`, text: `‘${text}’` })),
  "형태소": ["학생들", "책들", "먹었다", "풋사과", "맨손"].map((text) => ({ id: `morpheme-${text}`, text: `‘${text}’` })),
  "조사": ["학생이", "책을", "학교에서", "친구와", "나에게"].map((text) => ({ id: `particle-${text}`, text: `‘${text}’` })),
  "수사와 수 관형사 구분": ["학생이 둘 왔다 / 두 학생이 왔다", "사과 하나 / 한 사과", "내가 첫째다 / 첫 번째 학생"].map((text, index) => ({ id: `numeral-${index + 1}`, text: `‘${text}’` })),
};

const QUESTIONS: Record<ExplanationStrategy, string[]> = {
  definition: ["핵심 뜻을 한 단어로 말해 볼래?", "이 말이 가리키는 것을 짧게 말해 볼래?"],
  comparison: ["둘의 가장 큰 차이를 한 문장으로 말해 볼래?", "두 말은 어떤 점에서 다를까?"],
  contrast: ["반대로 보면 어느 기준이 맞지 않을까?", "두 경우를 가르는 기준은 무엇일까?"],
  analogy: ["이 비유에서 서로 같은 역할을 하는 것은 무엇일까?", "비유를 문법 개념에 다시 연결해 볼래?"],
  daily_example: ["일상에서 같은 예를 하나 더 찾을 수 있을까?", "이 예에서 해당하는 말은 어느 것일까?"],
  counterexample: ["이 반례에도 같은 기준을 적용할 수 있을까?", "처음 기준으로 설명되지 않는 부분은 무엇일까?"],
  error_correction: ["처음 생각에서 어떤 기준만 바꾸면 될까?", "올바른 판단 기준을 하나만 말해 볼래?"],
  step_by_step: ["첫 번째로 확인할 것은 무엇일까?", "다음 판단 단계는 무엇일까?"],
  visualization: ["머릿속 장면에서 어느 말이 다른 말을 꾸미고 있을까?", "그림처럼 놓아 보면 두 말은 어떻게 연결될까?"],
  rule_discovery: ["여러 예에서 반복되는 규칙은 무엇일까?", "공통으로 확인한 기준을 말해 볼래?"],
  direct_application: ["이번에는 새 예에 같은 기준을 적용해 볼래?", "직접 판단하고 이유를 한 문장으로 말해 볼래?"],
  quiz: ["이제 새 문장을 하나 판별해 볼래?", "어느 쪽인지 고르고 기준도 말해 볼래?"],
  fill_blank: ["‘___이기 때문에’의 빈칸을 채워 볼래?", "판단 기준 한 단어만 빈칸에 넣어 볼래?"],
  student_explanation: ["친구에게 설명하듯 네 말로 정리해 볼래?", "이 개념을 한 문장으로 가르쳐 볼래?"],
  teacher_feedback: ["보완한 기준까지 넣어 다시 말해 볼래?", "지금 찾은 좋은 기준을 새 예에도 써 볼래?"],
};

function canonicalConcept(concept: string) {
  if (/명사.*대명사|대명사.*명사/.test(concept)) return "명사와 대명사";
  if (/수사.*관형사|관형사.*수사/.test(concept)) return "수사와 수 관형사 구분";
  if (/형태소/.test(concept)) return "형태소";
  if (/조사/.test(concept)) return "조사";
  if (/품사/.test(concept)) return "품사";
  if (/명사/.test(concept)) return "명사";
  return concept;
}

function countStrategy(history: ExplanationHistoryEntry[], concept: string, strategy: ExplanationStrategy) {
  return history.filter((item) => item.conceptId === concept && item.explanationStrategy === strategy).length;
}

function preferredStrategies(input: ExplanationSelectionInput): ExplanationStrategy[] {
  if (input.consecutiveFailures >= 2) return ["analogy", "step_by_step", "visualization", "counterexample", "daily_example"];
  if (input.misconception) return ["error_correction", "contrast", "counterexample", "comparison", "teacher_feedback"];
  if (input.confidence === "HIGH" || input.understandingLevel >= 3) return ["quiz", "direct_application", "student_explanation", "counterexample", "rule_discovery"];
  if (input.confidence === "LOW" || input.understandingLevel <= 1) return ["definition", "daily_example", "comparison", "fill_blank", "analogy", "step_by_step"];
  return ["comparison", "rule_discovery", "teacher_feedback", "direct_application", "quiz"];
}

function depthFor(input: ExplanationSelectionInput): ExplanationDepth {
  if (input.understandingLevel === 0) return 1;
  if (input.understandingLevel === 1) return 2;
  if (input.understandingLevel === 2) return input.confidence === "HIGH" ? 4 : 3;
  return 5;
}

export function selectExplanationPlan(input: ExplanationSelectionInput): ExplanationPlan {
  const normalizedConcept = canonicalConcept(input.concept);
  const preferred = preferredStrategies(input);
  const strategy = preferred
    .map((id) => ({ id, count: countStrategy(input.history, input.concept, id) }))
    .sort((a, b) => a.count - b.count || preferred.indexOf(a.id) - preferred.indexOf(b.id))[0]?.id ?? EXPLANATION_STRATEGIES[0];
  const usedExamples = new Set(input.history.filter((item) => item.conceptId === input.concept).flatMap((item) => item.exampleIds));
  const pool = EXAMPLES[normalizedConcept] ?? EXAMPLES.품사;
  const selectedExample = pool.find(({ id, text }) => !usedExamples.has(id) && !usedExamples.has(text)) ?? null;
  const useCount = countStrategy(input.history, input.concept, strategy);
  const questions = QUESTIONS[strategy];
  return {
    concept: normalizedConcept,
    strategy,
    depth: depthFor(input),
    exampleId: selectedExample?.id ?? null,
    example: selectedExample?.text ?? null,
    checkQuestion: questions[useCount % questions.length],
    useCount,
    reason: [
      `confidence_${input.confidence.toLowerCase()}`,
      `understanding_${input.understandingLevel}`,
      input.consecutiveFailures >= 2 ? "repeated_failure" : "continue_learning",
      useCount > 0 ? "avoid_repeated_strategy" : "recommended_strategy",
      selectedExample ? "unused_example_selected" : "example_pool_exhausted",
    ],
  };
}

export function renderMockExplanation(plan: ExplanationPlan) {
  const example = plan.example ?? "새로운 예";
  const openings: Record<ExplanationStrategy, string> = {
    definition: `좋은 질문이야. **${plan.concept}**의 핵심 뜻부터 짧게 볼게.`,
    comparison: `한 번 같이 생각해 보자. ${example}을 서로 비교하면 차이가 더 잘 보여.`,
    contrast: `${example}을 반대로 놓고 보면 판단 기준이 선명해져.`,
    analogy: `${plan.concept}을 이름표와 대신 가리키는 손가락처럼 상상해 보자.`,
    daily_example: `우리 주변의 ${example}으로 연결해 보면 쉬워.`,
    counterexample: `${example}처럼 처음 기준만으로 설명하기 어려운 경우를 살펴보자.`,
    error_correction: `주목한 부분은 의미가 있어. 이제 ${example}에서 판단 기준만 바로잡아 보자.`,
    step_by_step: `한꺼번에 보지 말고 ${example}을 작은 단계로 나눠 보자.`,
    visualization: `${example}을 칠판에 나란히 적었다고 상상해 보자.`,
    rule_discovery: `${example}에서 반복되는 규칙을 찾아보자.`,
    direct_application: `이제 ${example}에 배운 기준을 직접 적용해 보자.`,
    quiz: `짧은 퀴즈로 확인해 보자. ${example}은 어떻게 판단할 수 있을까?`,
    fill_blank: `${example}을 문장 틀에 넣어 핵심 이유만 완성해 보자.`,
    student_explanation: `${example}을 이용해 네가 선생님처럼 설명해 보자.`,
    teacher_feedback: `지금까지 찾은 기준에서 좋은 부분은 살리고, ${example}으로 한 가지만 보완할게.`,
  };
  const core: Record<string, string> = {
    "명사와 대명사": "**명사**는 이름을 직접 나타내고, **대명사**는 그 이름을 대신해.",
    "명사": "**명사**는 사람·사물·장소·개념의 이름을 나타내는 말이야.",
    "품사": "**품사**는 단어를 문법적 성질에 따라 나눈 갈래야.",
    "형태소": "**형태소**는 뜻을 가진 가장 작은 말의 단위야.",
    "조사": "**조사**는 주로 체언 뒤에 붙어 다른 말과의 문법적 관계를 나타내.",
    "수사와 수 관형사 구분": "**수사**는 체언 자리에 쓰이고, **수 관형사**는 뒤 명사를 직접 꾸며.",
  };
  const body = plan.depth === 1
    ? `${openings[plan.strategy]} ${core[plan.concept] ?? "핵심 뜻을 먼저 잡아 보자."}`
    : `${openings[plan.strategy]} ${core[plan.concept] ?? "말의 뜻뿐 아니라 문장에서 하는 일과 관계도 함께 보자."}`;
  return `${body} ${plan.checkQuestion}`;
}
