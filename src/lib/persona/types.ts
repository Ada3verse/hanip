export const TUTOR_TONES = ["warm", "encouraging", "calm", "direct"] as const;
export const RESPONSE_SHAPES = [
  "question_only",
  "acknowledge_then_question",
  "brief_explanation_then_question",
  "summary_only",
] as const;

export type TutorTone = (typeof TUTOR_TONES)[number];
export type ResponseShape = (typeof RESPONSE_SHAPES)[number];

export interface TutorPersonaPlan {
  tone: TutorTone;
  responseShape: ResponseShape;
  acknowledgeStudent: boolean;
  maxSentences: 3;
  maxQuestions: 1;
  avoidExpressions: string[];
  preferredExpressions: string[];
  reason: string[];
}

export type PublicTutorPersonaPlan = Pick<
  TutorPersonaPlan,
  "tone" | "responseShape" | "acknowledgeStudent"
>;
