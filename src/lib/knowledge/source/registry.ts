import { KNOWLEDGE_SOURCE_TYPES, type KnowledgeProvenance, type KnowledgeSource, type KnowledgeSourceType, type KnowledgeVerificationStatus } from "./types";

function validSource(value: unknown): value is KnowledgeSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<KnowledgeSource>;
  return typeof source.id === "string" && source.id.trim().length > 0 &&
    typeof source.title === "string" && source.title.trim().length > 0 &&
    KNOWLEDGE_SOURCE_TYPES.includes(source.type as KnowledgeSourceType);
}

export class KnowledgeSourceRegistry {
  private readonly sources = new Map<string, KnowledgeSource>();
  private readonly provenance = new Map<string, KnowledgeProvenance>();

  register(source: unknown, provenance?: KnowledgeProvenance) {
    if (!validSource(source) || this.sources.has(source.id)) return false;
    this.sources.set(source.id, source);
    if (provenance) this.provenance.set(source.id, provenance);
    return true;
  }

  registerMany(sources: readonly unknown[]) {
    return sources.map((source) => this.register(source));
  }

  getById(id: string) { return this.sources.get(id) ?? null; }
  getByType(type: KnowledgeSourceType) { return [...this.sources.values()].filter((source) => source.type === type); }
  getByVerificationStatus(status: KnowledgeVerificationStatus) { return this.getAll().filter((source) => this.provenance.get(source.id)?.verificationStatus === status); }
  getByCurriculumYear(year: string) { return this.getAll().filter((source) => this.provenance.get(source.id)?.scope.curriculumYear === year); }
  getAll() { return [...this.sources.values()]; }
  get size() { return this.sources.size; }
}
