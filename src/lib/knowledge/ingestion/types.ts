import type { AuthoringKnowledgePack } from "@/lib/knowledge/authoring/types";

export const SOURCE_LIMITS = { maxFileSize: 50 * 1024 * 1024, maxPages: 500, allowedExtensions: ["pdf"], allowedMimeTypes: ["application/pdf"] } as const;
export type SourceType = "curriculum" | "textbook" | "teacherGuide" | "officialReference" | "internalOriginal";
export type ExtractionStatus = "pending" | "extracting" | "extracted" | "partial" | "failed";
export type ReviewStatus = "unreviewed" | "reviewing" | "reviewed" | "rejected";
export interface SourceDocument { documentId: string; sourceId: string; title: string; sourceType: SourceType; publisher?: string; edition?: string; curriculumYear: string; schoolLevel: "middle"; gradeRange: number[]; subject: "국어"; uploadedFileName: string; mimeType: string; fileSize: number; pageCount: number; checksum: string; extractionStatus: ExtractionStatus; reviewStatus: ReviewStatus; createdAt: string; updatedAt: string; }
export interface SourceFileInput { fileName: string; mimeType: string; bytes: Uint8Array; claimedPageCount?: number; encrypted?: boolean; corrupted?: boolean; }
export interface ExtractedPage { documentId: string; pageNumber: number; rawText: string; normalizedText: string; headingCandidates: string[]; extractionConfidence: number; warnings: string[]; createdAt: string; }
export type ChunkStatus = "raw" | "normalized" | "classified" | "reviewed" | "rejected";
export interface IngestionSourceChunk { chunkId: string; sourceId: string; documentId: string; pageRange: string; heading: string; rawText: string; normalizedText: string; tokenEstimate: number; extractionMethod: string; confidence: number; note: string; status: ChunkStatus; candidateTypes: CandidateType[]; reason: string[]; }
export type CandidateType = "concept_candidate" | "definition_candidate" | "rule_candidate" | "example_candidate" | "counterexample_candidate" | "misconception_candidate" | "check_question_candidate" | "worked_example_candidate" | "completion_criteria_candidate" | "teacher_note_candidate" | "irrelevant" | "needs_manual_review";
export type ReviewDecision = "pending" | "accepted" | "edited" | "rejected" | "deferred";
export interface ReviewItem { reviewItemId: string; documentId: string; chunkId: string; sourceId: string; pageRange: string; candidateTypes: CandidateType[]; proposedConceptIds: string[]; proposedContent: string; reviewerDecision: ReviewDecision; reviewerNote: string; status: ReviewDecision; verificationStatus: "draft"; createdAt: string; updatedAt: string; }
export type ConflictStatus = "unresolved" | "resolved_existing" | "resolved_proposed" | "resolved_merged" | "deferred";
export interface ContentConflict { conflictId: string; conceptId: string; field: string; existingValue: string; proposedValue: string; existingSources: string[]; proposedSources: string[]; severity: "low" | "medium" | "high"; status: ConflictStatus; reviewerNote: string; }
export interface ExtractionBundle { document: SourceDocument; pages: ExtractedPage[]; chunks: IngestionSourceChunk[]; }
export interface DocumentInspection { valid: boolean; pageCount: number; encrypted: boolean; corrupted: boolean; warnings: string[]; }
export interface DocumentExtractor { canHandle(input: SourceFileInput): boolean; inspect(input: SourceFileInput): DocumentInspection; extractPages(document: SourceDocument, input: SourceFileInput): Promise<ExtractedPage[]>; normalizePages(pages: ExtractedPage[]): ExtractedPage[]; createChunks(document: SourceDocument, pages: ExtractedPage[]): IngestionSourceChunk[]; }
export interface SourceStorage { saveOriginal(document: SourceDocument, bytes: Uint8Array): Promise<void>; getOriginal(documentId: string): Promise<Uint8Array | null>; deleteOriginal(documentId: string): Promise<void>; saveExtraction(bundle: ExtractionBundle): Promise<void>; loadExtraction(documentId: string): Promise<ExtractionBundle | null>; listDocuments(): Promise<SourceDocument[]>; }
export interface PackDraftApplyResult { pack: AuthoringKnowledgePack; appliedReviewItemIds: string[]; conflicts: ContentConflict[]; }
