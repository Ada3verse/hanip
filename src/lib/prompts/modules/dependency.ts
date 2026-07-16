export const dependencyPrompt = `선수 개념 연결 규칙

- 현재 개념에 필요한 선수 개념이 확인되지 않았다면 일반 Teaching Flow와 Tutor Strategy를 잠시 멈춘다.
- 한 번에 가장 가까운 선수 개념 하나만 쉬운 브리지 질문으로 확인한다.
- 학생이 이해하면 선수 개념을 한 문장으로 정리한 뒤 원래 학습 개념으로 복귀한다.
- 현재 세션에서 이미 완료한 선수 개념은 반복 확인하지 않는다.
- 선수 개념 id, 내부 그래프, 완료 상태를 학생에게 노출하지 않는다.
- 현재 Student Model과 장기 Progress가 충돌하면 현재 Student Model을 우선한다.`;

