import "server-only";
import { randomUUID, createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { StudentCredentialStore } from "./authService";
import type { StudentCredentialRecord } from "./types";
import type { StudentSessionRecord } from "./session";
import { calculateRetentionDeadline, privacyRetentionPolicy } from "./privacyPolicy";
import { filterPersonalData } from "./privacyFilter";

const blockedSecret = /(?:sk-(?:proj-)?[A-Za-z0-9_-]{12,}|-----BEGIN PRIVATE KEY-----|\b\d{4}\b.*(?:PIN|pin)|session[_-]?token|api[_-]?key)/;
function safeRecord(value: unknown): StudentCredentialRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as StudentCredentialRecord;
  return typeof item.uid === "string" && typeof item.nicknameNormalizedHash === "string" && typeof item.pinHash === "string" && item.role === "student" ? item : null;
}

export class FirestoreStudentCredentialStore implements StudentCredentialStore {
  constructor(private readonly firestore: Firestore) {}
  async findByNicknameHash(hash: string) {
    const result = await this.firestore.collection("users").where("nicknameNormalizedHash", "==", hash).limit(1).get();
    return result.empty ? null : safeRecord(result.docs[0].data());
  }
  async save(record: StudentCredentialRecord) {
    const now = new Date().toISOString();
    const user = this.firestore.collection("users").doc(record.uid); const batch = this.firestore.batch();
    batch.set(user, { ...record, termsVersion: record.consentState?.termsVersion ?? privacyRetentionPolicy.termsVersion, privacyVersion: record.consentState?.privacyVersion ?? privacyRetentionPolicy.privacyVersion, updatedAt: now, retentionDeadline: record.retentionDeadline ?? calculateRetentionDeadline(new Date(record.createdAt ?? now)), deletionStatus: record.deletionStatus ?? "active" }, { merge: true });
    if (record.consentState) batch.set(user.collection("consents").doc(`${record.consentState.termsVersion}_${record.consentState.privacyVersion}`), { uid: record.uid, termsVersion: record.consentState.termsVersion, privacyVersion: record.consentState.privacyVersion, requiredConsent: record.consentState.requiredConsent ?? (record.consentState.requiredTerms && record.consentState.requiredPrivacy), optionalConsent: record.consentState.optionalConsent ?? (record.consentState.optionalAnalytics || record.consentState.optionalResearch), agreedAt: record.consentState.agreedAt, consentMethod: record.consentState.consentMethod });
    await batch.commit();
  }
}

export class FirestoreStudentSessionStore {
  constructor(private readonly firestore: Firestore) {}
  async save(record: StudentSessionRecord) { await this.firestore.doc(`users/${record.uid}/sessions/${record.id}`).set({ id: record.id, uid: record.uid, hashedSessionToken: record.tokenHash, createdAt: record.createdAt, lastActiveAt: record.lastActiveAt, expiresAt: record.expiresAt, revokedAt: record.revokedAt, sessionVersion: record.sessionVersion, deviceSummary: record.deviceSummary ?? "unknown" }); }
  async get(id: string): Promise<StudentSessionRecord | null> { const values = await this.firestore.collectionGroup("sessions").where("id", "==", id).limit(1).get(); const value = values.docs[0]; if (!value) return null; const uid = value.ref.parent.parent?.id; if (!uid) return null; const data = value.data(); return { id, uid, role: "student", tokenHash: String(data.hashedSessionToken ?? ""), createdAt: String(data.createdAt ?? ""), lastActiveAt: String(data.lastActiveAt ?? ""), expiresAt: String(data.expiresAt ?? ""), revokedAt: typeof data.revokedAt === "string" ? data.revokedAt : null, sessionVersion: Number(data.sessionVersion ?? 0), deviceSummary: typeof data.deviceSummary === "string" ? data.deviceSummary : "unknown" }; }
  async revoke(id: string, now = new Date().toISOString()) { const value = await this.get(id); if (value) await this.firestore.doc(`users/${value.uid}/sessions/${id}`).set({ revokedAt: now }, { merge: true }); }
  async revokeUser(uid: string, now = new Date().toISOString()) { const sessions = await this.firestore.collection(`users/${uid}/sessions`).get(); const batch = this.firestore.batch(); sessions.docs.forEach((doc) => batch.set(doc.ref, { revokedAt: now }, { merge: true })); await batch.commit(); }
}

export class FirestoreStudentDataStore {
  constructor(private readonly firestore: Firestore) {}
  async saveTurn(uid: string, conversationId: string, userContent: string, assistantContent: string, learningState: unknown) {
    const user = filterPersonalData(userContent).safeText.slice(0, 5000); const assistant = filterPersonalData(assistantContent).safeText.slice(0, 5000);
    if (blockedSecret.test(user) || blockedSecret.test(assistant)) throw new Error("unsafe_conversation_content");
    const nowDate = new Date(); const now = nowDate.toISOString(); const assistantCreatedAt = new Date(nowDate.getTime() + 1).toISOString(); const state = learningState && typeof learningState === "object" ? learningState as Record<string, unknown> : {}; const dialogue = state.dialoguePlan && typeof state.dialoguePlan === "object" ? state.dialoguePlan as Record<string, unknown> : {}; const retrieval = state.retrieval && typeof state.retrieval === "object" ? state.retrieval as Record<string, unknown> : {}; const studentModel = state.studentModel && typeof state.studentModel === "object" ? state.studentModel as Record<string, unknown> : {}; const conversation = this.firestore.doc(`users/${uid}/conversations/${conversationId}`); const batch = this.firestore.batch();
    batch.set(conversation, { createdAt: now, updatedAt: now, status: "active" }, { merge: true });
    batch.set(conversation.collection("messages").doc(randomUUID()), { role: "user", content: user, createdAt: now, contentSafetyState: "filtered" });
    batch.set(conversation.collection("messages").doc(randomUUID()), { role: "assistant", content: assistant, createdAt: assistantCreatedAt, contentSafetyState: "filtered", currentConcept: String(state.concept ?? dialogue.activeConcept ?? "").slice(0, 100), teachingStrategy: String(dialogue.teachingStrategy ?? "").slice(0, 80), understandingBefore: typeof studentModel.understandingLevel === "number" ? studentModel.understandingLevel : null, understandingAfter: typeof state.confidence === "number" ? state.confidence : null, misconception: String(state.misconception ?? "").slice(0, 200), retrievalEvidenceCount: Array.isArray(retrieval.usedEvidence) ? retrieval.usedEvidence.length : 0, responseMode: String(dialogue.suggestedReplyMode ?? "").slice(0, 40), error: false });
    batch.set(this.firestore.doc(`users/${uid}/learningState/current`), { value: learningState, updatedAt: now }, { merge: true }); await batch.commit();
  }
  async audit(type: string, uid: string, reasonCode: string, success = true) { await this.firestore.collection("securityLogs").add({ type, actorHash: createHash("sha256").update(uid).digest("hex"), reasonCode, success, occurredAt: new Date().toISOString() }); }
  async createStudent(record: StudentCredentialRecord) { await new FirestoreStudentCredentialStore(this.firestore).save({ ...record, createdAt: record.createdAt ?? new Date().toISOString(), retentionDeadline: record.retentionDeadline ?? calculateRetentionDeadline(), deletionStatus: "active", consentState: record.consentState ?? null }); await this.audit("student_created", record.uid, privacyRetentionPolicy.termsVersion); }
}
