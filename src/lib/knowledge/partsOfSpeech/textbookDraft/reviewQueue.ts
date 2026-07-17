import type { TextbookConflictReview, TextbookDraftReviewReport, TextbookSemanticChunk } from "./types";
import { TEXTBOOK_DRAFT_REVIEWED_AT } from "./sourceManifest";

type ChunkSeed = [string, string, string, string, string, number];
const seeds: ChunkSeed[] = [
  ["teacher-textbook-01", "19-24", "parts-of-speech", "정의와 분류 기준", "품사는 단어를 문법적 성질에 따라 나누며 형태·기능·의미를 종합한다.", .98],
  ["teacher-textbook-01", "25-28", "nominal", "체언과 하위 품사", "명사·대명사·수사의 공통 기능과 각 품사의 의미 차이를 비교한다.", .98],
  ["teacher-textbook-01", "29-31", "predicate", "용언과 활용", "동사·형용사는 활용하며 기본형과 어간·어미 관계를 관찰한다.", .98],
  ["teacher-textbook-01", "32-34", "modifier", "수식언", "관형사와 부사의 수식 대상을 기준으로 구분하고 수사와 수 관형사를 비교한다.", .98],
  ["teacher-textbook-01", "35-38", "particle", "관계언·독립언", "조사의 결합 기능과 감탄사의 독립성을 실제 문맥에서 판단한다.", .97],
  ["teacher-textbook-01", "39-47", "parts-of-speech-procedure", "적용과 평가", "형태가 같은 말도 문맥의 기능에 따라 품사가 달라질 수 있음을 적용한다.", .96],
  ["teacher-textbook-02", "4-9", "word", "단어와 형태소", "홀로 쓰임과 분리 가능성을 이용해 단어와 형태소의 관계를 확인한다.", .93],
  ["teacher-textbook-02", "23", "morpheme", "선수 개념 점검", "형태소를 뜻을 가진 가장 작은 단위로 점검한다.", .91],
  ["teacher-textbook-03", "3, 6-9", "morpheme", "형태소 분석", "형태소 분석은 글자 수가 아니라 의미 단위를 기준으로 한다.", .94],
  ["teacher-textbook-03", "10-19", "word", "단어 분석 지도", "사전과 비교 자료를 활용하되 품사 학습에 필요한 단어 단위만 연결한다.", .9],
  ["teacher-textbook-04", "3-8", "parts-of-speech", "분류 필요성과 기준", "분류의 유용성을 먼저 경험하고 형태·기능·의미 기준을 발견하게 한다.", .98],
  ["teacher-textbook-04", "9-11", "nominal", "체언", "명사·대명사·수사가 문장에서 체언의 자리를 차지함을 확인한다.", .97],
  ["teacher-textbook-04", "12-14", "conjugation", "용언과 활용", "활용형에서 변하지 않는 부분과 바뀌는 부분을 비교한다.", .97],
  ["teacher-textbook-04", "16-20", "modifier", "수식언·관계언·독립언", "기능을 중심으로 세 언의 차이를 단계적으로 확인한다.", .96],
  ["teacher-textbook-04", "22-24", "parts-of-speech-procedure", "효과와 정리", "품사 지식이 정확한 단어 사용과 국어 자료 분석에 쓰임을 평가한다.", .95],
  ["teacher-textbook-05", "5-9", "parts-of-speech", "교수·학습 설계", "분류 경험에서 출발해 품사의 세 기준과 5언·9품사 체계를 연결한다.", .99],
  ["teacher-textbook-05", "10-12", "nominal", "체언 지도", "구체·추상 명사, 지시 맥락, 양수사·서수사를 풍부한 예로 지도한다.", .99],
  ["teacher-textbook-05", "13-14", "predicate", "동사·형용사 비교", "명령형·청유형 결합 가능성을 보조 기준으로 사용하되 문맥을 함께 본다.", .99],
  ["teacher-textbook-05", "15-16", "modifier", "관형사·부사 비교", "꾸밈을 받는 말이 명사인지 용언·관형사·부사·문장인지 확인한다.", .99],
  ["teacher-textbook-05", "17-20", "particle", "조사·감탄사 지도", "보조사의 의미 추가와 상황에 맞는 감탄사 선택을 지도한다.", .98],
  ["teacher-textbook-05", "21-28", "parts-of-speech-procedure", "적용·오답·평가", "같은 형태의 품사 변화와 형용사 활용 제약을 국어 자료에 적용한다.", .99],
  ["teacher-textbook-05", "32", "morpheme", "조사·어미 선수 개념", "조사와 어미를 형태소 차원에서 구분해 품사 판별의 토대를 마련한다.", .96],
  ["teacher-textbook-05", "45-48", "parts-of-speech", "카드 활동과 자기 평가", "품사 카드 분류·설명 활동으로 판별 근거와 학습 곤란을 점검한다.", .96],
  ["teacher-textbook-06", "4, 7-10", "morpheme", "형태소·단어 선수 개념", "의미 단위 분해와 사전 확인을 이용하되 직접 성분과 형태소 분석을 혼동하지 않는다.", .95],
  ["teacher-textbook-07", "8-10", "parts-of-speech", "가변어·불변어와 5언", "형태 기준과 기능 기준을 연결해 전체 체계를 세운다.", .98],
  ["teacher-textbook-07", "12-24", "parts-of-speech-comparison", "9품사 비교", "각 품사의 공통점과 차이점을 기능과 의미의 순서로 비교한다.", .98],
  ["teacher-textbook-07", "25-30", "parts-of-speech-procedure", "문맥 판별과 평가", "동일 형태의 쓰임 차이, 올바른 활용, 담화 효과를 종합 평가한다.", .98],
  ["teacher-textbook-08", "5-7", "parts-of-speech", "단어와 세 기준", "단어의 경계를 확인한 뒤 형태·기능·의미를 구별하고 문장 성분과 혼동하지 않는다.", .99],
  ["teacher-textbook-08", "8-11", "nominal", "사전 활용과 체언", "사전 뜻풀이와 문장 기능을 함께 사용해 명사·대명사·수사를 판별한다.", .98],
  ["teacher-textbook-08", "12-17", "parts-of-speech-comparison", "용언·수식언·조사·감탄사", "활용과 수식 대상, 결합 관계, 독립성을 차례로 살핀다.", .98],
  ["teacher-textbook-08", "18-22", "parts-of-speech-procedure", "적용·평가·보충", "실제 문장과 대화에서 품사를 찾고 근거를 설명하게 한다.", .97],
];

