export const KNOWLEDGE_VERIFICATION_STATUSES = ["draft", "reviewed", "verified"] as const;
export const KNOWLEDGE_SOURCE_TYPES = ["internal", "curriculum", "textbook", "teacher_guide", "official_reference"] as const;

export type KnowledgeVerificationStatus = (typeof KNOWLEDGE_VERIFICATION_STATUSES)[number];
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];
export type KnowledgeRole = "definition" | "explanation" | "example" | "misconception" | "teaching";

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  title: string;
  publisher?: string;
  edition?: string;
  pageRange?: string;
  documentId?: string;
  chunkId?: string;
  sourceUrl?: string;
  storagePath?: string;
  note?: string;
}

export interface KnowledgeScope {
  curriculumYear?: string;
  schoolLevel?: "middle";
  gradeBands?: number[];
  subject?: "국어";
  domain?: string;
  unit?: string;
}

export interface KnowledgeProvenance {
  verificationStatus: KnowledgeVerificationStatus;
  sources: KnowledgeSource[];
  scope: KnowledgeScope;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface KnowledgeCandidate {
  concept: string;
  provenance: KnowledgeProvenance;
  roles?: readonly KnowledgeRole[];
}

export interface SelectedKnowledgeBundle {
  concept: string;
  definitionSource: KnowledgeSource | null;
  explanationSource: KnowledgeSource | null;
  exampleSource: KnowledgeSource | null;
  misconceptionSource: KnowledgeSource | null;
  teachingSource: KnowledgeSource | null;
  verificationStatus: KnowledgeVerificationStatus;
}
