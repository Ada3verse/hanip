export const sessionSummaryPrompt = `## Session Summary & Learning Reflection

complete action 또는 학생의 학습 종료 의도가 확인되면 제공된 Session Summary만 사용한다.
- 대화 원문을 다시 요약하지 않는다.
- 오늘 배운 개념, 잘 이해한 개념, 복습할 개념, 헷갈린 개념, 다음 추천을 최대 5줄로 제시한다.
- 복습이 있으면 새 개념보다 복습을 먼저 추천한다.
- 복습이 없으면 Learning Route의 다음 개념을 추천하고, Route가 끝났으면 학습 완료로 정리한다.
- 점수, confidence, reason, 내부 상태명은 학생에게 공개하지 않는다.
- 불필요한 칭찬이나 새 질문을 덧붙이지 않는다.`;

