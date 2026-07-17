import type { AuthoringConcept, AuthoringKnowledgePack } from "./types";

const SOURCE = "hanip-internal-draft-v2";
const TITLES: Array<[string, string, string[]]> = [
  ["morpheme", "형태소", []], ["word", "단어", ["morpheme"]], ["parts-of-speech", "품사", ["word"]],
  ["noun", "명사", ["parts-of-speech"]], ["pronoun", "대명사", ["noun"]], ["particle", "조사", ["word"]],
  ["numeral", "수사", ["parts-of-speech"]], ["numeral-determiner", "수 관형사", ["numeral"]],
];
const examples: Record<string, string[]> = {
  형태소: ["학생들", "책들", "먹었다", "풋사과", "맨손", "웃었다"], 단어: ["학생", "학교", "책", "웃다", "매우", "그리고"],
  품사: ["사람", "예쁘다", "빨리", "새", "웃는다", "아주"], 명사: ["학생", "나무", "학교", "고양이", "책", "서울"],
  대명사: ["나", "너", "그", "이것", "누구", "저기"], 조사: ["학생이", "책을", "학교에서", "친구와", "나에게", "집까지"],
  수사: ["학생이 둘 왔다", "사과 하나를 먹었다", "내가 첫째다", "둘이 간다", "셋부터 시작한다", "하나만 고른다"],
  "수 관형사": ["두 학생", "한 사람", "세 권", "첫 번째 학생", "네 마리", "두 번째 문제"],
};
function concept([conceptId, title, prerequisites]: [string, string, string[]], index: number): AuthoringConcept {
  const values = examples[title];
  const next = TITLES.filter(([, , required]) => required.includes(conceptId)).map(([id]) => id);
  return {
    conceptId, title, aliases: [title], summary: `${title}의 핵심 성질을 판단 기준과 예로 이해한다.`,
    definition: { easy: `${title}를 쉬운 말로 설명한 한잎 자체 정의이다.`, standard: `${title}의 기본 문법적 성질을 설명한 자체 정의이다.`, precise: `${title}를 형태·기능·의미에 따라 정확히 설명한 자체 문장이다.` },
    coreUnderstanding: [`${title}는 의미만이 아니라 문장에서 하는 일도 함께 살펴야 한다.`], learningObjectives: [`${title}를 예에서 찾고 이유를 말한다.`], scope: "중학교 국어 문법 MVP", prerequisites, nextConcepts: next, relatedConcepts: [], discriminationRules: [`${title}가 문장에서 하는 기능을 먼저 확인한다.`], comparisonTargets: [], completionCriteria: [`새 예문에서 ${title}를 판별하고 근거를 설명한다.`], difficulty: Math.min(5, Math.max(1, index + 1)) as 1 | 2 | 3 | 4 | 5, tags: ["문법", title],
    explanations: [{ id: `${conceptId}-explanation`, strategy: "step_by_step", content: `먼저 ${title}가 문장에서 하는 일을 보고, 다음으로 형태와 의미를 확인한다.`, difficulty: 2, provenanceIds: [SOURCE], status: "draft" }],
    examples: values.map((sentence, number) => ({ exampleId: `${conceptId}-example-${number + 1}`, sentence, focus: title, analysis: `${title}의 기능을 확인한다.`, explanation: `한잎이 직접 만든 ${title} 예문이다.`, difficulty: ((number % 3) + 1) as 1 | 2 | 3, strategyTags: ["관찰", "적용"], allowedLevels: [1, 2, 3], sourceStatus: "draft", isOriginal: true, provenanceIds: [SOURCE] })),
    counterexamples: [1, 2].map((number) => ({ counterexampleId: `${conceptId}-counter-${number}`, sentence: `${title}와 헷갈리기 쉬운 자체 예 ${number}`, expectedJudgment: `${title}가 아님`, reason: "문장에서 하는 기능이 다르다.", confusionTarget: title, provenanceIds: [SOURCE] })),
    misconceptions: [1, 2, 3].map((number) => ({ misconceptionId: `${conceptId}-mis-${number}`, description: `${title}를 의미만으로 판단하는 오개념 ${number}`, likelyResponses: ["뜻이 같아서요"], correctionStrategy: "기능과 형태를 비교한다.", correctiveExamples: [values[number - 1]], prerequisiteHint: prerequisites[0] ?? "단어", severity: number as 1 | 2 | 3, provenanceIds: [SOURCE] })),
    checks: [1, 2, 3, 4, 5].map((number) => ({ checkId: `${conceptId}-check-${number}`, type: "short_answer", prompt: `${values[(number - 1) % values.length]}에서 ${title} 판단 기준을 하나 말해 보세요.`, options: [], correctAnswer: "기능", acceptedPatterns: ["기능|문장에서 하는 일"], explanation: "문장에서 하는 기능을 확인한다.", difficulty: Math.min(5, number) as 1 | 2 | 3 | 4 | 5, evidenceRequired: true, provenanceIds: [SOURCE] })),
    workedExamples: [1, 2].map((number) => ({ workedExampleId: `${conceptId}-worked-${number}`, question: `${values[number - 1]}를 판단해 보자.`, steps: ["문장에서 하는 일을 본다.", "형태와 의미를 함께 확인한다."], answer: title, explanation: "판별 순서에 따라 판단한다.", transferableRule: "기능을 먼저 확인하고 형태와 의미를 함께 본다.", provenanceIds: [SOURCE] })), provenanceIds: [SOURCE],
  };
}
export const authoringSamplePack: AuthoringKnowledgePack = {
  packId: "hanip-parts-of-speech-authoring-sample", title: "한잎 품사 개발용 임시 지식", subject: "국어", domain: "문법", curriculumYear: "2022", schoolLevel: "middle", gradeRange: [1, 2, 3], semester: "공통", version: "2.0.0", schemaVersion: 2, status: "draft", createdAt: "2026-07-17T00:00:00.000Z", updatedAt: "2026-07-17T00:00:00.000Z", note: "한잎 개발용 임시 지식이며 공식 교과서·교육과정 검증 자료가 아닙니다.", provenance: [{ sourceId: SOURCE, sourceType: "internalOriginal", title: "한잎 개발용 임시 지식", verificationStatus: "draft", note: "외부 원문을 복제하지 않은 자체 제작 샘플" }], concepts: TITLES.map(concept),
};
