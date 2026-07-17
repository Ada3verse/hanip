import { randomUUID } from "node:crypto";
import type { StudentCredentialStore } from "./authService";
import type { StudentSessionStore } from "./session";
import type { SecurityAuditEvent, StudentCredentialRecord } from "./types";
import { calculateRetentionDeadline } from "./privacyPolicy";
import { hashPin, isValidNickname, nicknameLookupHash, normalizeNickname } from "./pin";

export async function createStudentAccount(input: { nickname: string; pin: string; pepper: string; credentials: StudentCredentialStore; audit(event: SecurityAuditEvent): void | Promise<void>; now?: Date }) {
  if (!isValidNickname(input.nickname) || !/^\d{4}$/.test(input.pin) || !input.pepper) throw new Error("invalid_account_input");
  const lookup = nicknameLookupHash(input.nickname, input.pepper); if (await input.credentials.findByNicknameHash(lookup)) throw new Error("duplicate_nickname");
  const now = input.now ?? new Date(); const uid = randomUUID();
  const record: StudentCredentialRecord = { uid, nicknameDisplay: normalizeNickname(input.nickname), nicknameNormalizedHash: lookup, pinHash: await hashPin(input.pin, input.pepper), status: "active", role: "student", consentState: null, failedLoginCount: 0, lockCount: 0, lockedUntil: null, sessionVersion: 1, createdAt: now.toISOString(), updatedAt: now.toISOString(), lastLoginAt: null, retentionDeadline: calculateRetentionDeadline(now), deletionStatus: "active" };
  await input.credentials.save(record); await input.audit({ type: "student_created", actorHash: lookup, success: true, occurredAt: now.toISOString(), reasonCode: "administrator_cli" });
  return { uid, nickname: record.nicknameDisplay, oneTimePin: input.pin, retentionDeadline: record.retentionDeadline };
}

export async function resetStudentPin(input: { nickname: string; pin: string; pepper: string; credentials: StudentCredentialStore; sessions: StudentSessionStore; audit(event: SecurityAuditEvent): void | Promise<void>; now?: Date }) {
  if (!isValidNickname(input.nickname) || !/^\d{4}$/.test(input.pin) || !input.pepper) throw new Error("invalid_account_input");
  const lookup = nicknameLookupHash(input.nickname, input.pepper); const record = await input.credentials.findByNicknameHash(lookup); if (!record) throw new Error("account_not_found"); const now = input.now ?? new Date();
  await input.credentials.save({ ...record, pinHash: await hashPin(input.pin, input.pepper), status: "active", sessionVersion: record.sessionVersion + 1, failedLoginCount: 0, lockedUntil: null, updatedAt: now.toISOString() }); await input.sessions.revokeUser(record.uid, now.toISOString());
  await input.audit({ type: "pin_reset", actorHash: lookup, success: true, occurredAt: now.toISOString(), reasonCode: "administrator_cli" }); return { uid: record.uid, nickname: record.nicknameDisplay, oneTimePin: input.pin };
}
