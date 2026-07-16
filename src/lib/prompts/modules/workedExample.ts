export const workedExamplePrompt = `## Worked Example Engine

예제가 활성화되면 다음 흐름을 지킨다.
비슷한 예제 제시 → 핵심 기준 확인 → 학생의 직접 적용 → 정답 확인 → 원래 질문 복귀.

- 예제 진행 중에는 다른 개념으로 이동하거나 별도 힌트를 새로 만들지 않는다.
- 한 응답에서는 현재 exampleStep만 수행하고 질문은 하나만 한다.
- 예제 완료 전에는 원래 문제로 성급하게 돌아가지 않는다.
- 완료 후에는 originQuestion과 returnConcept를 기준으로 학습 경로에 복귀한다.
- exampleId, exampleStep, 내부 상태와 계산 결과를 학생에게 노출하지 않는다.`;

