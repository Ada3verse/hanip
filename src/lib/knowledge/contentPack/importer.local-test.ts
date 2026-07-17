import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import { retrieveKnowledge } from "@/lib/knowledge/retrieval/retrievalEngine";
import type { DialoguePlan } from "@/lib/dialogue/types";
import { getImportedCompletionCriteria, getImportedContentPacks, getImportedDependencies, getImportedKnowledgeModules, importKnowledgeContentPack, resetImportedContentPacksForTest } from "./importer";
import { sampleDraftPack } from "./sampleDraftPack";

function check(condition: boolean, message: string) { if (!condition) throw new Error(`Content Pack importer test failed: ${message}`); }
const plan: DialoguePlan = { activeConcept: "형태소", action: "explain", questionPurpose: "설명", requiredFocus: "형태소", forbiddenTopics: [], suggestedReplyMode: "choice", maxQuestions: 1, reason: [], hintLevel: 3, hintType: "core_criterion" };
export function runContentPackImporterLocalTests() {
  resetImportedContentPacksForTest();
  const first = importKnowledgeContentPack(sampleDraftPack); check(first.imported && !first.idempotent, "sample imported");
  check(importKnowledgeContentPack(sampleDraftPack).idempotent && getImportedContentPacks().length === 1, "idempotent reimport");
  const broken = structuredClone(sampleDraftPack); broken.id = "broken-pack"; broken.concepts[0].definition!.sourceIds = ["missing"];
  const count = getImportedContentPacks().length; check(!importKnowledgeContentPack(broken).imported && getImportedContentPacks().length === count, "invalid pack atomic rejection");
  const update = structuredClone(sampleDraftPack); update.version = "1.1.0"; update.updatedAt = "2026-07-16T00:00:00.000Z";
  check(importKnowledgeContentPack(update).updated && getImportedContentPacks().length === 1, "new version updates");
  const verified = structuredClone(sampleDraftPack); verified.id = "verified-fixture-pack"; verified.title = "검증 우선순위 테스트용 가상 자료"; verified.version = "1.0.0";
  verified.sources.push({ id: "verified-fixture-source", type: "curriculum", title: "검증 우선순위 테스트용 가상 자료", pageRange: "테스트 1쪽", note: "실제 공식 문구가 아닌 테스트 fixture" });
  verified.concepts[0].definition = { ...verified.concepts[0].definition!, content: "테스트용 검증 우선 정의", sourceIds: ["verified-fixture-source"], verificationStatus: "verified", pageRange: "테스트 1쪽" };
  check(importKnowledgeContentPack(verified).imported, "verified fixture imported");
  const retrieval = retrieveKnowledge({ dialoguePlan: plan });
  check(retrieval.usedEvidence.some(({ content }) => content === "테스트용 검증 우선 정의") && retrieval.selectedSources.some(({ id }) => id === "verified-fixture-source"), "verified evidence beats draft");
  check(getImportedKnowledgeModules().length >= 6 && getImportedCompletionCriteria().length >= 6 && getImportedDependencies().some(({ id, prerequisites }) => id === "word" && prerequisites.includes("morpheme")), "role libraries and dependency graph connected");
  const mock = createMockChatResponse({ messages: [{ role: "user", content: "형태소가 뭐예요?" }] });
  check(!/verified-fixture-source|verificationStatus|테스트 fixture/.test(mock.message), "student response hides source metadata");
  resetImportedContentPacksForTest();
}
