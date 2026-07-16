import { getConfiguredFirebaseProvider, getFirebaseConfig, hasFirebaseConfig } from "./config";

function check(value: unknown, message: string) {
  if (!value) throw new Error(`Firebase config test failed: ${message}`);
}

const completeEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
  NEXT_PUBLIC_FIREBASE_APP_ID: "test-app-id",
  NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER: "firebase",
};

export function runFirebaseConfigLocalTests() {
  const config = getFirebaseConfig(completeEnv);
  check(config?.projectId === "test-project", "complete config accepted");
  check(hasFirebaseConfig(completeEnv), "complete config detected");
  check(getConfiguredFirebaseProvider(completeEnv) === "firebase", "Firebase provider selected");
  check(getConfiguredFirebaseProvider({ ...completeEnv, NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER: "local" }) === "local", "explicit Local provider retained");
  check(getFirebaseConfig({ ...completeEnv, NEXT_PUBLIC_FIREBASE_APP_ID: "" }) === null, "missing required value rejected");
  check(getConfiguredFirebaseProvider({ ...completeEnv, NEXT_PUBLIC_FIREBASE_PROJECT_ID: undefined }) === "local", "incomplete config falls back to Local");
  check(getFirebaseConfig({ ...completeEnv, NEXT_PUBLIC_FIREBASE_API_KEY: "  test-api-key  " })?.apiKey === "test-api-key", "values trimmed");
  check(getFirebaseConfig({ ...completeEnv, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: undefined, NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: undefined }) !== null, "optional analytics values ignored");
}
