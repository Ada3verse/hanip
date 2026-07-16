import { CONTENT_PACK_STUDENT_FORBIDDEN_PATTERN, CONTENT_PACK_VERIFICATION_STATUSES, OFFICIAL_CONTENT_PACK_SOURCE_TYPES, normalizeContentPackKey } from "./schema";
import type { ContentPackValidationIssue, ContentPackValidationResult, KnowledgeContentPack, KnowledgeField, KnowledgeConceptEntry } from "./types";

const issue = (code: string, path: string, message: string): ContentPackValidationIssue => ({ code, path, message });
const duplicateIds = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);

export function validateKnowledgeContentPack(pack: unknown): ContentPackValidationResult {
  const errors: ContentPackValidationIssue[] = [], warnings: ContentPackValidationIssue[] = [];
  if (!pack || typeof pack !== "object") return { valid: false, errors: [issue("PACK_INVALID", "$", "Pack 객체가 필요합니다.")], warnings };
  const value = pack as KnowledgeContentPack;
  if (!value.id?.trim()) errors.push(issue("PACK_ID_REQUIRED", "id", "pack ID가 필요합니다."));
  if (!value.version?.trim()) errors.push(issue("VERSION_REQUIRED", "version", "version이 필요합니다."));
  if (value.curriculum?.curriculumYear !== "2022") errors.push(issue("CURRICULUM_YEAR_INVALID", "curriculum.curriculumYear", "2022 교육과정만 허용합니다."));
  if (value.curriculum?.schoolLevel !== "middle") errors.push(issue("SCHOOL_LEVEL_INVALID", "curriculum.schoolLevel", "중학교 자료만 허용합니다."));
  if (value.curriculum?.subject !== "국어") errors.push(issue("SUBJECT_INVALID", "curriculum.subject", "국어 자료만 허용합니다."));
  if (value.curriculum?.domain !== "문법") errors.push(issue("DOMAIN_INVALID", "curriculum.domain", "문법 영역만 허용합니다."));
  if (!Array.isArray(value.sources) || !Array.isArray(value.concepts)) errors.push(issue("PACK_ARRAY_INVALID", "$", "sources와 concepts 배열이 필요합니다."));
  if (errors.length) return { valid: false, errors, warnings };
  const sourceIds = value.sources.map(({ id }) => id);
  duplicateIds(sourceIds).forEach((id) => errors.push(issue("SOURCE_ID_DUPLICATE", "sources", `중복 source ID: ${id}`)));
  value.sources.forEach((source, index) => {
    if (!source.id || !source.title || !["internal", ...OFFICIAL_CONTENT_PACK_SOURCE_TYPES].includes(source.type)) errors.push(issue("SOURCE_INVALID", `sources[${index}]`, "출처 필드 또는 유형이 올바르지 않습니다."));
  });
  const conceptIds = value.concepts.map(({ id }) => id);
  duplicateIds(conceptIds).forEach((id) => errors.push(issue("CONCEPT_ID_DUPLICATE", "concepts", `중복 concept ID: ${id}`)));
  const allItemIds: string[] = [];
  const sourceSet = new Set(sourceIds), conceptSet = new Set(conceptIds);
  const validateField = (field: KnowledgeField, path: string) => {
    allItemIds.push(field.id);
    if (!field.content?.trim()) errors.push(issue("CONTENT_EMPTY", path, "빈 지식 내용은 허용하지 않습니다."));
    if (!CONTENT_PACK_VERIFICATION_STATUSES.includes(field.verificationStatus)) errors.push(issue("STATUS_INVALID", path, "검증 상태가 올바르지 않습니다."));
    field.sourceIds.forEach((id) => { if (!sourceSet.has(id)) errors.push(issue("SOURCE_REFERENCE_MISSING", path, `없는 source ID: ${id}`)); });
    if (CONTENT_PACK_STUDENT_FORBIDDEN_PATTERN.test(field.content)) errors.push(issue("STUDENT_TEXT_INTERNAL_META", path, "학생용 내용에 내부 출처·상태 표현이 포함됐습니다."));
    if (field.verificationStatus === "verified") {
      const sources = value.sources.filter(({ id }) => field.sourceIds.includes(id));
      if (!sources.some(({ type }) => OFFICIAL_CONTENT_PACK_SOURCE_TYPES.includes(type as never))) errors.push(issue("VERIFIED_OFFICIAL_SOURCE_REQUIRED", path, "verified 항목에는 공식 출처가 필요합니다."));
      if (!field.pageRange && !sources.some(({ pageRange, documentId }) => pageRange || documentId)) warnings.push(issue("VERIFIED_LOCATION_MISSING", path, "verified 자료에 pageRange 또는 documentId가 없습니다."));
    }
  };
  value.concepts.forEach((concept: KnowledgeConceptEntry, index) => {
    const path = `concepts[${index}]`;
    if (concept.parentConceptId && !conceptSet.has(concept.parentConceptId)) errors.push(issue("PARENT_MISSING", `${path}.parentConceptId`, "부모 concept가 없습니다."));
    concept.prerequisiteConceptIds.forEach((id) => { if (!conceptSet.has(id)) errors.push(issue("PREREQUISITE_MISSING", `${path}.prerequisiteConceptIds`, `없는 선수 concept: ${id}`)); });
    if (concept.relatedConceptIds.includes(concept.id)) errors.push(issue("RELATED_SELF_REFERENCE", `${path}.relatedConceptIds`, "자기 자신을 관련 concept로 참조할 수 없습니다."));
    const aliases = concept.aliases.map(normalizeContentPackKey);
    if (new Set(aliases).size !== aliases.length) errors.push(issue("ALIAS_DUPLICATE", `${path}.aliases`, "정규화 후 중복 alias가 있습니다."));
    [concept.definition, ...concept.explanation, ...concept.classificationCriteria, ...concept.comparisonCriteria].filter(Boolean).forEach((field) => validateField(field as KnowledgeField, path));
    for (const item of [...concept.examples, ...concept.misconceptions, ...concept.teachingPrompts, ...concept.completionCriteria]) {
      allItemIds.push(item.id); item.sourceIds.forEach((id) => { if (!sourceSet.has(id)) errors.push(issue("SOURCE_REFERENCE_MISSING", path, `없는 source ID: ${id}`)); });
      if (!CONTENT_PACK_VERIFICATION_STATUSES.includes(item.verificationStatus)) errors.push(issue("STATUS_INVALID", path, "검증 상태가 올바르지 않습니다."));
      if (item.verificationStatus === "verified") {
        const sources = value.sources.filter(({ id }) => item.sourceIds.includes(id));
        if (!sources.some(({ type }) => OFFICIAL_CONTENT_PACK_SOURCE_TYPES.includes(type as never))) errors.push(issue("VERIFIED_OFFICIAL_SOURCE_REQUIRED", path, "verified 항목에는 공식 출처가 필요합니다."));
        if (!sources.some(({ pageRange, documentId }) => pageRange || documentId)) warnings.push(issue("VERIFIED_LOCATION_MISSING", path, "verified 자료 위치가 없습니다."));
      }
    }
  });
  duplicateIds(allItemIds).forEach((id) => errors.push(issue("ENTRY_ID_DUPLICATE", "concepts", `중복 항목 ID: ${id}`)));
  const visiting = new Set<string>(), visited = new Set<string>(), byId = new Map(value.concepts.map((concept) => [concept.id, concept]));
  const visit = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); const cycle = (byId.get(id)?.prerequisiteConceptIds ?? []).some(visit); visiting.delete(id); visited.add(id); return cycle; };
  if (conceptIds.some(visit)) errors.push(issue("PREREQUISITE_CYCLE", "concepts", "선수 concept 순환이 있습니다."));
  return { valid: errors.length === 0, errors, warnings };
}
