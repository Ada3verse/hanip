import type {
  WorkedExampleEngineInput,
  WorkedExampleState,
  WorkedExampleStep,
} from "./types";

function nextStep(step: WorkedExampleStep): WorkedExampleStep {
  return Math.min(5, step + 1) as WorkedExampleStep;
}

export function shouldStartWorkedExample(input: WorkedExampleEngineInput) {
  return (
    input.hintState.hintLevel >= 4 ||
    (input.evaluation === "apply_fail" && (input.applyFailCount ?? 0) >= 2) ||
    (input.evaluation === "misconception" && (input.misconceptionCount ?? 0) >= 2) ||
    input.mastery.masteryScore <= 15
    || Boolean(
      input.activeMisconceptionProfile &&
      !input.activeMisconceptionProfile.resolved &&
      input.activeMisconceptionProfile.frequency >= 2,
    )
    || Boolean(
      input.adaptiveStrategy?.personalized &&
      input.adaptiveStrategy.workedExampleThreshold === "early" &&
      ["unknown", "apply_fail", "misconception"].includes(input.evaluation),
    )
  );
}

export function calculateWorkedExampleState(
  input: WorkedExampleEngineInput,
): WorkedExampleState | null {
  const previous = input.previous;
  if (input.terminationRequested) return previous ?? null;
  if (previous?.completedExample) return null;
  if (previous && !previous.completedExample) {
    const succeeded = input.evaluation === "correct";
    const exampleStep = succeeded ? nextStep(previous.exampleStep) : previous.exampleStep;
    const completedExample = succeeded && exampleStep === 5;
    return {
      ...previous,
      exampleStep,
      exampleAttempts: previous.exampleAttempts + 1,
      completedExample,
      exampleHistory: [
        ...previous.exampleHistory,
        `${previous.exampleStep}:${input.evaluation}`,
      ].slice(-20),
    };
  }
  if (!shouldStartWorkedExample(input)) return null;

  const evidence = input.retrievedEvidence.usedEvidence.find(
    ({ role }) => role === "worked_example",
  );
  if (!evidence) return null;
  return {
    conceptId: input.conceptId,
    exampleId: evidence.id,
    exampleTitle: evidence.content.split("\n")[0].slice(0, 80),
    exampleStep: 1,
    exampleAttempts: 0,
    originQuestion: input.originQuestion.slice(0, 500),
    originConcept: input.conceptId,
    returnConcept: input.returnConcept || input.conceptId,
    completedExample: false,
    exampleHistory: [evidence.id],
  };
}

export function isWorkedExampleActive(state?: WorkedExampleState | null) {
  return Boolean(state && !state.completedExample);
}

export function buildWorkedExampleContext(state?: WorkedExampleState | null) {
  if (!state) return "";
  return `[현재 Worked Example — 내부 전용]\n- exampleTitle: ${state.exampleTitle}\n- exampleStep: ${state.exampleStep}\n- returnConcept: ${state.returnConcept}\n예제 진행 중에는 다른 개념이나 별도 힌트로 이동하지 마세요. 완료되면 원래 질문과 학습 경로로 복귀하세요. 내부 상태명과 ID는 학생에게 노출하지 마세요.`;
}
