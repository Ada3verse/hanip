import { workedExampleLibrary } from "@/lib/knowledge/examples";
import { misconceptionLibrary } from "@/lib/knowledge/misconceptions";
import { numeralKnowledge } from "@/lib/knowledge/partsOfSpeech/numeral";
import { partsOfSpeechOverviewKnowledge } from "@/lib/knowledge/partsOfSpeech/overview";
import { draftGrammarProvenance } from "./defaultSources";
import { KnowledgeSourceRegistry } from "./registry";
import { selectKnowledgeBundle } from "./sourceSelector";
import type { KnowledgeCandidate, KnowledgeProvenance, KnowledgeSource } from "./types";
import { createMockChatResponse } from "@/lib/testing/mockChatResponse";

function check(condition: boolean, message: string) { if (!condition) throw new Error(`Knowledge source test failed: ${message}`); }
const source = (id: string, type: KnowledgeSource["type"], title = id): KnowledgeSource => ({ id, type, title });
const provenance = (status: KnowledgeProvenance["verificationStatus"], item: KnowledgeSource, unit?: string): KnowledgeProvenance => ({
  verificationStatus: status, sources: [item], scope: { curriculumYear: "2022", schoolLevel: "middle", subject: "국어", domain: "문법", unit },
});

export function runSourceSelectorLocalTests() {
  check([numeralKnowledge, partsOfSpeechOverviewKnowledge].every((item) => Boolean(item.provenance)), "all modules have provenance");
  check(misconceptionLibrary.every((item) => Boolean(item.provenance)), "all misconceptions have provenance");
  check(workedExampleLibrary.every((item) => Boolean(item.provenance)), "all examples have provenance");
  check([numeralKnowledge, partsOfSpeechOverviewKnowledge, ...misconceptionLibrary, ...workedExampleLibrary].every((item) => item.provenance.verificationStatus === "draft"), "current data is draft");

  const draft: KnowledgeCandidate = { concept: "품사", provenance: draftGrammarProvenance };
  const verifiedCurriculum: KnowledgeCandidate = { concept: "품사", roles: ["definition"], provenance: provenance("verified", source("curriculum", "curriculum")) };
  const reviewedTextbook: KnowledgeCandidate = { concept: "품사", roles: ["explanation", "example"], provenance: provenance("reviewed", { ...source("textbook", "textbook"), pageRange: "12-14" }, "품사") };
  const reviewedGuide: KnowledgeCandidate = { concept: "품사", roles: ["teaching", "misconception"], provenance: provenance("reviewed", source("guide", "teacher_guide")) };
  const bundle = selectKnowledgeBundle({ concept: "품사", candidates: [draft, reviewedTextbook, reviewedGuide, verifiedCurriculum], curriculumYear: "2022", schoolLevel: "middle", subject: "국어" });
  check(bundle.verificationStatus === "verified" && bundle.definitionSource?.id === "curriculum", "verified beats draft");
  check(bundle.exampleSource?.id === "textbook" && bundle.teachingSource?.id === "guide", "role sources combine");
  const reviewed = selectKnowledgeBundle({ concept: "품사", candidates: [draft, reviewedTextbook], curriculumYear: "2022", schoolLevel: "middle", subject: "국어" });
  check(reviewed.verificationStatus === "reviewed", "reviewed beats draft");
  const oldYear: KnowledgeCandidate = { concept: "품사", provenance: { ...provenance("reviewed", source("old", "textbook")), scope: { curriculumYear: "2015", schoolLevel: "middle", subject: "국어" } } };
  check(selectKnowledgeBundle({ concept: "품사", candidates: [oldYear, reviewedTextbook], curriculumYear: "2022", schoolLevel: "middle", subject: "국어" }).explanationSource?.id === "textbook", "matching curriculum year wins");
  const wrongScope = { concept: "품사", provenance: { ...draftGrammarProvenance, scope: { ...draftGrammarProvenance.scope, schoolLevel: "high" } } } as unknown as KnowledgeCandidate;
  check(selectKnowledgeBundle({ concept: "품사", candidates: [wrongScope, draft], curriculumYear: "2022", schoolLevel: "middle", subject: "국어" }).definitionSource?.id === "hanip-internal-draft", "wrong school level excluded");
  const damaged = { concept: "품사", provenance: { ...draftGrammarProvenance, sources: [{ id: "broken" }] } } as unknown as KnowledgeCandidate;
  check(selectKnowledgeBundle({ concept: "품사", candidates: [damaged], curriculumYear: "2022", schoolLevel: "middle", subject: "국어" }).definitionSource === null, "damaged provenance ignored");

  const registry = new KnowledgeSourceRegistry();
  check(registry.register(source("one", "internal"), draftGrammarProvenance), "valid source registers");
  check(!registry.register(source("one", "textbook"), draftGrammarProvenance), "duplicate blocked");
  check(!registry.register({ id: "broken" }), "damaged source ignored");
  check(registry.getByVerificationStatus("draft").length === 1 && registry.getByCurriculumYear("2022").length === 1, "registry filters work");
  const mock = createMockChatResponse({ messages: [{ role: "user", content: "품사가 뭐예요?" }] });
  check(!/hanip-internal-draft|한잎 개발용 임시 지식|draft|미검증/.test(mock.message), "source metadata hidden from student response");
  check(Boolean(mock.meta?.knowledgeBundle?.definitionSource), "mock receives selected bundle");
}
