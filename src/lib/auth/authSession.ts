import type { AuthProvider } from "./authProvider";
import { createAuthProvider } from "./authFactory";
import { AuthProviderError, type AuthSessionState } from "./types";

export class AuthSession {
  private state: AuthSessionState = { status: "loading", user: null, error: null };
  private listeners = new Set<(state: AuthSessionState) => void>();
  private initialized = false;
  constructor(private readonly provider: AuthProvider) {
    provider.subscribe((state) => this.setState(state));
  }
  private setState(state: AuthSessionState) { this.state = state; this.listeners.forEach((listener) => listener(state)); }
  async initialize({ createGuest = true } = {}) {
    if (this.initialized && this.state.user) return this.state;
    this.setState({ status: "loading", user: null, error: null });
    try {
      const current = await this.provider.getCurrentUser();
      if (current) this.setState({ status: current.isGuest ? "guest" : "authenticated", user: current, error: null });
      else if (createGuest) await this.signInAsGuest();
      else this.setState({ status: "signed_out", user: null, error: null });
      this.initialized = true;
    } catch (error) { this.setState({ status: "error", user: null, error: error instanceof Error ? error.message : "인증 초기화 실패" }); }
    return this.state;
  }
  getState() { return this.state; }
  getRequiredUser() {
    if (this.state.status === "loading") throw new AuthProviderError("INVALID_AUTH_STATE", "인증 초기화가 완료되지 않았습니다.");
    if (!this.state.user) throw new AuthProviderError("INVALID_AUTH_STATE", "현재 사용자가 없습니다.");
    return this.state.user;
  }
  subscribe(listener: (state: AuthSessionState) => void) { this.listeners.add(listener); listener(this.state); return () => { this.listeners.delete(listener); }; }
  async signInAsGuest(displayName?: string) { const user = await this.provider.signInAsGuest(displayName); this.initialized = true; this.setState({ status: "guest", user, error: null }); return user; }
  async signOut() { await this.provider.signOut(); this.initialized = true; this.setState({ status: "signed_out", user: null, error: null }); }
  async updateDisplayName(displayName: string) { const user = await this.provider.updateDisplayName(displayName); this.setState({ status: user.isGuest ? "guest" : "authenticated", user, error: null }); return user; }
}

let session: AuthSession | null = null;
export function getAuthSession() {
  session ??= new AuthSession(createAuthProvider({ provider: "local" }));
  return session;
}
