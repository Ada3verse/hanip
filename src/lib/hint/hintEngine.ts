import type { HintEngineInput, HintState, HintType } from "./types";
import { getEvaluationHintSignal } from "@/lib/evaluation/evaluationEngine";
import { getMasteryHintPreference } from "@/lib/mastery/masteryEngine";

function levelType(level: number): HintType {
  if (level <= 0) return "none";
  if (level === 1) return "observation";
  if (level === 2) return "partial_criterion";
  if (level === 3) return "core_criterion";
  if (level === 4) return "worked_example";
  return "answer_reveal";
}

export function createInitialHintState(conceptId: string): HintState {
  return {
    conceptId,
    hintLevel: 0,
    hintHistory: [],
    lastHintType: "none",
    hintCount: 0,
    revealedEvidence: [],
    maintainFocus: true,
  };
}

export function calculateHintState(input: HintEngineInput): HintState {
  const previous =
    input.previous?.conceptId === input.conceptId
      ? input.previous
      : createInitialHintState(input.conceptId);
  const evaluationSignal = getEvaluationHintSignal(input.evaluation);
  const masteryPreference = getMasteryHintPreference(input.mastery);
  if (evaluationSignal === "reset") {
    return createInitialHintState(input.conceptId);
  }
  if (input.workedExampleActive) {
    return { ...previous, maintainFocus: true };
  }

  let hintLevel = previous.hintLevel;
  let hintType: HintType;
  if (
    input.activeMisconceptionProfile &&
    !input.activeMisconceptionProfile.resolved &&
    input.activeMisconceptionProfile.frequency >= 2
  ) {
    hintLevel = Math.max(2, hintLevel) as HintState["hintLevel"];
    hintType = "misconception_correction";
  } else if (evaluationSignal === "hold") {
    hintLevel = Math.max(1, hintLevel) as HintState["hintLevel"];
    hintType = levelType(hintLevel);
  } else if (evaluationSignal === "correct_misconception") {
    hintLevel = Math.max(2, hintLevel) as HintState["hintLevel"];
    hintType = "misconception_correction";
  } else if (input.learningMode === "review" || masteryPreference === "worked_example") {
    hintLevel = Math.max(4, hintLevel) as HintState["hintLevel"];
    hintType = "worked_example";
  } else if (
    input.evaluation === "apply_fail" &&
    previous.hintLevel >= 4 &&
    previous.hintCount >= 4
  ) {
    hintLevel = 5;
    hintType = "answer_reveal";
  } else {
    const incremented = Math.min(4, Math.max(1, hintLevel + 1));
    hintLevel = (
      masteryPreference === "minimal"
        ? Math.min(2, incremented)
        : incremented
    ) as HintState["hintLevel"];
    hintType =
      input.confidence < 0.6 && hintLevel === 1
        ? "observation"
        : levelType(hintLevel);
  }

  if (
    input.adaptiveStrategy?.personalized &&
    input.adaptiveStrategy.hintPacing === "slow" &&
    hintLevel > 2 &&
    previous.lastHintType !== "partial_criterion"
  ) {
    hintLevel = 2;
    hintType = "partial_criterion";
  }
  const revealedEvidence = [
    ...new Set([
      ...previous.revealedEvidence,
      hintType === "observation"
        ? "관찰 대상"
        : hintType === "partial_criterion"
          ? "판단 기준 일부"
          : hintType === "core_criterion"
            ? "핵심 판단 기준"
            : hintType === "worked_example"
              ? "대표 예문"
              : hintType === "answer_reveal"
                ? "핵심 답"
                : "오개념 교정 기준",
    ]),
  ];
  return {
    conceptId: input.conceptId,
    hintLevel,
    hintHistory: [...previous.hintHistory, hintType].slice(-10),
    lastHintType: hintType,
    hintCount: previous.hintCount + 1,
    revealedEvidence,
    maintainFocus: true,
  };
}

export function buildHintContext(state: HintState) {
  return `[현재 Adaptive Hint — 내부 전용]\n- hintLevel: ${state.hintLevel}\n- hintType: ${state.lastHintType}\n- revealedEvidence: ${state.revealedEvidence.join(", ") || "없음"}\n이 값만 사용해 힌트를 표현하고 내부 단계와 계산은 학생에게 노출하지 마세요.`;
}
