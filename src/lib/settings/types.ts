export const INPUT_MODES = ["balanced", "choice_preferred", "free_input_preferred"] as const;
export const TEXT_SIZES = ["small", "medium", "large"] as const;
export type PreferredInputMode = (typeof INPUT_MODES)[number];
export type TextSize = (typeof TEXT_SIZES)[number];
export interface UserSettings {
  tutorName: string;
  preferredInputMode: PreferredInputMode;
  textSize: TextSize;
  reducedMotion: boolean;
  showLearningStatus: boolean;
  showSuggestedReplies: boolean;
  updatedAt: string;
}

