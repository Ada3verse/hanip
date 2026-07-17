import { calculateConceptCoverage } from "./coverage";
import type { AuthoringIssue, AuthoringKnowledgePack, AuthoringValidation } from "./types";

const internalLeak = /sourceId|documentId|pageRange|verificationStatus|chunkId/i;
const issue = (severity: AuthoringIssue["severity"], code: string, path: string, message: string): AuthoringIssue => ({ severity, code, path, message });
export function validateAuthoringPack(input: unknown): AuthoringValidation {
  const issues: AuthoringIssue[] = [];
  if (!input || typeof input !== "object") return { valid: false, issues: [issue("error", "KNOWLEDGE_PACK_REQUIRED_FIELD_MISSING", "$", "Pack 객체가 필요합니다.")] };
  const pack = input as AuthoringKnowledgePack;
  for (const key of ["packId", "title", "subject", "domain", "curriculumYear", "schoolLevel", "version", "createdAt", "updatedAt"] as const) if (!pack[key]) issues.push(issue("error", "KNOWLEDGE_PACK_REQUIRED_FIELD_MISSING", key, `${key}가 필요합니다.`));
  if (pack.schemaVersion !== 2 || !Array.isArray(pack.concepts) || !Array.isArray(pack.provenance)) issues.push(issue("error", "KNOWLEDGE_PACK_REQUIRED_FIELD_MISSING", "$", "schemaVersion 2와 배열 필드가 필요합니다."));
  if (!Array.isArray(pack.concepts) || !Array.isArray(pack.provenance)) return { valid: false, issues };
  const ids = pack.concepts.map(({ conceptId }) => conceptId), idSet = new Set(ids), sourceSet = new Set(pack.provenance.map(({ sourceId }) => sourceId));
  ids.filter((id, index) => ids.indexOf(id) !== index).forEach((id) => issues.push(issue("error", "KNOWLEDGE_PACK_DUPLICATE_CONCEPT", "concepts", `중복 conceptId: ${id}`)));
  const aliasOwner = new Map<string, string>();
  for (const concept of pack.concepts) for (const alias of concept.aliases) { const key = alias.replace(/\s/g, "").toLowerCase(); const owner = aliasOwner.get(key); if (owner && owner !== concept.conceptId) issues.push(issue("error", "KNOWLEDGE_PACK_ALIAS_COLLISION", concept.conceptId, `alias 충돌: ${alias}`)); else aliasOwner.set(key, concept.conceptId); }
  for (const concept of pack.concepts) {
    const path = `concepts.${concept.conceptId}`;
    concept.prerequisites.forEach((id) => { if (!idSet.has(id)) issues.push(issue("error", "KNOWLEDGE_PACK_PREREQUISITE_MISSING", path, `없는 선수 개념: ${id}`)); });
    concept.nextConcepts.forEach((id) => { const next = pack.concepts.find((item) => item.conceptId === id); if (!next || !next.prerequisites.includes(concept.conceptId)) issues.push(issue("warning", "KNOWLEDGE_PACK_NEXT_BACKLINK_MISMATCH", path, `후속 개념 역참조 불일치: ${id}`)); });
    if (!Object.values(concept.definition).every(Boolean)) issues.push(issue("error", "KNOWLEDGE_PACK_DEFINITION_MISSING", path, "3단계 정의가 필요합니다."));
    if (!concept.completionCriteria.length) issues.push(issue("error", "KNOWLEDGE_PACK_COMPLETION_MISSING", path, "완료 기준이 필요합니다."));
    if (!concept.discriminationRules.length) issues.push(issue("error", "KNOWLEDGE_PACK_DISCRIMINATION_MISSING", path, "판별 기준이 필요합니다."));
    if (!concept.misconceptions.length) issues.push(issue("error", "KNOWLEDGE_PACK_MISCONCEPTION_MISSING", path, "오개념 자료가 필요합니다."));
    const sentences = concept.examples.map(({ sentence }) => sentence.trim());
    if (new Set(sentences).size !== sentences.length) issues.push(issue("error", "DUPLICATE_EXAMPLE", path, "동일 예문이 중복되었습니다."));
    for (const check of concept.checks) { if (new Set(check.options).size !== check.options.length) issues.push(issue("error", "KNOWLEDGE_PACK_DUPLICATE_OPTION", path, `선택지 중복: ${check.checkId}`)); if (check.options.length && !check.options.includes(check.correctAnswer)) issues.push(issue("error", "KNOWLEDGE_PACK_ANSWER_MISMATCH", path, `정답과 선택지가 불일치: ${check.checkId}`)); if (check.acceptedPatterns.some((pattern) => check.options.some((option) => option !== check.correctAnswer && new RegExp(pattern).test(option)))) issues.push(issue("error", "KNOWLEDGE_PACK_PATTERN_CONFLICT", path, `acceptedPatterns 충돌: ${check.checkId}`)); }
    const texts = [concept.summary, ...Object.values(concept.definition), ...concept.explanations.map(({ content }) => content)];
    if (texts.some((text) => text.length > 500)) issues.push(issue("warning", "COPYRIGHT_RISK_LONG_SOURCE_COPY", path, "출판사 원문으로 의심되는 장문을 검토하세요."));
    if ([concept.difficulty, ...concept.examples.map(({ difficulty }) => difficulty), ...concept.checks.map(({ difficulty }) => difficulty)].some((value) => value < 1 || value > 5)) issues.push(issue("error", "KNOWLEDGE_PACK_DIFFICULTY_INVALID", path, "난이도는 1~5여야 합니다."));
    if (texts.some((text) => internalLeak.test(text))) issues.push(issue("error", "INTERNAL_PROVENANCE_EXPOSED", path, "학생용 내용에 내부 출처 필드가 포함됐습니다."));
    concept.provenanceIds.forEach((id) => { if (!sourceSet.has(id)) issues.push(issue("error", "KNOWLEDGE_PACK_SOURCE_MISSING", path, `없는 provenance: ${id}`)); });
    const coverage = calculateConceptCoverage(concept); if (coverage.score < 100) issues.push(issue("warning", "KNOWLEDGE_COVERAGE_INSUFFICIENT", path, `coverage ${coverage.score}%`));
  }
  const visiting = new Set<string>(), visited = new Set<string>(), byId = new Map(pack.concepts.map((item) => [item.conceptId, item]));
  const visit = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); const cyclic = (byId.get(id)?.prerequisites ?? []).some(visit); visiting.delete(id); visited.add(id); return cyclic; };
  if (ids.some(visit)) issues.push(issue("error", "KNOWLEDGE_PACK_PREREQUISITE_CYCLE", "concepts", "선수 개념 순환이 있습니다."));
  for (const source of pack.provenance) { if (source.verificationStatus === "verified" && (!source.reviewedBy || !source.reviewedAt || !source.pageRange)) issues.push(issue("error", "KNOWLEDGE_PACK_SOURCE_MISSING", `provenance.${source.sourceId}`, "verified 출처에는 검토자·검토일·페이지 범위가 필요합니다.")); }
  return { valid: !issues.some(({ severity }) => severity === "error"), issues };
}
