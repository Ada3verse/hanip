import type { AuthoringKnowledgePack, PackStatus } from "@/lib/knowledge/authoring/types";
import type { ContentConflict } from "@/lib/knowledge/ingestion/types";
export type KnowledgeRole = "author" | "reviewer" | "verifier" | "publisher" | "administrator";
export type AssignmentStatus = "assigned" | "in_progress" | "completed" | "returned" | "cancelled";
export interface ReleaseActor { actorId: string; role: KnowledgeRole; }
export interface ReviewAssignment { assignmentId: string; packId: string; conceptIds: string[]; reviewerId: string; role: "reviewer" | "verifier"; assignedBy: string; status: AssignmentStatus; dueAt?: string; createdAt: string; completedAt?: string; }
export type ChecklistDecision = "pass" | "fail" | "needs_revision" | "not_applicable";
export interface ChecklistEntry { key: string; decision: ChecklistDecision; note: string; reviewerId: string; reviewedAt: string; }
export interface ConceptReviewChecklist { conceptId: string; entries: ChecklistEntry[]; completed: boolean; }
export interface PackWorkflow { pack: AuthoringKnowledgePack; status: PackStatus; authoredBy: string; reviewedBy: string | null; reviewedAt: string | null; verifiedBy: string | null; verifiedAt: string | null; checklists: ConceptReviewChecklist[]; conflicts: ContentConflict[]; modifiedFields: string[]; }
export type ReleaseStatus = "candidate" | "verified" | "published" | "superseded" | "rolled_back" | "archived";
export interface KnowledgePackRelease { releaseId: string; packId: string; version: string; schemaVersion: number; status: ReleaseStatus; conceptSnapshot: Readonly<AuthoringKnowledgePack["concepts"]>; provenanceSnapshot: Readonly<AuthoringKnowledgePack["provenance"]>; checksum: string; releaseNotes: string; createdBy: string; verifiedBy: string; publishedBy: string | null; createdAt: string; verifiedAt: string; publishedAt: string | null; supersedesReleaseId: string | null; rollbackTargetIds: string[]; }
export interface ActiveKnowledgeRelease { subject: string; domain: string; schoolLevel: string; gradeRange: number[]; activeReleaseId: string; previousReleaseId: string | null; activatedAt: string; activatedBy: string; }
export type MigrationStrategy = "preserve" | "merge" | "split" | "reset" | "archive";
export interface ConceptMigration { fromReleaseId: string; toReleaseId: string; fromConceptId: string; toConceptId: string; strategy: MigrationStrategy; note: string; }
export interface KnowledgeAuditEvent { eventId: string; actorId: string; actorRole: KnowledgeRole; action: string; targetType: string; targetId: string; previousStatus: string | null; nextStatus: string | null; changedFields: string[]; reason: string; createdAt: string; }
export interface ReleaseDiff { addedConcepts: string[]; deletedConcepts: string[]; changedDefinitions: string[]; changedDiscriminationRules: string[]; changedPrerequisites: string[]; changedCompletionCriteria: string[]; addedExamples: string[]; deletedExamples: string[]; changedAnswers: string[]; changedMisconceptions: string[]; changedProvenance: boolean; requiredBump: "patch" | "minor" | "major"; }
