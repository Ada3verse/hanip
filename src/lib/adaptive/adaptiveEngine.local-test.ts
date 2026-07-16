import { createDialoguePlan } from "@/lib/dialogue/dialoguePlanner";
import { getAdaptiveEvaluationPolicy } from "@/lib/evaluation/evaluationEngine";
import { calculateHintState, createInitialHintState } from "@/lib/hint/hintEngine";
import { calculateLearningState } from "@/lib/learningState/learningStateEngine";
import { calculateMastery, createInitialMasteryState, masteryUsesAdaptiveStyleDirectly } from "@/lib/mastery/masteryEngine";
import { createSessionSummary } from "@/lib/sessionSummary/sessionSummaryEngine";
import { calculateWorkedExampleState } from "@/lib/workedExample/workedExampleEngine";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge/retrieval/types";
import type { WorkedExampleState } from "@/lib/workedExample/types";
import { createAdaptiveTurnStrategy, inferAdaptiveProfile } from "./adaptiveEngine";

function check(value: boolean, label: string) {
  if (!value) throw new Error(`Adaptive test failed: ${label}`);
}

const concept = "numeral-vs-numeral-determiner";
const mastery = { ...createInitialMasteryState(concept, "2026-07-16T00:00:00.000Z"), masteryScore: 60, confidence: 0.9 };
const evaluation = (value: "correct" | "unknown" = "correct", confidence = 0.9) => ({ evaluation: value, confidence });

