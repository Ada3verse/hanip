import type { AuthoringKnowledgePack, AuthoringValidation, ConceptCoverage } from "@/lib/knowledge/authoring/types";
import type { ExtractedPage, IngestionSourceChunk, ReviewItem, ContentConflict, SourceDocument, SourceType } from "@/lib/knowledge/ingestion/types";
import type { KnowledgePackRelease, PackWorkflow } from "@/lib/knowledge/release/types";

export type ImportWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export interface ImportDocumentMetadata { title: string; sourceType: SourceType; publisher: string; edition: string; curriculumYear: string; schoolLevel: "middle"; gradeRange: number[]; subject: "국어"; domain: string; semester: string; note: string; }
export interface ImportFileInspection { fileName: string; mimeType: string; fileSize: number; pageCount: number; checksum: string; encrypted: boolean; extractable: boolean; warnings: string[]; errors: string[]; }
export interface ImportWizardState {
  wizardId: string;
  currentStep: ImportWizardStep;
  fileInspection: ImportFileInspection | null;
  metadata: ImportDocumentMetadata;
  sourceDocument: SourceDocument | null;
  extractedPages: ExtractedPage[];
  approvedPageNumbers: number[];
  originalNormalizedText: Record<string, string>;
  chunks: IngestionSourceChunk[];
  reviewItems: ReviewItem[];
  conflicts: ContentConflict[];
  draftPack: AuthoringKnowledgePack | null;
  validationResult: AuthoringValidation | null;
  coverageResult: ConceptCoverage[];
  reviewState: PackWorkflow | null;
  releaseCandidate: KnowledgePackRelease | null;
  releaseNotes: string;
  dirty: boolean;
  lastSavedAt: string | null;
  createdAt: string;
  updatedAt: string;
  errors: string[];
}
export interface WizardGateResult { allowed: boolean; reason: string; }
