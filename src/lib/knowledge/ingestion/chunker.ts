import { classifyChunkText } from "./classifier";
import type { ExtractedPage, IngestionSourceChunk, SourceDocument } from "./types";
const MAX_CHUNK = 1800;
export function createSourceChunks(document: SourceDocument, pages: ExtractedPage[], extractionMethod: string): IngestionSourceChunk[] {
  const chunks: IngestionSourceChunk[] = [];
  for (const page of pages) {
    const blocks = page.normalizedText.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean);
    for (const block of blocks) {
      const parts = block.length <= MAX_CHUNK ? [block] : block.match(new RegExp(`[\\s\\S]{1,${MAX_CHUNK}}(?:\\s|$)`, "g")) ?? [block];
      for (const normalizedText of parts) { const classified = classifyChunkText(normalizedText); const index = chunks.length + 1; chunks.push({ chunkId: `${document.documentId}-chunk-${index}`, sourceId: document.sourceId, documentId: document.documentId, pageRange: String(page.pageNumber), heading: page.headingCandidates[0] ?? "", rawText: block, normalizedText: normalizedText.trim(), tokenEstimate: Math.ceil(normalizedText.length / 3), extractionMethod, confidence: page.extractionConfidence, note: "", status: "normalized", ...classified }); }
    }
  }
  return chunks;
}
