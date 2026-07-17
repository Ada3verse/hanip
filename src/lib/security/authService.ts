import type { SecurityAuditEvent, StudentCredentialRecord } from "./types";
import { LoginAttemptLimiter } from "./rateLimit";
import { nicknameLookupHash, verifyPin } from "./pin";
import { issueStudentSession, type StudentSessionStore } from "./session";
import { privacyRetentionPolicy } from "./privacyPolicy";

export const GENERIC_LOGIN_ERROR = "닉네임 또는 PIN이 올바르지 않습니다.";
export const PIN_ATTEMPT_LIMIT_MESSAGE = "PIN 입력 기회를 모두 사용했습니다. 관리자에게 문의해 주세요.";
export const LOCKED_LOGIN_MESSAGE = "로그인이 잠겨 있습니다. 관리자에게 문의해 주세요.";
export interface StudentCredentialStore { findByNicknameHash(hash: string): Promise<StudentCredentialRecord | null>; save(record: StudentCredentialRecord): Promise<void>; }
export class MemoryStudentCredentialStore implements StudentCredentialStore {
  constructor(private readonly records: StudentCredentialRecord[] = []) {}
  async findByNicknameHash(hash: string) { return this.records.find((record) => record.nicknameNormalizedHash === hash) ?? null; }
  async save(record: StudentCredentialRecord) { const index = this.records.findIndex(({ uid }) => uid === record.uid); if (index >= 0) this.records[index] = structuredClone(record); else this.records.push(structuredClone(record)); }
}

type LoginFailure = { ok: false; message: string; locked: boolean; remainingAttempts: number; code: "INVALID_CREDENTIALS" | "PIN_ATTEMPTS_EXHAUSTED" | "ACCOUNT_LOCKED" };
export class StudentAuthService {
  readonly audit: SecurityAuditEvent[] = [];
  constructor(private readonly options: { credentials: StudentCredentialStore; sessions: StudentSessionStore; pepper: string; sessionSecret: string; limiter?: LoginAttemptLimiter; now?: () => number; securityAudit?: (type: string, uid: string, reasonCode: string, success?: boolean) => void | Promise<void> }) {}
  private async recordAudit(event: SecurityAuditEvent, uid?: string) { this.audit.push(event); if (uid && this.options.securityAudit) await this.options.securityAudit(event.type, uid, event.reasonCode, event.success); }
  async login(input: { nickname: string; pin: string; ipHash: string; requiredConsent: boolean; optionalAnalytics?: boolean; optionalResearch?: boolean; deviceSummary?: string }) {
    const limiter = this.options.limiter ?? new LoginAttemptLimiter(); const lookup = nicknameLookupHash(input.nickname, this.options.pepper); const key = `${input.ipHash}:${lookup}`; const now = new Date(this.options.now?.() ?? Date.now());
    const record = await this.options.credentials.findByNicknameHash(lookup);
    if (record && (record.status === "locked" || record.failedLoginCount >= 5)) {
      await this.recordAudit({ type: "locked_login_blocked", actorHash: lookup, success: false, occurredAt: now.toISOString(), reasonCode: "account_locked" }, record.uid);
      return { ok: false, message: LOCKED_LOGIN_MESSAGE, locked: true, remainingAttempts: 0, code: "ACCOUNT_LOCKED" } satisfies LoginFailure;
    }
    if (!input.requiredConsent) return { ok: false, message: GENERIC_LOGIN_ERROR, locked: false, remainingAttempts: record ? Math.max(0, 5 - record.failedLoginCount) : 4, code: "INVALID_CREDENTIALS" } satisfies LoginFailure;
    if (!record && !limiter.inspect(key).allowed) return { ok: false, message: GENERIC_LOGIN_ERROR, locked: false, remainingAttempts: 0, code: "INVALID_CREDENTIALS" } satisfies LoginFailure;
    const valid = Boolean(record && record.status === "active" && await verifyPin(input.pin, record.pinHash, this.options.pepper));
    if (!valid || !record) {
      if (!record) limiter.failure(key); const nextCount = record ? Math.min(5, record.failedLoginCount + 1) : 1; const exhausted = Boolean(record && nextCount >= 5);
      if (record) {
        await this.options.credentials.save({ ...record, status: exhausted ? "locked" : record.status, failedLoginCount: nextCount, lockCount: record.lockCount + (exhausted ? 1 : 0), lockedUntil: null, updatedAt: now.toISOString() });
        if (exhausted) await this.options.sessions.revokeUser(record.uid, now.toISOString());
      }
      await this.recordAudit({ type: exhausted ? "pin_attempts_exhausted" : "login_failed", actorHash: lookup, success: false, occurredAt: now.toISOString(), reasonCode: exhausted ? "account_locked_after_five_failures" : "invalid_credentials" }, record?.uid);
      return { ok: false, message: exhausted ? PIN_ATTEMPT_LIMIT_MESSAGE : GENERIC_LOGIN_ERROR, locked: exhausted, remainingAttempts: Math.max(0, 5 - nextCount), code: exhausted ? "PIN_ATTEMPTS_EXHAUSTED" : "INVALID_CREDENTIALS" } satisfies LoginFailure;
    }
    limiter.success(key);
    await this.options.credentials.save({ ...record, failedLoginCount: 0, lockedUntil: null, lastLoginAt: now.toISOString(), consentState: { termsVersion: privacyRetentionPolicy.termsVersion, privacyVersion: privacyRetentionPolicy.privacyVersion, requiredTerms: true, requiredPrivacy: true, requiredConsent: true, optionalConsent: input.optionalAnalytics === true || input.optionalResearch === true, optionalAnalytics: input.optionalAnalytics === true, optionalResearch: input.optionalResearch === true, guardianConsentStatus: record.consentState?.guardianConsentStatus ?? "unknown", agreedAt: now.toISOString(), consentMethod: "login_form" } });
    const cookie = await issueStudentSession(record.uid, record.role, record.sessionVersion, this.options.sessionSecret, this.options.sessions, now.getTime(), input.deviceSummary);
    await this.recordAudit({ type: "login_success", actorHash: lookup, success: true, occurredAt: now.toISOString(), reasonCode: "authenticated" }, record.uid);
    return { ok: true as const, cookie, uid: record.uid, role: record.role };
  }
}
