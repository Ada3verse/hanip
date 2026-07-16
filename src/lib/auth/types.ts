export type AuthProviderType = "local" | "firebase";
export type AuthStatus = "loading" | "guest" | "authenticated" | "signed_out" | "error";

export interface AuthUser {
  id: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
  provider: AuthProviderType;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSessionState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
}

export class AuthProviderError extends Error {
  constructor(public readonly code: "NOT_IMPLEMENTED" | "INVALID_AUTH_STATE", message: string) {
    super(message);
  }
}