export const textbookDraftReviewQueue: TextbookSemanticChunk[] = seeds.map(([sourceId, pageRange, conceptId, topic, synthesizedKnowledge, confidence], index) => ({
  chunkId: `pos-semantic-chunk-${String(index + 1).padStart(2, "0")}`,
  sourceId,
  publisher: `출판사 미확인(${sourceId.replace("teacher-textbook-", "자료 ")})`,
  pageRange,
  conceptId,
  topic,
  confidence,
  source: "teacherGuide",
  provenance: `${sourceId} PDF p.${pageRange}`,
  candidateTypes: ["concept_candidate", "rule_candidate", "teacher_note_candidate"],
  synthesizedKnowledge,
  reviewDecision: confidence >= .97 ? "accepted" : "edited",
  reviewerNote: "품사 관련 내용만 남기고 교사용 지도 의도를 한잎 표현으로 재구성함.",
}));

export const textbookDraftConflicts: TextbookConflictReview[] = [
  {
    conflictId: "variation-pos-teaching-order",
    conceptId: "parts-of-speech",
    sources: [
      { sourceId: "teacher-textbook-04", pageRange: "3-8", position: "분류 필요성 뒤에 기준 제시" },
      { sourceId: "teacher-textbook-08", pageRange: "5-7", position: "단어 확인 뒤에 기준 제시" },
    ],
    difference: "품사 학습의 도입 순서가 다르지만 문법적 설명은 충돌하지 않는다.",
    interpretation: "학생 상태에 따라 분류 필요성 또는 단어 경계 확인에서 시작할 수 있는 교수 변이로 통합한다.",
    resolution: "compatible_variation",
  },
  {
    conflictId: "variation-verb-adjective-test",
    conceptId: "verb-adjective-comparison",
    sources: [
      { sourceId: "teacher-textbook-05", pageRange: "13-14", position: "명령·청유형 결합을 비교 활동에 사용" },
      { sourceId: "teacher-textbook-01", pageRange: "29-31", position: "의미와 활용을 종합해 구분" },
    ],
    difference: "한 자료는 활용 제약을 두드러진 확인 기준으로, 다른 자료는 종합 기준의 일부로 다룬다.",
    interpretation: "명령·청유형 검사는 보조 기준으로만 쓰고 의미·기능·활용 양상을 함께 확인한다.",
    resolution: "resolved_merged",
  },
];

export const textbookDraftReviewReport: TextbookDraftReviewReport = {
  totalChunks: textbookDraftReviewQueue.length,
  accepted: textbookDraftReviewQueue.filter(({ reviewDecision }) => reviewDecision === "accepted").length,
  edited: textbookDraftReviewQueue.filter(({ reviewDecision }) => reviewDecision === "edited").length,
  rejected: 0,
  pending: 0,
  unresolvedConflicts: textbookDraftConflicts.filter(({ resolution }) => resolution === "unresolved").length,
  reviewer: "hanip-content-review",
  reviewedAt: TEXTBOOK_DRAFT_REVIEWED_AT,
};
