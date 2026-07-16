import type {
  MisconceptionLearningInput,
  MisconceptionProfile,
} from "./types";
import { getDependencyConceptName } from "@/lib/knowledge/dependency";

function unique(values: readonly string[], limit = 20) {
  return [...new Set(values.filter(Boolean))].slice(-limit);
}

function misconceptionType(id: string) {
  if (/meaning|semantic|의미/.test(id)) return "meaning_criterion";
  if (/form|shape|형태|모양/.test(id)) return "form_criterion";
  if (/sentence|component|문장/.test(id)) return "sentence_role_confusion";
  if (/particle|ending|조사|어미/.test(id)) return "particle_ending_confusion";
  if (/numeral|determiner|수사|관형사/.test(id)) return "numeral_determiner_confusion";
  return "concept_rule_confusion";
}

export function updateMisconceptionProfiles(
  input: MisconceptionLearningInput,
): MisconceptionProfile[] {
  const now = input.now ?? new Date().toISOString();
  const matched = new Set(input.matchedMisconceptions);
  const profiles = (input.existingProfiles ?? []).map((profile) => ({ ...profile }));

  for (const id of matched) {
    const index = profiles.findIndex(
      (profile) => profile.concept === input.concept && profile.misconceptionId === id,
    );
    const previous = index >= 0 ? profiles[index] : null;
    const next: MisconceptionProfile = {
      concept: input.concept,
      misconceptionId: id,
      misconceptionType: previous?.misconceptionType ?? misconceptionType(id),
      frequency: (previous?.frequency ?? 0) + 1,
      lastOccurred: now,
      resolved: false,
      resolvedAt: null,
      reviewPriority: Math.min(100, (previous?.reviewPriority ?? 20) + 20),
      relatedExamples: unique([
        ...(previous?.relatedExamples ?? []),
        ...(input.relatedExamples ?? []),
      ]),
      relatedHints: unique([
        ...(previous?.relatedHints ?? []),
        ...(input.relatedHints ?? []),
      ]),
      successStreak: 0,
    };
    if (index >= 0) profiles[index] = next;
    else profiles.push(next);
  }

  if (matched.size === 0 && ["correct", "partial_correct"].includes(input.evaluation)) {
    for (let index = 0; index < profiles.length; index += 1) {
      const profile = profiles[index];
      if (profile.concept !== input.concept || profile.resolved) continue;
      const successGain = input.evaluation === "correct" ? 2 : 1;
      const successStreak = profile.successStreak + successGain;
      const resolved = successStreak >= 4;
      profiles[index] = {
        ...profile,
        successStreak,
        resolved,
        resolvedAt: resolved ? now : null,
        reviewPriority: Math.max(0, profile.reviewPriority - (resolved ? 30 : 10)),
      };
    }
  }
  return profiles.slice(-100);
}

export function getActiveMisconceptionProfile(
  profiles: readonly MisconceptionProfile[] | undefined,
  concept: string,
) {
  return [...(profiles ?? [])]
    .filter((profile) => {
      const name = getDependencyConceptName(profile.concept);
      return !profile.resolved && (
        profile.concept === concept || name === concept || concept.includes(name)
      );
    })
    .sort(
      (left, right) =>
        right.reviewPriority - left.reviewPriority || right.frequency - left.frequency,
    )[0] ?? null;
}

export function buildMisconceptionLearningContext(
  profile?: MisconceptionProfile | null,
) {
  if (!profile) return "";
  return `[현재 주의할 오개념 — 내부 전용]\n- concept: ${profile.concept}\n- correction focus: ${profile.misconceptionType}\n- related hint: ${profile.relatedHints[0] ?? "비교 기준 확인"}\n- related example: ${profile.relatedExamples[0] ?? "검증된 비교 예문"}\n오개념 ID, 빈도, priority, resolved 상태는 학생에게 노출하지 마세요.`;
}
