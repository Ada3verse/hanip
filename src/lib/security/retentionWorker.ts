export interface RetentionCandidate { uid: string; retentionDeadline: string; deletionStatus: string; }
export interface RetentionGateway { listExpired(now: string): Promise<RetentionCandidate[]>; deleteUser(uid: string): Promise<void>; markDeleted(uid: string, at: string): Promise<void>; audit(uid: string, success: boolean, reason: string): Promise<void>; }
export async function runRetentionWorker(input: { gateway: RetentionGateway; now?: Date; confirm?: boolean }) {
  const now = input.now ?? new Date(); const candidates = (await input.gateway.listExpired(now.toISOString())).filter((item) => item.deletionStatus !== "deleted" && Date.parse(item.retentionDeadline) <= now.getTime());
  if (!input.confirm) return { dryRun: true, candidateCount: candidates.length, deletedCount: 0, failedCount: 0 };
  let deletedCount = 0; let failedCount = 0;
  for (const item of candidates) { try { await input.gateway.deleteUser(item.uid); await input.gateway.markDeleted(item.uid, now.toISOString()); await input.gateway.audit(item.uid, true, "retention_expired"); deletedCount += 1; } catch { await input.gateway.audit(item.uid, false, "retention_delete_failed"); failedCount += 1; } }
  return { dryRun: false, candidateCount: candidates.length, deletedCount, failedCount };
}
