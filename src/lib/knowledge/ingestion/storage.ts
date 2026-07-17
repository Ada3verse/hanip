import type { ExtractionBundle, SourceDocument, SourceStorage } from "./types";
export class LocalSourceStorage implements SourceStorage {
  private originals = new Map<string, Uint8Array>(); private extractions = new Map<string, ExtractionBundle>(); private documents = new Map<string, SourceDocument>();
  async saveOriginal(document: SourceDocument, bytes: Uint8Array) { this.documents.set(document.documentId, structuredClone(document)); this.originals.set(document.documentId, bytes.slice()); }
  async getOriginal(documentId: string) { return this.originals.get(documentId)?.slice() ?? null; }
  async deleteOriginal(documentId: string) { this.originals.delete(documentId); this.extractions.delete(documentId); this.documents.delete(documentId); }
  async saveExtraction(bundle: ExtractionBundle) { this.documents.set(bundle.document.documentId, structuredClone(bundle.document)); this.extractions.set(bundle.document.documentId, structuredClone(bundle)); }
  async loadExtraction(documentId: string) { const value = this.extractions.get(documentId); return value ? structuredClone(value) : null; }
  async listDocuments() { return [...this.documents.values()].map((item) => structuredClone(item)); }
}
