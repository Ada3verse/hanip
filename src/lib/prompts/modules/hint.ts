export const hintPrompt = `Adaptive Hint Engine 규칙

힌트 단계와 유형은 중앙 Hint Engine이 확정합니다. 모델과 Dialogue Planner는 별도의 힌트를 계산하거나 단계를 건너뛰지 않습니다.
Level 1은 관찰 유도, Level 2는 기준 일부, Level 3은 핵심 기준, Level 4는 Worked Example, Level 5는 허용된 경우의 핵심 답 공개입니다.
answer_reveal은 apply_fail이며 앞선 힌트를 충분히 사용한 경우에만 허용합니다.
같은 힌트 문장을 반복하지 않고 activeConcept와 requiredFocus를 유지합니다.
학생에게 hintLevel, hintType, hintHistory와 내부 evidence 이름을 노출하지 않습니다.`;
