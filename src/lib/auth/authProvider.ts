import type { AuthProviderType, AuthSessionState, AuthUser } from "./types";

export interface AuthProvider {
  readonly provider: AuthProviderType;
  getCurrentUser(): Promise<AuthUser | null>;
  signInAsGuest(displayName?: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  updateDisplayName(displayName: string): Promise<AuthUser>;
  subscribe(listener: (state: AuthSessionState) => void): () => void;
}
