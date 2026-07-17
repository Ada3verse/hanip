import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { FirebaseAdminConfig } from "./types";

type FirebaseAdminEnvironment = Record<string, string | undefined>;

const runtimeFirebaseAdminEnv: FirebaseAdminEnvironment = {
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
};

export function getFirebaseAdminConfig(env: FirebaseAdminEnvironment = runtimeFirebaseAdminEnv): FirebaseAdminConfig | null {
  const publicProjectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "";
  const adminProjectId = env.FIREBASE_PROJECT_ID?.trim() ?? "";
  if (publicProjectId && adminProjectId && publicProjectId !== adminProjectId) return null;
  const projectId = adminProjectId || publicProjectId;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const privateKey = (env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  if (!clientEmail.includes("@") || !privateKey.startsWith("-----BEGIN PRIVATE KEY-----") || !privateKey.endsWith("-----END PRIVATE KEY-----")) return null;
  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminReadiness(env?: FirebaseAdminEnvironment) {
  return getFirebaseAdminConfig(env) ? { configured: true as const, reason: "configured" as const } : { configured: false as const, reason: "missing_or_invalid_environment" as const };
}

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

export function initializeFirebaseAdmin(config: FirebaseAdminConfig | null = getFirebaseAdminConfig()) {
  if (!config) throw new Error("firebase_admin_not_configured");
  adminApp ??= getApps()[0] ?? initializeApp({ credential: cert({ projectId: config.projectId, clientEmail: config.clientEmail, privateKey: config.privateKey }), projectId: config.projectId });
  adminFirestore ??= getFirestore(adminApp);
  return { app: adminApp, firestore: adminFirestore };
}

export function resetFirebaseAdminForTests() { adminApp = null; adminFirestore = null; }
