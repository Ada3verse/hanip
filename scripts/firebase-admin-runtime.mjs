import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

nextEnv.loadEnvConfig(process.cwd());
export function getAdminFirestore() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(); const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim(); const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey.startsWith("-----BEGIN PRIVATE KEY-----")) throw new Error("Firebase Admin 환경변수가 올바르지 않습니다.");
  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }); return getFirestore(app);
}
