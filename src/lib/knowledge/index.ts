import { numeralKnowledge } from "@/lib/knowledge/partsOfSpeech/numeral";
import { partsOfSpeechOverviewKnowledge } from "@/lib/knowledge/partsOfSpeech/overview";
import { workedExampleLibrary } from "@/lib/knowledge/examples";
import { misconceptionLibrary } from "@/lib/knowledge/misconceptions";
import { selectKnowledgeBundle } from "@/lib/knowledge/source/sourceSelector";
import type { KnowledgeCandidate, SelectedKnowledgeBundle } from "@/lib/knowledge/source/types";

export {
  deriveAdaptiveLevel,
  findRelevantWorkedExample,
  workedExampleLibrary,
} from "@/lib/knowledge/examples";
export type {
  ExampleDifficulty,
  WorkedExample,
  WorkedExampleMatch,
} from "@/lib/knowledge/examples";
export {
  findRelevantMisconception,
  misconceptionLibrary,
} from "@/lib/knowledge/misconceptions";
export type {
  MisconceptionDefinition,
  MisconceptionMatch,
} from "@/lib/knowledge/misconceptions";

export { numeralKnowledge, partsOfSpeechOverviewKnowledge };
export { selectKnowledgeBundle } from "@/lib/knowledge/source/sourceSelector";
export { defaultKnowledgeSourceRegistry, draftGrammarProvenance } from "@/lib/knowledge/source/defaultSources";
export type { KnowledgeProvenance, KnowledgeSource, SelectedKnowledgeBundle } from "@/lib/knowledge/source/types";
export {
  retrieveKnowledge,
  buildRetrievalContext,
  getEvaluationCompletionCriteria,
} from "@/lib/knowledge/retrieval/retrievalEngine";
export { toKnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
export type { KnowledgeEvidenceBundle, KnowledgeRetrievalResult, RetrievedEvidence, RetrievalRole } from "@/lib/knowledge/retrieval/types";
export { importKnowledgeContentPack, getImportedContentPacks, getImportedConceptEntries, getImportedKnowledgeModules, getImportedExamples, getImportedMisconceptions, getImportedCompletionCriteria, getImportedDependencies } from "@/lib/knowledge/contentPack/importer";
export { validateKnowledgeContentPack } from "@/lib/knowledge/contentPack/validator";
export { sampleDraftPack } from "@/lib/knowledge/contentPack/sampleDraftPack";
export type { KnowledgeContentPack, KnowledgeConceptEntry, ContentPackValidationResult } from "@/lib/knowledge/contentPack/types";

export type KnowledgeModule =
  | typeof numeralKnowledge
  | typeof partsOfSpeechOverviewKnowledge;

const NUMERAL_KEYWORDS = [
  "수사",
  "수관형사",
  "숫자",
  "수량",
  "순서",
  "하나",
  "둘",
  "셋",
  "한사람",
  "두학생",
  "세사람",
  "첫째",
  "첫번째",
];

const PARTS_OF_SPEECH_OVERVIEW_KEYWORDS = [
  "품사",
  "단어의종류",
  "형태기능의미",
  "체언",
  "용언",
  "수식언",
  "관계언",
  "독립언",
  "9품사",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function findRelevantKnowledge(
  recentStudentMessage: string,
  currentConcept = "",
): KnowledgeModule | null {
  const searchText = normalize(`${recentStudentMessage} ${currentConcept}`);
  const registry: Array<{
    knowledge: KnowledgeModule;
    keywords: readonly string[];
  }> = [
    { knowledge: numeralKnowledge, keywords: NUMERAL_KEYWORDS },
    {
      knowledge: partsOfSpeechOverviewKnowledge,
      keywords: PARTS_OF_SPEECH_OVERVIEW_KEYWORDS,
    },
  ];

  const match = registry.find(({ keywords }) =>
    keywords.some((keyword) => searchText.includes(normalize(keyword))),
  );

  return match?.knowledge ?? null;
}

export function getKnowledgeCandidates(concept: string): KnowledgeCandidate[] {
  const normalized = normalize(concept);
  const moduleCandidates = [numeralKnowledge, partsOfSpeechOverviewKnowledge]
    .filter((item) => normalized.includes(normalize(item.concept)) || normalize(item.concept).includes(normalized))
    .map((item) => ({ concept: item.concept, provenance: item.provenance }));
  const exampleCandidates = workedExampleLibrary
    .filter((item) => normalized.includes(normalize(item.concept)) || normalize(item.concept).includes(normalized))
    .map((item) => ({ concept: item.concept, provenance: item.provenance, roles: ["example"] as const }));
  const misconceptionCandidates = misconceptionLibrary
    .filter((item) => item.concepts.some((itemConcept) => normalized.includes(normalize(itemConcept)) || normalize(itemConcept).includes(normalized)))
    .map((item) => ({ concept: item.concepts[0], provenance: item.provenance, roles: ["misconception"] as const }));
  return [...moduleCandidates, ...exampleCandidates, ...misconceptionCandidates];
}

export function findKnowledgeBundle(concept: string): SelectedKnowledgeBundle {
  return selectKnowledgeBundle({
    concept,
    candidates: getKnowledgeCandidates(concept),
    curriculumYear: "2022",
    schoolLevel: "middle",
    subject: "국어",
  });
}
