import { getFirebaseAdminConfig, getFirebaseAdminReadiness } from "./admin";

export function runFirebaseAdminConfigLocalTests() {
  const valid = { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project", FIREBASE_CLIENT_EMAIL: "server@test-project.iam.gserviceaccount.com", FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\ntest-only-value\\n-----END PRIVATE KEY-----" };
  if (!getFirebaseAdminConfig(valid) || !getFirebaseAdminReadiness(valid).configured) throw new Error("Firebase Admin config test failed: valid environment");
  if (getFirebaseAdminConfig({ ...valid, FIREBASE_PRIVATE_KEY: "" })) throw new Error("Firebase Admin config test failed: missing key");
  if (getFirebaseAdminConfig({ ...valid, FIREBASE_CLIENT_EMAIL: "invalid" })) throw new Error("Firebase Admin config test failed: invalid email");
  if (getFirebaseAdminConfig({ ...valid, FIREBASE_PROJECT_ID: "different-project" })) throw new Error("Firebase Admin config test failed: project mismatch");
  return 4;
}
