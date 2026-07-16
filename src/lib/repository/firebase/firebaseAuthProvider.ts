import { onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut, updateProfile, type Auth, type User } from "firebase/auth";
import type { AuthProvider } from "@/lib/auth/authProvider";
import type { AuthSessionState, AuthUser } from "@/lib/auth/types";

export interface FirebaseAuthGateway {
  currentUser(): User | null;
  signInAnonymously(): Promise<User>;
  signOut(): Promise<void>;
  updateDisplayName(name: string): Promise<User>;
  subscribe(listener: (user: User | null) => void, error: (error: Error) => void): () => void;
}

export function createFirebaseAuthGateway(auth: Auth): FirebaseAuthGateway {
  return { currentUser: () => auth.currentUser, async signInAnonymously() { return (await signInAnonymously(auth)).user; },
    signOut: () => firebaseSignOut(auth), async updateDisplayName(name) { if (!auth.currentUser) throw new Error("Firebase 사용자가 없습니다."); await updateProfile(auth.currentUser, { displayName: name }); return auth.currentUser; },
    subscribe(listener, error) { return onAuthStateChanged(auth, listener, error); } };
}

function toAuthUser(user: User): AuthUser { const createdAt = user.metadata.creationTime ?? new Date().toISOString(); return { id: user.uid, displayName: user.displayName?.trim() || "학생", email: user.email, isGuest: user.isAnonymous, provider: "firebase", createdAt, lastLoginAt: user.metadata.lastSignInTime ?? createdAt }; }

export class FirebaseAuthProvider implements AuthProvider {
  readonly provider = "firebase" as const;
  constructor(private readonly gateway: FirebaseAuthGateway, private readonly fallback?: AuthProvider) {}
  private async recover<T>(remote: () => Promise<T>, local: () => Promise<T>): Promise<T> { try { return await remote(); } catch { if (!this.fallback) throw new Error("Firebase 인증에 실패했습니다."); return local(); } }
  async initialize() { const current = this.gateway.currentUser(); return current ? toAuthUser(current) : this.signInAsGuest(); }
  async getCurrentUser() { return this.recover(async () => { const user = this.gateway.currentUser(); return user ? toAuthUser(user) : null; }, () => this.fallback!.getCurrentUser()); }
  async signInAsGuest(displayName?: string) { return this.recover(async () => { const user = await this.gateway.signInAnonymously(); if (displayName?.trim()) return this.updateDisplayName(displayName); return toAuthUser(user); }, () => this.fallback!.signInAsGuest(displayName)); }
  async signOut() { return this.recover(() => this.gateway.signOut(), () => this.fallback!.signOut()); }
  async updateDisplayName(displayName: string) { const name = displayName.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20) || "학생"; return this.recover(async () => toAuthUser(await this.gateway.updateDisplayName(name)), () => this.fallback!.updateDisplayName(name)); }
  subscribe(listener: (state: AuthSessionState) => void) { let fallbackUnsubscribe: (() => void) | null = null; const unsubscribe = this.gateway.subscribe((user) => listener(user ? { status: user.isAnonymous ? "guest" : "authenticated", user: toAuthUser(user), error: null } : { status: "signed_out", user: null, error: null }), () => { if (this.fallback) fallbackUnsubscribe = this.fallback.subscribe(listener); else listener({ status: "error", user: null, error: "인증을 시작하지 못했습니다." }); }); return () => { unsubscribe(); fallbackUnsubscribe?.(); }; }
}
