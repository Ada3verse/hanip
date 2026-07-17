import { createSourceChunks } from "./chunker";
import { normalizeExtractedPages } from "./normalizer";
import type { DocumentExtractor, DocumentInspection, ExtractedPage, SourceDocument, SourceFileInput } from "./types";
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
function page(text: string, documentId: string, pageNumber: number, confidence = .95): ExtractedPage { return { documentId, pageNumber, rawText: text, normalizedText: text, headingCandidates: [], extractionConfidence: confidence, warnings: text.trim().length < 20 ? ["OCR_REQUIRED"] : [], createdAt: "2026-07-17T00:00:00.000Z" }; }
export class FixtureDocumentExtractor implements DocumentExtractor {
  canHandle(input: SourceFileInput) { return input.fileName.endsWith(".fixture.pdf"); }
  inspect(input: SourceFileInput): DocumentInspection { const texts = decode(input.bytes).replace(/^%PDF-[^\n]*\n?/, "").replace(/%%EOF\s*$/, "").split("\f"); return { valid: !input.corrupted && !input.encrypted, pageCount: texts.length, encrypted: Boolean(input.encrypted), corrupted: Boolean(input.corrupted), warnings: [] }; }
  async extractPages(document: SourceDocument, input: SourceFileInput) { return decode(input.bytes).replace(/^%PDF-[^\n]*\n?/, "").replace(/%%EOF\s*$/, "").split("\f").map((text, index) => page(text, document.documentId, index + 1)); }
  normalizePages(pages: ExtractedPage[]) { return normalizeExtractedPages(pages); }
  createChunks(document: SourceDocument, pages: ExtractedPage[]) { return createSourceChunks(document, pages, "fixture"); }
}
export class LocalPdfDocumentExtractor implements DocumentExtractor {
  canHandle(input: SourceFileInput) { return input.mimeType === "application/pdf" && input.fileName.toLowerCase().endsWith(".pdf"); }
  inspect(input: SourceFileInput): DocumentInspection { const text = decode(input.bytes); const encrypted = Boolean(input.encrypted || /\/Encrypt/.test(text)); const corrupted = Boolean(input.corrupted || !text.startsWith("%PDF-") || !/%%EOF\s*$/.test(text)); const sections = text.match(/%%Page:\s*\d+[\s\S]*?(?=%%Page:|%%EOF)/g) ?? []; const pageCount = input.claimedPageCount ?? Math.max(sections.length, 1); const warnings = pageCount > 500 ? ["PAGE_LIMIT_EXCEEDED"] : []; return { valid: !encrypted && !corrupted && !warnings.length, pageCount, encrypted, corrupted, warnings }; }
  async extractPages(document: SourceDocument, input: SourceFileInput) { const text = decode(input.bytes); const sections = text.match(/%%Page:\s*\d+\s*\n([\s\S]*?)(?=%%Page:|%%EOF)/g)?.map((value) => value.replace(/^%%Page:[^\n]*\n/, "").trim()) ?? [text.replace(/^%PDF-[^\n]*\n?/, "").replace(/%%EOF\s*$/, "")]; return sections.map((textValue, index) => page(textValue, document.documentId, index + 1, textValue.trim().length < 20 ? .35 : .9)); }
  normalizePages(pages: ExtractedPage[]) { return normalizeExtractedPages(pages); }
  createChunks(document: SourceDocument, pages: ExtractedPage[]) { return createSourceChunks(document, pages, "local_pdf_text"); }
}
