import type { AiEvaluation, ChatMessage } from "@/lib/types/chat";
import type { TeachingStrategy } from "@/lib/dialogue/types";
import type {
  ExplanationHistoryEntry,
  RuntimeStudentModel,
  StudentConceptState,
  StudentConfidence,
  UnderstandingLevel,
} from "./types";
import { EXPLANATION_STRATEGIES, type ExplanationStrategy } from "@/lib/explanation/types";

const MAX_CONCEPTS = 100;
const MAX_HISTORY = 30;
const MAX_RECENT = 12;
const DEFAULT_TIME = "1970-01-01T00:00:00.000Z";

export function createEmptyRuntimeStudentModel(now = DEFAULT_TIME): RuntimeStudentModel {
  return { schemaVersion: 1, concepts: {}, masteredConcepts: [], explanationHistory: [], recentConcepts: [], updatedAt: now };
}

export const EMPTY_RUNTIME_STUDENT_MODEL = createEmptyRuntimeStudentModel();

export function createEmptyConceptState(now = DEFAULT_TIME): StudentConceptState {
  return { understandingLevel: 0, confidence: "LOW", evidenceCount: 0, consecutiveSuccesses: 0, consecutiveFailures: 0, updatedAt: now };
}

function validDate(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function confidence(value: unknown): StudentConfidence {
  return value === "HIGH" || value === "MEDIUM" ? value : "LOW";
}

function conceptState(value: unknown, now: string): StudentConceptState {
  const item = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const level = [0, 1, 2, 3].includes(Number(item.understandingLevel))
    ? Number(item.understandingLevel) as UnderstandingLevel : 0;
  const evaluation = ["correct", "partial_correct", "misconception", "apply_fail", "unknown"].includes(String(item.lastEvaluation))
    ? item.lastEvaluation as AiEvaluation : undefined;
  return {
    understandingLevel: level,
    confidence: confidence(item.confidence),
    misconceptionSummary: typeof item.misconceptionSummary === "string" ? item.misconceptionSummary.slice(0, 300) : undefined,
    evidenceCount: Math.max(0, Math.min(1_000, Number.isInteger(item.evidenceCount) ? Number(item.evidenceCount) : 0)),
    consecutiveSuccesses: Math.max(0, Math.min(100, Number.isInteger(item.consecutiveSuccesses) ? Number(item.consecutiveSuccesses) : 0)),
    consecutiveFailures: Math.max(0, Math.min(100, Number.isInteger(item.consecutiveFailures) ? Number(item.consecutiveFailures) : 0)),
    lastEvaluation: evaluation,
    updatedAt: validDate(item.updatedAt, now),
  };
}

export function normalizeRuntimeStudentModel(value: unknown, now = new Date().toISOString()): RuntimeStudentModel {
  const item = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const concepts: Record<string, StudentConceptState> = {};
  if (item.concepts && typeof item.concepts === "object" && !Array.isArray(item.concepts)) {
    for (const [id, state] of Object.entries(item.concepts).slice(0, MAX_CONCEPTS)) {
      const conceptId = id.trim().slice(0, 160);
      if (conceptId) concepts[conceptId] = conceptState(state, now);
    }
  } else if (typeof item.understandingLevel === "number") {
    const legacyConcept = typeof item.currentConcept === "string" ? item.currentConcept : "legacy-current-concept";
    concepts[legacyConcept] = conceptState({
      understandingLevel: item.understandingLevel,
      confidence: item.confidence,
      misconceptionSummary: item.misconception,
      evidenceCount: Number(item.understandingLevel) >= 2 ? 1 : 0,
      updatedAt: now,
    }, now);
  }
  const history: ExplanationHistoryEntry[] = Array.isArray(item.explanationHistory)
    ? item.explanationHistory.flatMap((raw) => {
        if (!raw || typeof raw !== "object") return [];
        const entry = raw as Record<string, unknown>;
        const conceptId = typeof entry.conceptId === "string" ? entry.conceptId : typeof entry.concept === "string" ? entry.concept : "";
        if (!conceptId) return [];
        const strategy = ["DIRECT_EXPLANATION", "COMPARE", "EXAMPLE", "QUIZ", "GUIDED_DISCOVERY"].includes(String(entry.strategy))
          ? entry.strategy as TeachingStrategy : "DIRECT_EXPLANATION";
        const legacyExample = typeof entry.example === "string" && entry.example ? [entry.example] : [];
        const exampleIds = Array.isArray(entry.exampleIds) ? entry.exampleIds.filter((id): id is string => typeof id === "string") : legacyExample;
        const explanationStrategy = EXPLANATION_STRATEGIES.includes(entry.explanationStrategy as ExplanationStrategy)
          ? entry.explanationStrategy as ExplanationStrategy : undefined;
        return [{ conceptId: conceptId.slice(0, 160), strategy, explanationStrategy, exampleIds: [...new Set(exampleIds)].slice(0, 5).map((id) => id.slice(0, 160)), analogyId: typeof entry.analogyId === "string" ? entry.analogyId.slice(0, 160) : null, usedAt: validDate(entry.usedAt, now) }];
      }).slice(-MAX_HISTORY)
    : [];
  const uniqueHistory = new Map<string, ExplanationHistoryEntry>();
  for (const entry of history) uniqueHistory.set(`${entry.conceptId}:${entry.strategy}:${entry.explanationStrategy ?? ""}:${entry.exampleIds.join("|")}:${entry.analogyId ?? ""}`, entry);
  const mastered = Array.isArray(item.masteredConcepts) ? item.masteredConcepts.filter((id): id is string => typeof id === "string") : [];
  return {
    schemaVersion: 1,
    concepts,
    masteredConcepts: [...new Set(mastered)].filter((id) => concepts[id] && isStudentConceptMastered(concepts[id], false)).slice(0, MAX_CONCEPTS),
    explanationHistory: [...uniqueHistory.values()].slice(-MAX_HISTORY),
    recentConcepts: Array.isArray(item.recentConcepts) ? [...new Set(item.recentConcepts.filter((id): id is string => typeof id === "string"))].slice(-MAX_RECENT) : [],
    updatedAt: validDate(item.updatedAt, now),
  };
}

export function getStudentConceptState(model: RuntimeStudentModel | undefined, conceptId: string) {
  const aliases: Array<[RegExp, string]> = [
    [/명사와\s*대명사/, "noun-pronoun-comparison"],
    [/수사와\s*수\s*관형사|수\s*관형사/, "numeral-vs-numeral-determiner"],
    [/형태소/, "morpheme"], [/문장\s*성분/, "sentence-component"],
    [/대명사/, "pronoun"], [/명사/, "noun"], [/조사/, "particle"],
    [/품사/, "parts-of-speech-overview"], [/단어/, "word"], [/수사/, "numeral"],
  ];
  const alias = aliases.find(([pattern]) => pattern.test(conceptId))?.[1];
  return model?.concepts[conceptId] ?? (alias ? model?.concepts[alias] : undefined) ?? createEmptyConceptState(model?.updatedAt);
}

function inferConfidence(answer: string, evaluation: AiEvaluation): StudentConfidence {
  if (/몰라|모르겠|이해가\s*안|헷갈/.test(answer)) return "LOW";
  if (/아마|같아|것 같|잘은 모르|추측/.test(answer)) return "MEDIUM";
  if (evaluation === "correct" || /때문|입니다|이에요|예요|학생\s*\+\s*들/.test(answer)) return "HIGH";
  return evaluation === "partial_correct" ? "MEDIUM" : "LOW";
}

function inferMisconception(answer: string, matched: string[]): string {
  if (/학생들/.test(answer) && /못|없/.test(answer)) return "형태소 분리 기준 이해 부족";
  if (/명사.*대명사|대명사.*명사/.test(answer) && /둘 다.*사람|사람을.*나타/.test(answer)) return "품사의 기능과 의미를 혼동";
  return matched[0] ?? "";
}

function nextLevel(previous: UnderstandingLevel, evaluation: AiEvaluation, answer: string): UnderstandingLevel {
  if (evaluation === "correct") return /때문|대신|꾸미|뜻|기준|학생\s*\+\s*들/.test(answer) ? 3 : Math.min(3, previous + 1) as UnderstandingLevel;
  if (evaluation === "partial_correct") return Math.max(previous, 2) as UnderstandingLevel;
  if (evaluation === "misconception" || evaluation === "apply_fail") return Math.min(previous, 1) as UnderstandingLevel;
  if (/몰라|모르겠|이해가\s*안|헷갈/.test(answer)) return 1;
  return previous;
}

export function isStudentConceptMastered(state: StudentConceptState, hasUnresolvedMisconception: boolean) {
  return state.understandingLevel === 3 && state.confidence === "HIGH" && state.evidenceCount >= 2 && state.consecutiveSuccesses >= 2 && !hasUnresolvedMisconception;
}

export function updateRuntimeStudentModel(input: { previous?: RuntimeStudentModel; studentAnswer: string; concept: string; evaluation: AiEvaluation; matchedMisconceptions?: string[]; hasUnresolvedMisconception?: boolean; now?: string; }): RuntimeStudentModel {
  const now = input.now ?? new Date().toISOString();
  const previous = normalizeRuntimeStudentModel(input.previous, now);
  const before = getStudentConceptState(previous, input.concept);
  const success = input.evaluation === "correct";
  const partial = input.evaluation === "partial_correct";
  const failure = input.evaluation === "misconception" || input.evaluation === "apply_fail" || /몰라|모르겠|이해가\s*안|헷갈/.test(input.studentAnswer);
  const misconception = inferMisconception(input.studentAnswer, input.matchedMisconceptions ?? []);
  const next: StudentConceptState = {
    understandingLevel: nextLevel(before.understandingLevel, input.evaluation, input.studentAnswer),
    confidence: inferConfidence(input.studentAnswer, input.evaluation),
    misconceptionSummary: misconception || (success ? undefined : before.misconceptionSummary),
    evidenceCount: Math.min(1_000, before.evidenceCount + (success || partial ? 1 : 0)),
    consecutiveSuccesses: success ? before.consecutiveSuccesses + 1 : partial ? before.consecutiveSuccesses : 0,
    consecutiveFailures: failure ? before.consecutiveFailures + 1 : 0,
    lastEvaluation: input.evaluation,
    updatedAt: now,
  };
  const masteredConcepts = new Set(previous.masteredConcepts);
  if (isStudentConceptMastered(next, Boolean(input.hasUnresolvedMisconception || next.misconceptionSummary))) masteredConcepts.add(input.concept);
  else masteredConcepts.delete(input.concept);
  return { ...previous, concepts: { ...previous.concepts, [input.concept]: next }, masteredConcepts: [...masteredConcepts], recentConcepts: [...new Set([...previous.recentConcepts, input.concept])].slice(-MAX_RECENT), updatedAt: now };
}

function exampleIds(message: string) {
  return (message.match(/‘([^’]+)’/g) ?? []).slice(0, 5).map((value) => value.replace(/[‘’]/g, "").slice(0, 160));
}

export function recordExplanation(input: { model: RuntimeStudentModel; concept: string; strategy: TeachingStrategy; explanationStrategy?: ExplanationStrategy; message: string; exampleIds?: string[]; analogyId?: string | null; now?: string; }): RuntimeStudentModel {
  const now = input.now ?? new Date().toISOString();
  const entry: ExplanationHistoryEntry = { conceptId: input.concept, strategy: input.strategy, explanationStrategy: input.explanationStrategy, exampleIds: input.exampleIds ?? exampleIds(input.message), analogyId: input.analogyId ?? null, usedAt: now };
  const key = (item: ExplanationHistoryEntry) => `${item.conceptId}:${item.strategy}:${item.explanationStrategy ?? ""}:${item.exampleIds.join("|")}:${item.analogyId ?? ""}`;
  const history = new Map(input.model.explanationHistory.map((item) => [key(item), item]));
  if (!history.has(key(entry))) history.set(key(entry), entry);
  return { ...input.model, explanationHistory: [...history.values()].slice(-MAX_HISTORY), updatedAt: now };
}

export function hasUsedExplanation(model: RuntimeStudentModel | undefined, concept: string, examplePattern: RegExp) {
  return Boolean(model?.explanationHistory.some((item) => item.conceptId === concept && item.exampleIds.some((id) => examplePattern.test(id))));
}

export function lastStudentAnswer(messages: ChatMessage[]) { return [...messages].reverse().find(({ role }) => role === "user")?.content.trim() ?? ""; }
