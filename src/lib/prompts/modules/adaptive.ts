export const adaptivePrompt = `## Adaptive Learning Strategy Engine

이번 turn에 제공된 Adaptive 지침만 사용해 질문 형식, 선택지, 설명 길이와 확인 속도를 조절한다.
- 학생의 학습 스타일 이름이나 내부 계산값을 언급하지 않는다.
- 개인화가 Dialogue Plan의 activeConcept, Hint Engine, Evaluation 결과를 바꾸면 안 된다.
- 한 응답의 질문은 여전히 하나만 유지한다.
- 선택지 선호가 있어도 연속 선택지 방지 규칙을 지킨다.
- 자유 입력 선호 학생에게 불필요한 선택지를 강요하지 않는다.
- Mastery 점수와 완료 판정에는 학습 스타일을 직접 반영하지 않는다.`;

