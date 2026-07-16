import { KNOWLEDGE_SOURCE_TYPES, KNOWLEDGE_VERIFICATION_STATUSES, type KnowledgeCandidate, type KnowledgeRole, type KnowledgeSource, type KnowledgeVerificationStatus, type SelectedKnowledgeBundle } from "./types";

type SelectionContext = { concept: string; candidates: readonly KnowledgeCandidate[]; curriculumYear: string; schoolLevel: "middle"; subject: "국어" };
const statusScore: Record<KnowledgeVerificationStatus, number> = { draft: 1, reviewed: 2, verified: 3 };
export function getVerificationStatusRank(status: KnowledgeVerificationStatus) { return statusScore[status]; }
const roleSourceType: Record<KnowledgeRole, KnowledgeSource["type"][]> = {
  definition: ["curriculum", "official_reference", "textbook", "teacher_guide", "internal"],
  explanation: ["textbook", "teacher_guide", "official_reference", "curriculum", "internal"],
  example: ["textbook", "teacher_guide", "official_reference", "curriculum", "internal"],
  misconception: ["teacher_guide", "textbook", "official_reference", "curriculum", "internal"],
  teaching: ["teacher_guide", "textbook", "curriculum", "official_reference", "internal"],
};

function isValid(candidate: KnowledgeCandidate, context: SelectionContext) {
  const { provenance } = candidate;
  return Boolean(provenance && KNOWLEDGE_VERIFICATION_STATUSES.includes(provenance.verificationStatus) &&
    Array.isArray(provenance.sources) && provenance.sources.length > 0 && provenance.sources.every((source) =>
      typeof source.id === "string" && source.id.length > 0 && typeof source.title === "string" && source.title.length > 0 && KNOWLEDGE_SOURCE_TYPES.includes(source.type)) &&
    (!provenance.scope.schoolLevel || provenance.scope.schoolLevel === context.schoolLevel) &&
    (!provenance.scope.subject || provenance.scope.subject === context.subject));
}

function rank(candidate: KnowledgeCandidate, context: SelectionContext, index: number) {
  const scope = candidate.provenance.scope;
  return [statusScore[candidate.provenance.verificationStatus], scope.curriculumYear === context.curriculumYear ? 1 : 0,
    scope.schoolLevel === context.schoolLevel && scope.subject === context.subject ? 1 : 0,
    candidate.concept === context.concept ? 1 : 0, scope.unit ? 1 : 0,
    candidate.provenance.sources.some((source) => source.pageRange) ? 1 : 0, -index];
}

function compareRank(left: number[], right: number[]) {
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return right[index] - left[index];
  return 0;
}

function selectForRole(context: SelectionContext, role: KnowledgeRole) {
  const candidates = context.candidates.map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => isValid(candidate, context) && (!candidate.roles || candidate.roles.includes(role)))
    .sort((a, b) => compareRank(rank(a.candidate, context, a.index), rank(b.candidate, context, b.index)));
  const chosen = candidates[0]?.candidate;
  if (!chosen) return null;
  const preferences = roleSourceType[role];
  return [...chosen.provenance.sources].sort((a, b) => preferences.indexOf(a.type) - preferences.indexOf(b.type))[0] ?? null;
}

export function selectKnowledgeBundle(context: SelectionContext): SelectedKnowledgeBundle {
  const valid = context.candidates.filter((candidate) => isValid(candidate, context));
  const highest = valid.reduce<KnowledgeVerificationStatus>((current, candidate) =>
    statusScore[candidate.provenance.verificationStatus] > statusScore[current] ? candidate.provenance.verificationStatus : current, "draft");
  return {
    concept: context.concept,
    definitionSource: selectForRole(context, "definition"),
    explanationSource: selectForRole(context, "explanation"),
    exampleSource: selectForRole(context, "example"),
    misconceptionSource: selectForRole(context, "misconception"),
    teachingSource: selectForRole(context, "teaching"),
    verificationStatus: highest,
  };
}
