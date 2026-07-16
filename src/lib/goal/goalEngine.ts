import { getDependencyConceptName } from "@/lib/knowledge/dependency";
import { getGoalMasteryContribution, isMastered } from "@/lib/mastery/masteryEngine";
import type { GoalEngineInput, GoalState } from "./types";

function displayConcept(value: string | null) {
  if (!value) return "국어 문법";
  return getDependencyConceptName(value) || value;
}

function goalLabel(concept: string, review: boolean) {
  if (review) return `${concept} 다시 확인하기`;
  if (/구분|비교|수사와 수 관형사/.test(concept)) return `${concept} 구분하기`;
  return `${concept} 이해하기`;
}

export function calculateGoalState(input: GoalEngineInput): GoalState {
  const activeConcept = displayConcept(
    input.reviewRequired
      ? input.reviewConcept ?? input.routeCurrentConcept ?? input.currentConcept
      : input.routeCurrentConcept ?? input.currentConcept,
  );
  const currentGoal = goalLabel(activeConcept, input.reviewRequired);
  const mission = input.workedExample && !input.workedExample.completedExample
    ? {
        title: "비슷한 예제로 기준 찾기",
        description: `${activeConcept}의 비슷한 예제에서 판단 기준을 찾아 보자.`,
      }
    : input.reviewRequired
      ? {
          title: "헷갈린 기준 다시 확인하기",
          description: `${activeConcept}에서 헷갈린 판단 기준을 예문으로 다시 확인해 보자.`,
        }
      : input.evaluation === "correct"
        ? {
            title: "새 예문에 적용하기",
            description: `${activeConcept}의 판단 기준을 새로운 예문에 적용해 보자.`,
          }
        : input.hint.hintLevel > 0
          ? {
              title: "힌트로 기준 찾기",
              description: `${activeConcept}에서 힌트가 가리키는 부분을 찾아 보자.`,
            }
          : {
              title: "현재 생각 확인하기",
              description: `${activeConcept}에 대해 알고 있는 기준을 하나 말해 보자.`,
            };
  const routeTotal = input.routeRemainingConcepts.length + input.routeCompletedConcepts.length;
  const routeProgress = routeTotal
    ? Math.round((input.routeCompletedConcepts.length / routeTotal) * 45)
    : 0;
  const evaluationProgress = input.evaluation === "correct"
    ? 15
    : input.evaluation === "partial_correct"
      ? 8
      : 0;
  const hintAdjustment = input.hint.hintLevel >= 4 ? -3 : 0;
  const calculated = Math.max(
    0,
    Math.min(100, routeProgress + getGoalMasteryContribution(input.mastery) + evaluationProgress + hintAdjustment),
  );
  const sameGoal = input.previous?.currentGoal === currentGoal;
  const missionCompleted =
    input.completionConfirmed || isMastered(input.mastery) ||
    input.routeCompletedConcepts.some((concept) => displayConcept(concept) === activeConcept);
  const goalProgress = missionCompleted
    ? 100
    : sameGoal
      ? Math.max(input.previous?.goalProgress ?? 0, calculated)
      : calculated;
  const completedGoals = [
    ...(input.previous?.completedGoals ?? []),
    ...(missionCompleted ? [currentGoal] : []),
  ].filter((goal, index, values) => values.indexOf(goal) === index);
  const nextConcept = input.reviewRequired
    ? input.routeCurrentConcept ?? input.currentConcept
    : input.routeRemainingConcepts.find(
        (concept) => displayConcept(concept) !== activeConcept,
      ) ?? null;
  const nextGoal = nextConcept ? goalLabel(displayConcept(nextConcept), false) : null;
  const missionHistory = [
    ...(input.previous?.missionHistory ?? []),
    mission.title,
  ].filter((item, index, values) => values.indexOf(item) === index).slice(-20);
  const masterySteps = Math.max(0, Math.ceil((80 - input.mastery.masteryScore) / 20));
  const routeSteps = Math.max(0, input.routeRemainingConcepts.length - 1);
  return {
    currentGoal,
    goalReason: [
      input.reviewRequired ? "review_priority" : "route_current_concept",
      `mastery_${input.mastery.masteryScore}`,
      input.workedExample && !input.workedExample.completedExample
        ? "worked_example_active"
        : "mission_from_evaluation",
    ],
    goalProgress,
    completedGoals,
    nextGoal,
    missionTitle: mission.title,
    missionDescription: mission.description,
    missionCompleted,
    missionHistory,
    estimatedRemaining: missionCompleted ? 0 : Math.max(1, routeSteps + masterySteps),
  };
}

export function buildGoalContext(goal: GoalState) {
  return `[현재 Goal & Mission — 학생 안내용]\n- goal: ${goal.currentGoal}\n- mission: ${goal.missionDescription}\n- goalProgress: ${goal.goalProgress}%\n학생에게는 목표와 미션만 자연스럽게 반영하세요. estimatedRemaining, goalReason와 내부 계산은 노출하지 마세요.`;
}

