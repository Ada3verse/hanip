import type { AuthoringProvenance } from "@/lib/knowledge/authoring/types";

export const TEXTBOOK_DRAFT_REVIEWED_AT = "2026-07-17T00:00:00.000Z";

export const textbookDraftProvenance: AuthoringProvenance[] = [
  ["teacher-textbook-01", "17-47", "품사 분류 기준, 9품사, 적용·평가"],
  ["teacher-textbook-02", "4-9, 23", "단어와 형태소 선수 개념"],
  ["teacher-textbook-03", "3, 6-19", "단어·형태소와 단어 분석 지도"],
  ["teacher-textbook-04", "3-24", "품사 체계, 활용, 품사별 특성"],
  ["teacher-textbook-05", "2-28, 32, 45-48", "품사 전 단원, 교사 발문, 오답·평가"],
  ["teacher-textbook-06", "4-10", "단어·형태소 선수 개념과 지도 유의점"],
  ["teacher-textbook-07", "3-30", "형태·기능·의미 분류와 실제 적용"],
  ["teacher-textbook-08", "3-22", "품사 판별, 사전 활용, 평가"],
].map(([sourceId, pageRange, evidenceSummary], index) => ({
  sourceId,
  sourceType: "teacherGuide",
  title: `중학교 국어 교사용 교과서 품사 관련 자료 ${index + 1}`,
  publisher: `출판사 미확인(사용자 제공 자료 ${index + 1})`,
  edition: "사용자 제공본",
  pageRange,
  documentId: `hanip-textbook-source-${String(index + 1).padStart(2, "0")}`,
  note: "PDF 자체에 출판사 식별 메타데이터가 없어 자료 번호로 보존함. 페이지는 PDF 페이지 번호 기준.",
  verificationStatus: "reviewed",
  reviewedBy: "hanip-content-review",
  reviewedAt: TEXTBOOK_DRAFT_REVIEWED_AT,
  evidenceSummary,
}));

export const allTextbookSourceIds = textbookDraftProvenance.map(({ sourceId }) => sourceId);
export const fullUnitSourceIds = ["teacher-textbook-01", "teacher-textbook-04", "teacher-textbook-05", "teacher-textbook-07", "teacher-textbook-08"];
export const prerequisiteSourceIds = ["teacher-textbook-02", "teacher-textbook-03", "teacher-textbook-06"];
