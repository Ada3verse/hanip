import type { AuthProvider } from "./authProvider";
import { LocalAuthProvider } from "./localAuthProvider";
import { AuthProviderError, type AuthProviderType } from "./types";
import { getConfiguredFirebaseProvider, getFirebaseConfig } from "@/lib/firebase/config";
import type { FirebasePublicConfig } from "@/lib/firebase/types";
import { createFirebaseAuthProvider, FirebaseAuthProviderStub } from "@/lib/repository/firebase/firebaseProvider";

let localProvider: LocalAuthProvider | null = null;
export interface AuthProviderFactoryOptions {
  provider?: AuthProviderType;
  storage?: Storage;
  firebaseConfig?: FirebasePublicConfig | null;
  firebaseImplementation?: "production" | "stub";
}

export function createAuthProvider({ provider = getConfiguredFirebaseProvider(), storage, firebaseConfig, firebaseImplementation }: AuthProviderFactoryOptions): AuthProvider {
  const config = firebaseConfig === undefined ? getFirebaseConfig() : firebaseConfig;
  const fallback = storage ? new LocalAuthProvider(storage) : typeof window !== "undefined" ? new LocalAuthProvider(window.localStorage) : undefined;
  if (provider === "firebase" && config) {
    if (firebaseImplementation === "stub") return new FirebaseAuthProviderStub();
    try { return createFirebaseAuthProvider(config, fallback); } catch { if (fallback) return fallback; }
  }
  if (storage) return new LocalAuthProvider(storage);
  if (typeof window === "undefined") throw new AuthProviderError("INVALID_AUTH_STATE", "브라우저 인증 저장소를 사용할 수 없습니다.");
  localProvider ??= new LocalAuthProvider(window.localStorage);
  return localProvider;
}
