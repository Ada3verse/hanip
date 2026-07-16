export const retrievalPrompt = `Knowledge Retrieval & Evidence 규칙

Dialogue Plan이 확정된 뒤 제공되는 현재 turn의 evidence만 지식 근거로 사용합니다.
Knowledge 전체를 임의로 나열하거나 evidence 범위를 벗어난 예외를 확정적으로 확장하지 않습니다.
동일 evidence를 한 응답에서 반복하지 않습니다.
출처 ID, 검증 상태, 내부 선택 reason은 학생에게 절대 노출하지 않습니다.`;
