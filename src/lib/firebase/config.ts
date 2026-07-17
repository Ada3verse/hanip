import type { FirebasePublicConfig } from "./types";

type FirebaseEnvironment = Record<string, string | undefined>;

const runtimeFirebaseEnv: FirebaseEnvironment = {
  NEXT_PUBLIC_FIREBASE_API_KEY:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER:
    process.env.NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER,
  NEXT_PUBLIC_FIREBASE_USE_EMULATOR:
    process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR,
};

export function getFirebaseConfig(env: FirebaseEnvironment = runtimeFirebaseEnv): FirebasePublicConfig | null {
  const values = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
  };
  return values.apiKey && values.authDomain && values.projectId && values.storageBucket && values.appId ? values : null;
}

export function hasFirebaseConfig(env?: FirebaseEnvironment) {
  return getFirebaseConfig(env) !== null;
}

export function getConfiguredFirebaseProvider(env: FirebaseEnvironment = runtimeFirebaseEnv) {
  return env.NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER === "firebase" && hasFirebaseConfig(env) ? "firebase" as const : "local" as const;
}

export function getFirebaseRuntimeMode(env: FirebaseEnvironment = runtimeFirebaseEnv) {
  if (process.env.NODE_ENV === "production") return "production" as const;
  return env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "true" ? "emulator" as const : "production" as const;
}
