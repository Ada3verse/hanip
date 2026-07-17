import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export { STUDENT_SESSION_COOKIE } from "./constants";
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1_000;
export const SESSION_IDLE_MS = 60 * 60 * 1_000;

export interface StudentSessionRecord {
  id: string; uid: string; tokenHash: string; role: "student" | "developer" | "administrator";
  createdAt: string; lastActiveAt: string; expiresAt: string; revokedAt: string | null; sessionVersion: number;
  deviceSummary?: string;
}

export interface StudentSessionStore {
  save(record: StudentSessionRecord): void | Promise<void>;
  get(id: string): StudentSessionRecord | null | Promise<StudentSessionRecord | null>;
  revoke(id: string, now?: string): void | Promise<void>;
  revokeUser(uid: string, now?: string): void | Promise<void>;
}

export class MemoryStudentSessionStore {
  private readonly records = new Map<string, StudentSessionRecord>();
  save(record: StudentSessionRecord) { this.records.set(record.id, structuredClone(record)); }
  get(id: string) { const value = this.records.get(id); return value ? structuredClone(value) : null; }
  revoke(id: string, now = new Date().toISOString()) { const value = this.records.get(id); if (value) this.records.set(id, { ...value, revokedAt: now }); }
  revokeUser(uid: string, now = new Date().toISOString()) { for (const value of this.records.values()) if (value.uid === uid) this.records.set(value.id, { ...value, revokedAt: now }); }
}

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const sign = (value: string, secret: string) => createHmac("sha256", secret).update(value).digest("base64url");

export async function issueStudentSession(uid: string, role: StudentSessionRecord["role"], sessionVersion: number, secret: string, store: StudentSessionStore, now = Date.now(), deviceSummary = "unknown") {
  if (!secret) throw new Error("missing_session_secret");
  const id = randomBytes(18).toString("base64url"); const token = randomBytes(32).toString("base64url");
  await store.save({ id, uid, role, sessionVersion, tokenHash: digest(token), createdAt: new Date(now).toISOString(), lastActiveAt: new Date(now).toISOString(), expiresAt: new Date(now + SESSION_ABSOLUTE_MS).toISOString(), revokedAt: null, deviceSummary });
  const payload = `${id}.${token}`; return `${payload}.${sign(payload, secret)}`;
}

export async function verifyStudentSession(cookie: string, secret: string, store: StudentSessionStore, expectedSessionVersion?: number, now = Date.now()) {
  const [id, token, signature] = cookie.split("."); if (!id || !token || !signature || !secret) return null;
  const expectedSignature = Buffer.from(sign(`${id}.${token}`, secret)); const actualSignature = Buffer.from(signature);
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) return null;
  const record = await store.get(id); if (!record || record.revokedAt || Date.parse(record.expiresAt) <= now || now - Date.parse(record.lastActiveAt) > SESSION_IDLE_MS || record.tokenHash !== digest(token) || (expectedSessionVersion !== undefined && record.sessionVersion !== expectedSessionVersion)) return null;
  await store.save({ ...record, lastActiveAt: new Date(now).toISOString() }); return record;
}
