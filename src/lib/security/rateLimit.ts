interface AttemptState { failures: number; lockCount: number; lockedUntil: number; lastAttemptAt: number; }
export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, AttemptState>();
  constructor(private readonly now = () => Date.now()) {}
  inspect(key: string) { const state = this.attempts.get(key); return { allowed: !state || state.lockedUntil <= this.now(), retryAfterMs: state ? Math.max(0, state.lockedUntil - this.now()) : 0 }; }
  failure(key: string) {
    const current = this.attempts.get(key) ?? { failures: 0, lockCount: 0, lockedUntil: 0, lastAttemptAt: 0 };
    const failures = current.failures + 1; const lockCount = failures >= 5 ? current.lockCount + 1 : current.lockCount;
    const lockedUntil = failures >= 5 ? this.now() + Math.min(30, 5 * 2 ** Math.max(0, lockCount - 1)) * 60_000 : 0;
    this.attempts.set(key, { failures: failures >= 5 ? 0 : failures, lockCount, lockedUntil, lastAttemptAt: this.now() });
    return this.inspect(key);
  }
  success(key: string) { this.attempts.delete(key); }
}
