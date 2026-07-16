import type { KnowledgeProvenance, KnowledgeScope, KnowledgeSource, KnowledgeVerificationStatus } from "@/lib/knowledge/source/types";

export interface AchievementStandardReference { code: string; title: string; description?: string; sourceId: string; pageRange?: string; }
export interface CurriculumMetadata { curriculumYear: "2022"; schoolLevel: "middle"; subject: "국어"; domain: "문법"; gradeBands: number[]; achievementStandards: AchievementStandardReference[]; }
export interface KnowledgeField { id: string; content: string; sourceIds: string[]; pageRange?: string; verificationStatus: KnowledgeVerificationStatus; note?: string; }
export interface KnowledgeExampleEntry { id: string; sentence: string; focusExpression: string; observation: string; explanation: string; difficulty: 1 | 2 | 3; applicableConceptIds: string[]; misconceptionIds: string[]; sourceIds: string[]; verificationStatus: KnowledgeVerificationStatus; }
export interface KnowledgeMisconceptionEntry { id: string; statement: string; triggerPatterns: string[]; correctionPrinciple: string; compareExampleIds: string[]; sourceIds: string[]; verificationStatus: KnowledgeVerificationStatus; }
export interface KnowledgeTeachingPrompt { id: string; purpose: "diagnose" | "hint" | "explain" | "compare" | "apply" | "confirm"; prompt: string; expectedFocus: string; difficulty: 1 | 2 | 3; sourceIds: string[]; verificationStatus: KnowledgeVerificationStatus; }
export interface KnowledgeCompletionCriterion { id: string; description: string; requiredEvidence: "definition" | "classification" | "comparison" | "application" | "explanation"; minimumSuccessfulApplications: number; sourceIds: string[]; verificationStatus: KnowledgeVerificationStatus; }
export interface KnowledgeConceptEntry {
  id: string; name: string; aliases: string[]; parentConceptId: string | null; prerequisiteConceptIds: string[]; relatedConceptIds: string[];
  definition: KnowledgeField | null; explanation: KnowledgeField[]; classificationCriteria: KnowledgeField[]; comparisonCriteria: KnowledgeField[];
  examples: KnowledgeExampleEntry[]; misconceptions: KnowledgeMisconceptionEntry[]; teachingPrompts: KnowledgeTeachingPrompt[]; completionCriteria: KnowledgeCompletionCriterion[];
  scope: KnowledgeScope; provenance: KnowledgeProvenance;
}
export interface KnowledgeContentPack { id: string; version: string; title: string; curriculum: CurriculumMetadata; sources: KnowledgeSource[]; concepts: KnowledgeConceptEntry[]; createdAt: string; updatedAt: string; }
export interface ContentPackValidationIssue { code: string; path: string; message: string; }
export interface ContentPackValidationResult { valid: boolean; errors: ContentPackValidationIssue[]; warnings: ContentPackValidationIssue[]; }
export interface ImportedContentPack { pack: KnowledgeContentPack; validation: ContentPackValidationResult; importedAt: string; }
