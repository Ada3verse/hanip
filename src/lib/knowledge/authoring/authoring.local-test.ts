import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import { calculateConceptCoverage } from "./coverage";
import { importRawSourceChunks } from "./rawImporter";
import { registerAuthoringPack, resetAuthoringPacksForTest, selectAuthoringEvidence } from "./registry";
import { authoringSamplePack } from "./samplePack";
import { validateAuthoringPack } from "./validator";
import type { AuthoringKnowledgePack } from "./types";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function check(value: unknown, label: string) { if (!value) throw new Error(`Knowledge authoring test failed: ${label}`); }
export function runKnowledgeAuthoringLocalTests() {
  resetAuthoringPacksForTest();
  check(registerAuthoringPack(authoringSamplePack).registered, "A valid pack registration");
  const missing = clone(authoringSamplePack) as AuthoringKnowledgePack; missing.title = ""; check(!validateAuthoringPack(missing).valid, "B metadata missing blocked");
  const duplicate = clone(authoringSamplePack); duplicate.concepts.push(clone(duplicate.concepts[0])); check(validateAuthoringPack(duplicate).issues.some(({ code }) => code === "KNOWLEDGE_PACK_DUPLICATE_CONCEPT"), "C duplicate concept blocked");
  const cycle = clone(authoringSamplePack); cycle.concepts[0].prerequisites = [cycle.concepts.at(-1)!.conceptId]; check(validateAuthoringPack(cycle).issues.some(({ code }) => code === "KNOWLEDGE_PACK_PREREQUISITE_CYCLE"), "D cycle detected");
  const absent = clone(authoringSamplePack); absent.concepts[0].prerequisites = ["missing"]; check(validateAuthoringPack(absent).issues.some(({ code }) => code === "KNOWLEDGE_PACK_PREREQUISITE_MISSING"), "E missing prerequisite detected");
  const verified = clone(authoringSamplePack); verified.status = "verified"; verified.provenance[0].verificationStatus = "verified"; check(validateAuthoringPack(verified).issues.some(({ code }) => code === "KNOWLEDGE_PACK_SOURCE_MISSING"), "F verified review source required");
  const long = clone(authoringSamplePack); long.concepts[0].summary = "가".repeat(501); check(validateAuthoringPack(long).issues.some(({ code }) => code === "COPYRIGHT_RISK_LONG_SOURCE_COPY"), "G long-copy warning");
  const duplicateExample = clone(authoringSamplePack); duplicateExample.concepts[0].examples[1].sentence = duplicateExample.concepts[0].examples[0].sentence; check(validateAuthoringPack(duplicateExample).issues.some(({ code }) => code === "DUPLICATE_EXAMPLE"), "H duplicate example detected");
  const coverage = calculateConceptCoverage(authoringSamplePack.concepts[0]); check(coverage.score === 100 && Object.values(coverage.roles).every(({ complete }) => complete), "I coverage calculation");
  resetAuthoringPacksForTest(); const draft = clone(authoringSamplePack); const reviewed = clone(authoringSamplePack); reviewed.packId = "reviewed"; reviewed.status = "reviewed"; const good = clone(authoringSamplePack); good.packId = "verified"; good.status = "verified"; good.provenance[0] = { ...good.provenance[0], verificationStatus: "verified", sourceType: "officialReference", pageRange: "1", reviewedBy: "reviewer", reviewedAt: "2026-07-17T00:00:00.000Z" }; registerAuthoringPack(draft); registerAuthoringPack(reviewed); registerAuthoringPack(good); check(selectAuthoringEvidence({ concept: "명사", action: "explain", production: false, allowReviewed: true, allowDevelopmentDraft: true })?.status === "verified", "J verified priority");
  resetAuthoringPacksForTest(); registerAuthoringPack(draft); check(selectAuthoringEvidence({ concept: "명사", action: "explain", production: true }) === null, "K production excludes draft"); check(selectAuthoringEvidence({ concept: "명사", action: "explain", production: false, allowDevelopmentDraft: true })?.status === "draft", "L mock development allows sample draft");
  const imported = importRawSourceChunks([{ sourceId: "raw", documentId: "doc", pageRange: "1", heading: "품사", rawText: "", normalizedText: "품사는 갈래이다. 구분 기준을 확인한다. 예를 들어 사람이다.", extractionMethod: "manual", confidence: .9 }]); check(imported.every(({ status }) => status === "draft"), "M raw chunks remain draft");
  const mock = createMockChatResponse({ messages: [{ role: "user", content: "품사가 뭐예요?" }] }); check(!/sourceId|documentId|pageRange/.test(mock.message), "N provenance hidden from student");
  const selected = selectAuthoringEvidence({ concept: "명사", action: "explain", production: false, allowDevelopmentDraft: true }); check((selected?.evidence.length ?? 99) <= 2 && !JSON.stringify(selected).includes("workedExamples"), "O minimal evidence, not full pack");
  check(selectAuthoringEvidence({ concept: "명사", action: "explain", production: true }) === null, "P development draft blocked in production"); resetAuthoringPacksForTest();
  return 16;
}
