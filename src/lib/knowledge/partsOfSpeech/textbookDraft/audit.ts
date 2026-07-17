import { calculateConceptCoverage } from "@/lib/knowledge/authoring/coverage";
import { validateAuthoringPack } from "@/lib/knowledge/authoring/validator";
import { partsOfSpeechTextbookDraftPack } from "./pack";
import { textbookDraftConflicts, textbookDraftReviewReport } from "./reviewQueue";

const requiredTitles = [
  "형태소", "단어", "품사", "체언", "용언", "수식언", "관계언", "독립언",
  "명사", "대명사", "수사", "동사", "형용사", "관형사", "부사", "조사", "감탄사",
  "가변어", "불변어", "활용", "기본형", "품사 판별 기준", "품사와 문장 성분의 차이",
  "품사 비교", "품사 판별 절차",
];

export function auditPartsOfSpeechTextbookDraft() {
  const validation = validateAuthoringPack(partsOfSpeechTextbookDraftPack);
  const coverage = partsOfSpeechTextbookDraftPack.concepts.map(calculateConceptCoverage);
  const titleSet = new Set(partsOfSpeechTextbookDraftPack.concepts.map(({ title }) => title));
  const missingRequiredTopics = requiredTitles.filter((title) => !titleSet.has(title));
  const unresolvedConflicts = textbookDraftConflicts.filter(({ resolution }) => resolution === "unresolved");
  const conceptMetadataComplete = partsOfSpeechTextbookDraftPack.concepts.every((concept) =>
    concept.provenanceIds.length > 0 &&
    concept.decisionProcedure?.length &&
    concept.faq?.length &&
    concept.teacherStrategies?.length &&
    concept.studentQuestions?.length &&
    concept.evaluationPoints?.length,
  );
  return {
    valid: validation.valid && validation.issues.length === 0,
    validation,
    coverage,
    coveragePassed: coverage.every(({ score }) => score === 100),
    missingRequiredTopics,
    unresolvedConflicts,
    reviewPassed: textbookDraftReviewReport.pending === 0 && textbookDraftReviewReport.unresolvedConflicts === 0,
    conceptMetadataComplete: Boolean(conceptMetadataComplete),
    draftOnly: partsOfSpeechTextbookDraftPack.status === "draft" && partsOfSpeechTextbookDraftPack.version.includes("draft"),
  };
}

export const partsOfSpeechTextbookDraftAudit = auditPartsOfSpeechTextbookDraft();
