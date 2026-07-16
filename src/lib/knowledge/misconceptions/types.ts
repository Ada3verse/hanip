import type { KnowledgeProvenance } from "@/lib/knowledge/source/types";

export type MisconceptionDefinition = {
  id: string;
  concepts: readonly string[];
  triggerKeywords: readonly string[];
  misconceptionPatterns: readonly string[];
  correctionStrategy: string;
  compareExamples: readonly string[];
  nextQuestionStyle: string;
  completionCondition: string;
  provenance: KnowledgeProvenance;
};

export type MisconceptionMatch = {
  misconception: MisconceptionDefinition;
  occurrenceCount: number;
  useNewCompareExample: boolean;
};
