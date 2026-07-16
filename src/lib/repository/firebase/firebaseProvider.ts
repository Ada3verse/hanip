import type { AuthProvider } from "@/lib/auth/authProvider";
import { AuthProviderError, type AuthSessionState, type AuthUser } from "@/lib/auth/types";
import { createFirebaseClientDescriptor } from "@/lib/firebase/client";
import type { FirebasePublicConfig } from "@/lib/firebase/types";
import { FirebaseLearningRepository } from "./firebaseLearningRepository";
import { initializeFirebaseClient } from "@/lib/firebase/client";
import type { LearningRepository } from "@/lib/repository/learningRepository";
import { createFirestoreDocumentGateway, FirestoreLearningRepository } from "./firestoreRepository";
import { createFirebaseAuthGateway, FirebaseAuthProvider } from "./firebaseAuthProvider";

export function createFirebaseRepositoryStub(config: FirebasePublicConfig) {
  return new FirebaseLearningRepository({ client: createFirebaseClientDescriptor(config) });
}

export function createFirebaseRepository(config: FirebasePublicConfig, fallback?: LearningRepository) {
  const { firestore } = initializeFirebaseClient(config);
  return new FirestoreLearningRepository(createFirestoreDocumentGateway(firestore), fallback);
}

export function createFirebaseAuthProvider(config: FirebasePublicConfig, fallback?: AuthProvider) {
  const { auth } = initializeFirebaseClient(config);
  return new FirebaseAuthProvider(createFirebaseAuthGateway(auth), fallback);
}

export class FirebaseAuthProviderStub implements AuthProvider {
  readonly provider = "firebase" as const;
  private listeners = new Set<(state: AuthSessionState) => void>();
  private unavailable(): never { throw new AuthProviderError("NOT_IMPLEMENTED", "Firebase Authentication SDK는 아직 연결되지 않았습니다."); }
  async getCurrentUser(): Promise<AuthUser | null> { return this.unavailable(); }
  async signInAsGuest(): Promise<AuthUser> { return this.unavailable(); }
  async signOut(): Promise<void> { this.unavailable(); }
  async updateDisplayName(): Promise<AuthUser> { return this.unavailable(); }
  subscribe(listener: (state: AuthSessionState) => void) { this.listeners.add(listener); listener({ status: "error", user: null, error: "NOT_IMPLEMENTED" }); return () => { this.listeners.delete(listener); }; }
}
