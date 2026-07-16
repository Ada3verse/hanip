import { draftGrammarProvenance, hanipInternalDraftSource } from "@/lib/knowledge/source/defaultSources";
import type { KnowledgeConceptEntry, KnowledgeContentPack, KnowledgeField } from "./types";

const sourceId = hanipInternalDraftSource.id;
const field = (id: string, content: string): KnowledgeField => ({ id, content, sourceIds: [sourceId], verificationStatus: "draft" });
const concept = (id: string, name: string, prerequisites: string[], definition: string, prompt: string): KnowledgeConceptEntry => ({
  id, name, aliases: [name], parentConceptId: null, prerequisiteConceptIds: prerequisites, relatedConceptIds: [],
  definition: field(`${id}-definition`, definition), explanation: [], classificationCriteria: [], comparisonCriteria: [], examples: [], misconceptions: [],
  teachingPrompts: [{ id: `${id}-diagnose`, purpose: "diagnose", prompt, expectedFocus: name, difficulty: 1, sourceIds: [sourceId], verificationStatus: "draft" }],
  completionCriteria: [{ id: `${id}-completion`, description: `${name}의 핵심 기준을 예에 적용한다.`, requiredEvidence: "application", minimumSuccessfulApplications: 1, sourceIds: [sourceId], verificationStatus: "draft" }],
  scope: draftGrammarProvenance.scope, provenance: draftGrammarProvenance,
});

export const sampleDraftPack: KnowledgeContentPack = {
  id: "hanip-grammar-sample-draft", version: "1.0.0", title: "한잎 문법 개발용 Sample Pack",
  curriculum: { curriculumYear: "2022", schoolLevel: "middle", subject: "국어", domain: "문법", gradeBands: [1, 2, 3], achievementStandards: [] },
  sources: [hanipInternalDraftSource],
  concepts: [
    concept("morpheme", "형태소", [], "형태소는 뜻을 가진 가장 작은 말의 단위이다.", "‘학생들’을 뜻을 가진 부분으로 나눠 볼까?"),
    concept("word", "단어", ["morpheme"], "단어는 문장에서 홀로 쓰이거나 조사와 결합해 쓰이는 말의 단위이다.", "‘학생’은 하나의 단어로 쓰였을까?"),
    concept("parts-of-speech-overview", "품사", ["morpheme", "word"], "품사는 단어를 문법적 성질에 따라 나눈 갈래이다.", "‘사람’과 ‘예쁘다’는 같은 종류의 단어일까?"),
    concept("numeral", "수사", ["parts-of-speech-overview"], "수사는 수량이나 순서를 나타내는 체언이다.", "‘학생이 둘 왔다’에서 수를 나타내는 말은 무엇일까?"),
    concept("numeral-determiner", "수 관형사", ["parts-of-speech-overview"], "수 관형사는 뒤의 명사를 직접 꾸미는 관형사이다.", "‘두 학생’에서 ‘두’가 꾸미는 말은 무엇일까?"),
    concept("numeral-vs-numeral-determiner", "수사와 수 관형사", ["numeral", "numeral-determiner"], "수사는 체언의 자리를 차지하고 수 관형사는 뒤의 명사를 꾸민다.", "‘둘’과 ‘두’가 문장에서 하는 일을 비교해 볼까?"),
  ], createdAt: "2026-07-15T00:00:00.000Z", updatedAt: "2026-07-15T00:00:00.000Z",
};