export function runAdaptiveEngineLocalTests() {
  const choice = inferAdaptiveProfile({ concept, responseModes: ["suggested", "suggested", "typed"], evaluations: [evaluation(), evaluation()] });
  check(choice.learningStyle === "choice_preferred", "A choice learner");
  check(choice.choiceRate > choice.freeInputRate, "B choice rate");
  const choiceStrategy = createAdaptiveTurnStrategy(choice);
  check(choiceStrategy.includeChoices && choiceStrategy.questionType === "choice", "C choice question");

  const free = inferAdaptiveProfile({ concept, responseModes: ["typed", "typed", "suggested"], evaluations: [evaluation(), evaluation()] });
  check(free.learningStyle === "free_input_preferred", "D free input learner");
  const freeStrategy = createAdaptiveTurnStrategy(free);
  check(!freeStrategy.includeChoices && freeStrategy.questionType === "short_reason", "E free input strategy");

  const highHints = [
    { ...createInitialHintState(concept), hintLevel: 3 as const },
    { ...createInitialHintState(concept), hintLevel: 4 as const },
  ];
  const scaffold = inferAdaptiveProfile({ concept, evaluations: [evaluation("unknown", 0.4), evaluation("unknown", 0.5)], hintStates: highHints });
  check(scaffold.learningStyle === "scaffold_needed", "F scaffold learner");
  const scaffoldStrategy = createAdaptiveTurnStrategy(scaffold);
  check(scaffoldStrategy.hintPacing === "supportive" && scaffoldStrategy.confirmationTurns === 2, "G scaffold pacing");

  const examples: WorkedExampleState[] = [
    { conceptId: concept, exampleId: "a", exampleTitle: "a", exampleStep: 5, exampleAttempts: 2, originQuestion: "q", originConcept: concept, returnConcept: concept, completedExample: true, exampleHistory: [] },
    { conceptId: concept, exampleId: "b", exampleTitle: "b", exampleStep: 5, exampleAttempts: 2, originQuestion: "q", originConcept: concept, returnConcept: concept, completedExample: true, exampleHistory: [] },
  ];
  const exampleProfile = inferAdaptiveProfile({ concept, evaluations: [evaluation(), evaluation()], workedExamples: examples });
  check(exampleProfile.learningStyle === "example_preferred" && exampleProfile.needsWorkedExample, "H example learner");
  check(createAdaptiveTurnStrategy(exampleProfile).workedExampleThreshold === "early", "I early example threshold");

  const concise = inferAdaptiveProfile({ concept, responseModes: ["typed", "suggested"], evaluations: [evaluation(), evaluation()], masteryStates: [mastery] });
  check(concise.learningStyle === "concise_preferred", "J fast learner");
  const conciseStrategy = createAdaptiveTurnStrategy(concise);
  check(conciseStrategy.maxExplanationSentences === 1 && conciseStrategy.hintPacing === "slow", "K concise response");
  const mixed = inferAdaptiveProfile({ concept, responseModes: ["typed", "suggested"], evaluations: [evaluation("unknown", 0.6), evaluation("correct", 0.7)] });
  check(mixed.learningStyle === "balanced", "L mixed learner");
  check(!createAdaptiveTurnStrategy(mixed).personalized, "M balanced not over-personalized");

  const state = calculateLearningState({ currentConcept: "수사와 수 관형사 구분", studentModel: {}, masteryState: mastery, adaptiveProfile: choice });
  check(state.adaptive?.learningStyle === "choice_preferred", "N LearningState integration");
  const plan = createDialoguePlan({ learningState: state, studentModel: {}, adaptiveStrategy: choiceStrategy });
  check(plan.suggestedReplyMode === "choice" && plan.reason.includes("adaptive_turn_strategy_applied"), "O Dialogue choice integration");
  const freePlan = createDialoguePlan({ learningState: state, studentModel: {}, adaptiveStrategy: freeStrategy });
  check(freePlan.suggestedReplyMode === "short_reason", "P Dialogue free input integration");

  const slowHint = calculateHintState({ conceptId: concept, evaluation: "unknown", confidence: 0.5, mastery, learningMode: "learn", previous: { ...createInitialHintState(concept), hintLevel: 2, hintCount: 2 }, adaptiveStrategy: conciseStrategy });
  check(slowHint.hintLevel <= 2, "Q slow hint pacing");
  const supportiveHint = calculateHintState({ conceptId: concept, evaluation: "unknown", confidence: 0.5, mastery, learningMode: "learn", previous: createInitialHintState(concept), adaptiveStrategy: scaffoldStrategy });
  check(supportiveHint.hintLevel === 1, "R supportive no level skip");

  const evidence: KnowledgeEvidenceBundle = { reason: [], selectedSources: [{ id: "s", type: "internal", title: "s" }], usedEvidence: [{ id: "ex", role: "worked_example", content: "두 학생 / 학생이 둘 왔다" }] };
  const earlyExample = calculateWorkedExampleState({ conceptId: concept, evaluation: "unknown", hintState: createInitialHintState(concept), mastery: { ...mastery, masteryScore: 40 }, retrievedEvidence: evidence, originQuestion: "q", returnConcept: concept, adaptiveStrategy: createAdaptiveTurnStrategy(exampleProfile) });
  check(earlyExample !== null, "S example preferred entry");
  const standardExample = calculateWorkedExampleState({ conceptId: concept, evaluation: "unknown", hintState: createInitialHintState(concept), mastery: { ...mastery, masteryScore: 40 }, retrievedEvidence: evidence, originQuestion: "q", returnConcept: concept, adaptiveStrategy: createAdaptiveTurnStrategy(mixed) });
  check(standardExample === null, "T balanced example threshold unchanged");

  const policy = getAdaptiveEvaluationPolicy(freeStrategy);
  check(policy.acceptBriefPartialReason && policy.confirmationTurns === 1, "U Evaluation policy");
  check(createAdaptiveTurnStrategy(scaffold).confirmationTurns === 2, "V extra confirmation turns");
  check(!masteryUsesAdaptiveStyleDirectly(), "W Mastery independence");
  const masteryWithoutStyle = calculateMastery({ conceptId: concept, evaluation: "correct", evaluationConfidence: 0.9, previous: mastery });
  const masteryAgain = calculateMastery({ conceptId: concept, evaluation: "correct", evaluationConfidence: 0.9, previous: mastery });
  check(masteryWithoutStyle.masteryScore === masteryAgain.masteryScore, "X Mastery unchanged");
  const changed = inferAdaptiveProfile({ concept, responseModes: ["typed", "typed", "typed"], evaluations: [evaluation(), evaluation()], previous: choice });
  check(changed.styleHistory.includes("choice_preferred") && changed.styleHistory.includes("free_input_preferred"), "Y style change tracked");
  const summary = createSessionSummary({ learningState: state, masteryStates: [mastery], evaluationHistory: [], workedExampleStates: [], hintStates: [], adaptiveProfile: changed });
  check(summary.learningStyleChanges.length >= 2, "Z Session Summary style change");
}

