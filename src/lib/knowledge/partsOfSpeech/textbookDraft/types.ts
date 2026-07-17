import type { CandidateType, ReviewDecision } from "@/lib/knowledge/ingestion/types";

export interface TextbookSemanticChunk {
  chunkId: string;
  sourceId: string;
  publisher: string;
  pageRange: string;
  conceptId: string;
  topic: string;
  confidence: number;
  source: "teacherGuide";
  provenance: string;
  candidateTypes: CandidateType[];
  synthesizedKnowledge: string;
  reviewDecision: Exclude<ReviewDecision, "pending" | "deferred">;
  reviewerNote: string;
}

export interface TextbookConflictReview {
  conflictId: string;
  conceptId: string;
  sources: Array<{ sourceId: string; pageRange: string; position: string }>;
  difference: string;
  interpretation: string;
  resolution: "compatible_variation" | "resolved_merged" | "unresolved";
}

export interface TextbookDraftReviewReport {
  totalChunks: number;
  accepted: number;
  edited: number;
  rejected: number;
  pending: number;
  unresolvedConflicts: number;
  reviewer: string;
  reviewedAt: string;
}
