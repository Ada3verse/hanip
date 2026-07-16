import { defaultKnowledgeSourceRegistry } from "@/lib/knowledge/source/defaultSources";
import type { KnowledgeSourceRegistry } from "@/lib/knowledge/source/registry";
import { validateKnowledgeContentPack } from "./validator";
import type { ImportedContentPack, KnowledgeConceptEntry, KnowledgeContentPack } from "./types";

const importedPacks = new Map<string, ImportedContentPack>();
function versionParts(version: string) { return version.split(".").map((part) => Number(part) || 0); }
function compareVersion(left: string, right: string) { const a = versionParts(left), b = versionParts(right); for (let i = 0; i < Math.max(a.length, b.length); i += 1) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0); return 0; }

export type ContentPackImportResult = { imported: boolean; updated: boolean; idempotent: boolean; validation: ReturnType<typeof validateKnowledgeContentPack>; pack: ImportedContentPack | null };

export function importKnowledgeContentPack(pack: unknown, registry: KnowledgeSourceRegistry = defaultKnowledgeSourceRegistry): ContentPackImportResult {
  const validation = validateKnowledgeContentPack(pack);
  if (!validation.valid) return { imported: false, updated: false, idempotent: false, validation, pack: null };
  const validPack = pack as KnowledgeContentPack;
  const current = importedPacks.get(validPack.id);
  if (current && compareVersion(validPack.version, current.pack.version) === 0) return { imported: true, updated: false, idempotent: true, validation, pack: current };
  if (current && compareVersion(validPack.version, current.pack.version) < 0) return { imported: false, updated: false, idempotent: false, validation: { valid: false, errors: [{ code: "VERSION_OLDER", path: "version", message: "기존 Pack보다 이전 버전입니다." }], warnings: validation.warnings }, pack: current };
  // 모든 참조 검증이 끝난 뒤에만 외부 Registry와 Pack 저장소를 변경한다.
  validPack.sources.forEach((source) => registry.register(source, validPack.concepts[0]?.provenance));
  const imported: ImportedContentPack = { pack: validPack, validation, importedAt: new Date().toISOString() };
  importedPacks.set(validPack.id, imported);
  return { imported: true, updated: Boolean(current), idempotent: false, validation, pack: imported };
}

export function getImportedContentPacks() { return [...importedPacks.values()]; }
export function getImportedConceptEntries(concept: string): Array<{ pack: KnowledgeContentPack; concept: KnowledgeConceptEntry }> {
  const normalized = concept.toLowerCase().replace(/\s+/g, "");
  return getImportedContentPacks().flatMap(({ pack }) => pack.concepts.filter((entry) => [entry.id, entry.name, ...entry.aliases].some((value) => { const key = value.toLowerCase().replace(/\s+/g, ""); return normalized.includes(key) || key.includes(normalized); })).map((entry) => ({ pack, concept: entry })));
}
export function getImportedKnowledgeModules() { return getImportedContentPacks().flatMap(({ pack }) => pack.concepts); }
export function getImportedExamples() { return getImportedKnowledgeModules().flatMap(({ examples }) => examples); }
export function getImportedMisconceptions() { return getImportedKnowledgeModules().flatMap(({ misconceptions }) => misconceptions); }
export function getImportedCompletionCriteria() { return getImportedKnowledgeModules().flatMap(({ completionCriteria }) => completionCriteria); }
export function getImportedDependencies() { return getImportedKnowledgeModules().map(({ id, prerequisiteConceptIds }) => ({ id, prerequisites: [...prerequisiteConceptIds] })); }
export function resetImportedContentPacksForTest() { importedPacks.clear(); }
