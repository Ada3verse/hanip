import { LocalLearningRepository, createEmptyLearningUserData, repositoryStorageKey } from "@/lib/repository/localLearningRepository";
import type { LearningUserData } from "@/lib/repository/types";
import type { AuthProvider } from "./authProvider";
import type { AuthSessionState, AuthUser } from "./types";

export const LOCAL_AUTH_USER_KEY = "HANIP_LOCAL_AUTH_USER_V1";
const LEGACY_USER_ID = "local-user";

export function normalizeDisplayName(value?: string) {
  const safe = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20);
  return safe || "학생";
}

function validUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const user = value as Partial<AuthUser>;
  return typeof user.id === "string" && /^local-[a-zA-Z0-9-]{8,}$/.test(user.id) &&
    typeof user.displayName === "string" && user.displayName.length <= 20 &&
    user.email === null && user.isGuest === true && user.provider === "local" &&
    typeof user.createdAt === "string" && !Number.isNaN(Date.parse(user.createdAt)) &&
    typeof user.lastLoginAt === "string" && !Number.isNaN(Date.parse(user.lastLoginAt));
}

function mergeByKey<T>(left: T[], right: T[], key: (value: T) => string) {
  const map = new Map<string, T>();
  [...left, ...right].forEach((item) => map.set(key(item), item));
  return [...map.values()];
}

function mergeUserData(legacy: LearningUserData, current: LearningUserData, userId: string): LearningUserData {
  const latest = Date.parse(current.updatedAt) >= Date.parse(legacy.updatedAt) ? current : legacy;
  return {
    ...latest,
    userId,
    currentSessionId: current.currentSessionId ?? legacy.currentSessionId,
    sessions: mergeByKey(legacy.sessions, current.sessions, ({ sessionId }) => sessionId),
    progress: {
      ...(Date.parse(current.progress.updatedAt) >= Date.parse(legacy.progress.updatedAt) ? current.progress : legacy.progress),
      concepts: mergeByKey(legacy.progress.concepts, current.progress.concepts, ({ conceptId }) => conceptId),
      totalSessions: Math.max(legacy.progress.totalSessions, current.progress.totalSessions),
    },
    masteryProfiles: mergeByKey(legacy.masteryProfiles, current.masteryProfiles, ({ conceptId }) => conceptId),
    hintStates: mergeByKey(legacy.hintStates, current.hintStates, ({ conceptId }) => conceptId),
    workedExampleStates: mergeByKey(legacy.workedExampleStates, current.workedExampleStates, ({ conceptId }) => conceptId),
    misconceptionProfiles: mergeByKey(legacy.misconceptionProfiles, current.misconceptionProfiles, (item) => `${item.concept}:${item.misconceptionId}`),
    adaptiveProfiles: mergeByKey(legacy.adaptiveProfiles, current.adaptiveProfiles, ({ concept }) => concept),
    sessionSummaries: [...legacy.sessionSummaries, ...current.sessionSummaries].slice(-30),
    settings: current.settings,
    createdAt: Date.parse(legacy.createdAt) < Date.parse(current.createdAt) ? legacy.createdAt : current.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function authMigrationMarkerKey(userId: string) {
  return `HANIP_AUTH_USER_MIGRATION_V1:${userId}`;
}

export function migrateLegacyLocalUser(storage: Storage, userId: string) {
  const marker = authMigrationMarkerKey(userId);
  if (storage.getItem(marker)) return;
  const repository = new LocalLearningRepository(storage);
  const legacyRaw = storage.getItem(repositoryStorageKey(LEGACY_USER_ID));
  if (!legacyRaw) { storage.setItem(marker, new Date().toISOString()); return; }
  try {
    const legacy = repository.loadUserDataSync(LEGACY_USER_ID);
    const current = repository.loadUserDataSync(userId) ?? createEmptyLearningUserData(userId);
    if (legacy) repository.saveUserDataSync(userId, mergeUserData(legacy, current, userId));
    storage.setItem(marker, new Date().toISOString());
  } catch {
    // 원본과 marker를 유지하지 않아 다음 초기화에서 안전하게 재시도합니다.
  }
}

export class LocalAuthProvider implements AuthProvider {
  readonly provider = "local" as const;
  private listeners = new Set<(state: AuthSessionState) => void>();
  private state: AuthSessionState = { status: "loading", user: null, error: null };
  constructor(private readonly storage: Storage) {}

  private emit(state: AuthSessionState) { this.state = state; this.listeners.forEach((listener) => listener(state)); }
  async getCurrentUser() {
    const raw = this.storage.getItem(LOCAL_AUTH_USER_KEY);
    if (!raw) { this.emit({ status: "signed_out", user: null, error: null }); return null; }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (validUser(parsed)) {
        const user = { ...parsed, displayName: normalizeDisplayName(parsed.displayName), lastLoginAt: new Date().toISOString() };
        this.storage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
        migrateLegacyLocalUser(this.storage, user.id);
        this.emit({ status: "guest", user, error: null });
        return user;
      }
    } catch { /* 아래에서 손상 상태를 제거합니다. */ }
    this.storage.removeItem(LOCAL_AUTH_USER_KEY);
    this.emit({ status: "signed_out", user: null, error: null });
    return null;
  }
  async signInAsGuest(displayName?: string) {
    const now = new Date().toISOString();
    const user: AuthUser = { id: `local-${crypto.randomUUID()}`, displayName: normalizeDisplayName(displayName), email: null, isGuest: true, provider: "local", createdAt: now, lastLoginAt: now };
    this.storage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
    migrateLegacyLocalUser(this.storage, user.id);
    this.emit({ status: "guest", user, error: null });
    return user;
  }
  async signOut() { this.storage.removeItem(LOCAL_AUTH_USER_KEY); this.emit({ status: "signed_out", user: null, error: null }); }
  async updateDisplayName(displayName: string) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("현재 사용자가 없습니다.");
    const updated = { ...user, displayName: normalizeDisplayName(displayName) };
    this.storage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(updated));
    this.emit({ status: "guest", user: updated, error: null });
    return updated;
  }
  subscribe(listener: (state: AuthSessionState) => void) { this.listeners.add(listener); listener(this.state); return () => { this.listeners.delete(listener); }; }
}
