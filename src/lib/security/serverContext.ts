import { MemoryStudentCredentialStore, StudentAuthService } from "./authService";
import { LoginAttemptLimiter } from "./rateLimit";
import { MemoryStudentSessionStore } from "./session";
import type { StudentCredentialRecord } from "./types";
import type { StudentCredentialStore } from "./authService";
import type { StudentSessionStore } from "./session";
import { getFirebaseAdminConfig, initializeFirebaseAdmin } from "@/lib/firebase/admin";
import { FirestoreStudentCredentialStore, FirestoreStudentDataStore, FirestoreStudentSessionStore } from "./firestoreSecurityStore";
import { assertProductionSecrets } from "./environment";

export const studentSessionStore = new MemoryStudentSessionStore();
function configuredCredentials(): StudentCredentialRecord[] {
  try {
    const value: unknown = JSON.parse(process.env.HANIP_STUDENT_ACCOUNTS_JSON ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is StudentCredentialRecord => typeof item === "object" && item !== null && "uid" in item && typeof item.uid === "string" && "nicknameNormalizedHash" in item && typeof item.nicknameNormalizedHash === "string" && "pinHash" in item && typeof item.pinHash === "string" && !item.pinHash.includes("$plaintext$") && "role" in item && item.role === "student").slice(0, 10_000);
  } catch { return []; }
}
const credentialStore = new MemoryStudentCredentialStore(configuredCredentials());
const limiter = new LoginAttemptLimiter();
let productionContext: { credentials: StudentCredentialStore; sessions: StudentSessionStore; data: FirestoreStudentDataStore } | null = null;
export function getSecurityContext() {
  if (process.env.NODE_ENV !== "production") return { credentials: credentialStore as StudentCredentialStore, sessions: studentSessionStore as StudentSessionStore, data: null };
  if (productionContext) return productionContext;
  const config = getFirebaseAdminConfig(); if (!config) throw new Error("firebase_admin_not_configured");
  const { firestore } = initializeFirebaseAdmin(config);
  productionContext = { credentials: new FirestoreStudentCredentialStore(firestore), sessions: new FirestoreStudentSessionStore(firestore), data: new FirestoreStudentDataStore(firestore) };
  return productionContext;
}
export function getStudentAuthService() {
  assertProductionSecrets();
  const context = getSecurityContext();
  return new StudentAuthService({ credentials: context.credentials, sessions: context.sessions, limiter, pepper: process.env.HANIP_PIN_PEPPER ?? "", sessionSecret: process.env.HANIP_SESSION_SECRET ?? "", securityAudit: context.data ? (type, uid, reasonCode, success) => context.data.audit(type, uid, reasonCode, success) : undefined });
}
