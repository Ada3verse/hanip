import type { RawImportDraft, RawSourceChunk } from "./types";
export function importRawSourceChunks(chunks: RawSourceChunk[]): RawImportDraft[] {
  return chunks.slice(0, 100).map((chunk) => {
    const sentences = chunk.normalizedText.split(/(?<=[.!?。])\s+/).map((item) => item.trim()).filter(Boolean).slice(0, 30);
    return { sourceId: chunk.sourceId, status: "draft", candidateDefinitions: sentences.filter((text) => /(?:이다|말한다|뜻한다)/.test(text)), candidateRules: sentences.filter((text) => /(?:기준|구분|확인)/.test(text)), candidateExamples: sentences.filter((text) => /(?:예를 들어|예문)/.test(text)), candidateMisconceptions: sentences.filter((text) => /(?:헷갈|잘못|오류)/.test(text)), reviewQueue: sentences.filter((text) => text.length > 300 || chunk.confidence < .8) };
  });
}
