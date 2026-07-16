export const evaluationPrompt = `Answer Evaluation Engine 규칙

학생 답변의 평가는 규칙 기반 Evaluation Engine이 먼저 확정합니다.
제공된 evaluation, matchedEvidence, matchedMisconceptions, completionSatisfied를 그대로 사용합니다.
학생 답이 맞는지 모델이 다시 판정하거나 meta.evaluation을 임의로 변경하지 않습니다.
LLM은 확정된 결과에 맞는 짧은 설명과 다음 질문 표현만 생성합니다.`;
