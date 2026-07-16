export type ExampleDifficulty = 1 | 2 | 3;

export type WorkedExample = {
  id: string;
  concept: string;
  relatedMisconception: readonly string[];
  difficulty: ExampleDifficulty;
  sentenceA: string;
  sentenceB: string;
  focusPoint: string;
  expectedObservation: string;
  followUpQuestion: string;
  provenance: KnowledgeProvenance;
};

export type WorkedExampleMatch = {
  example: WorkedExample;
  adaptiveLevel: ExampleDifficulty;
};
import type { KnowledgeProvenance } from "@/lib/knowledge/source/types";
