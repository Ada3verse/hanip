import { partsOfSpeechTextbookDraftAudit } from "./audit";
import { partsOfSpeechTextbookDraftPack } from "./pack";
import { textbookDraftReviewQueue, textbookDraftReviewReport } from "./reviewQueue";

export interface TextbookDraftTestResult { name: string; passed: boolean; detail: string; }
const result = (name: string, passed: boolean, detail: string): TextbookDraftTestResult => ({ name, passed, detail });

export function runPartsOfSpeechTextbookDraftLocalTests(): TextbookDraftTestResult[] {
  const concepts = partsOfSpeechTextbookDraftPack.concepts;
  const results = [
    result("A Draft 상태", partsOfSpeechTextbookDraftAudit.draftOnly, partsOfSpeechTextbookDraftPack.status),
    result("B Validator 무결점", partsOfSpeechTextbookDraftAudit.valid, `${partsOfSpeechTextbookDraftAudit.validation.issues.length} issues`),
    result("C Coverage 100%", partsOfSpeechTextbookDraftAudit.coveragePassed, `${partsOfSpeechTextbookDraftAudit.coverage.filter(({ score }) => score === 100).length}/${concepts.length}`),
    result("D 필수 주제", partsOfSpeechTextbookDraftAudit.missingRequiredTopics.length === 0, partsOfSpeechTextbookDraftAudit.missingRequiredTopics.join(", ") || "complete"),
    result("E Review Queue 완료", partsOfSpeechTextbookDraftAudit.reviewPassed, `${textbookDraftReviewReport.totalChunks} chunks, ${textbookDraftReviewReport.pending} pending`),
    result("F Conflict 해소", partsOfSpeechTextbookDraftAudit.unresolvedConflicts.length === 0, `${partsOfSpeechTextbookDraftAudit.unresolvedConflicts.length} unresolved`),
    result("G 의미 단위 Chunk", textbookDraftReviewQueue.every(({ conceptId, topic, synthesizedKnowledge }) => Boolean(conceptId && topic && synthesizedKnowledge)), `${textbookDraftReviewQueue.length} semantic chunks`),
    result("H 출처·페이지", textbookDraftReviewQueue.every(({ publisher, pageRange, source, provenance }) => Boolean(publisher && pageRange && source && provenance)), "metadata complete"),
    result("I 교사용 지식", partsOfSpeechTextbookDraftAudit.conceptMetadataComplete, "FAQ/strategy/questions/evaluation"),
    result("J 예문 분석", concepts.every(({ examples }) => examples.length >= 6 && examples.every(({ analysis, explanation }) => Boolean(analysis && explanation))), "6+ examples per concept"),
    result("K Worked Example", concepts.every(({ workedExamples }) => workedExamples.length >= 2), "2+ per concept"),
    result("L 공개 금지", !["published", "verified"].includes(partsOfSpeechTextbookDraftPack.status), "not released or published"),
  ];
  const failed = results.filter(({ passed }) => !passed);
  if (failed.length) throw new Error(`Textbook Draft local test failed: ${failed.map(({ name, detail }) => `${name}(${detail})`).join(", ")}`);
  return results;
}

export const partsOfSpeechTextbookDraftLocalTests = runPartsOfSpeechTextbookDraftLocalTests();
