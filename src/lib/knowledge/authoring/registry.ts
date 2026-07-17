import type { DialogueAction } from "@/lib/dialogue/types";
import { validateAuthoringPack } from "./validator";
import type { AuthoringKnowledgePack, PackStatus } from "./types";
const packs = new Map<string, AuthoringKnowledgePack>();
export function registerAuthoringPack(pack: AuthoringKnowledgePack) { const validation = validateAuthoringPack(pack); if (!validation.valid) return { registered: false, validation }; packs.set(pack.packId, pack); return { registered: true, validation }; }
export function resetAuthoringPacksForTest() { packs.clear(); }
const rank: Record<PackStatus, number> = { rejected: 0, draft: 1, in_review: 1, reviewed: 2, verification_pending: 2, verified: 3, published: 4, archived: 0 };
export function selectAuthoringEvidence(input: { concept: string; action: DialogueAction; production: boolean; allowReviewed?: boolean; allowDevelopmentDraft?: boolean }) {
  const allowed = (status: PackStatus) => status === "verified" || status === "published" || (status === "reviewed" && Boolean(input.allowReviewed)) || (status === "draft" && !input.production && Boolean(input.allowDevelopmentDraft));
  const matches = [...packs.values()].flatMap((pack) => pack.concepts.filter((concept) => [concept.conceptId, concept.title, ...concept.aliases].some((key) => input.concept.includes(key) || key.includes(input.concept))).map((concept) => ({ pack, concept }))).filter(({ pack }) => allowed(pack.status)).sort((a, b) => rank[b.pack.status] - rank[a.pack.status]);
  const selected = matches[0]; if (!selected) return null; const { concept, pack } = selected;
  const evidence = input.action === "explain" ? [concept.definition.standard, concept.examples[0]?.sentence].filter(Boolean) : input.action === "hint" ? [concept.explanations[0]?.content].filter(Boolean) : input.action === "complete" ? concept.completionCriteria.slice(0, 1) : input.action === "bridge" ? [concept.definition.easy] : [concept.checks[0]?.prompt].filter(Boolean);
  return { packId: pack.packId, conceptId: concept.conceptId, status: pack.status, evidence: [...new Set(evidence)].slice(0, 2), reason: [`status_${pack.status}`, `action_${input.action}`, "minimal_evidence_only"] };
}
