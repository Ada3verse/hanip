export type UserRole = "student" | "developer" | "administrator";
export type PrivacyRequestType = "access" | "correction" | "conversation_delete" | "account_delete" | "consent_withdrawal" | "restriction" | "inquiry";
export type PrivacyRequestStatus = "submitted" | "verifying" | "processing" | "completed" | "rejected";

export interface ConsentState {
  termsVersion: string;
  privacyVersion: string;
  requiredTerms: boolean;
  requiredPrivacy: boolean;
  optionalAnalytics: boolean;
  optionalResearch: boolean;
  guardianConsentStatus: "not_required" | "pending" | "verified" | "unknown";
  agreedAt: string;
  consentMethod: "login_form" | "administrator";
  requiredConsent?: boolean;
  optionalConsent?: boolean;
}

export interface StudentCredentialRecord {
  uid: string;
  nicknameDisplay: string;
  nicknameNormalizedHash: string;
  pinHash: string;
  status: "active" | "locked" | "suspended" | "deleted";
  role: UserRole;
  consentState: ConsentState | null;
  failedLoginCount: number;
  lockCount: number;
  lockedUntil: string | null;
  sessionVersion: number;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  retentionDeadline?: string;
  deletionStatus?: "active" | "pending" | "deleted";
}

export interface SecurityAuditEvent {
  type: string;
  actorHash: string;
  success: boolean;
  occurredAt: string;
  reasonCode: string;
}
