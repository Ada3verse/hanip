import type { PrivacyRequestStatus, PrivacyRequestType } from "./types";
export interface PrivacyRequestRecord { id: string; uid: string; type: PrivacyRequestType; status: PrivacyRequestStatus; submittedAt: string; updatedAt: string; administratorReason: string | null; }
export class MemoryPrivacyRequestStore {
  private records: PrivacyRequestRecord[] = [];
  submit(uid: string, type: PrivacyRequestType) { const now = new Date().toISOString(); const record = { id: crypto.randomUUID(), uid, type, status: "submitted" as const, submittedAt: now, updatedAt: now, administratorReason: null }; this.records.push(record); return structuredClone(record); }
  list(uid: string) { return this.records.filter((item) => item.uid === uid).map((item) => structuredClone(item)); }
  update(id: string, status: PrivacyRequestStatus, administratorReason?: string) { const item = this.records.find((value) => value.id === id); if (!item) return null; if (status === "rejected" && !administratorReason?.trim()) throw new Error("rejection_reason_required"); item.status = status; item.administratorReason = administratorReason?.trim() ?? null; item.updatedAt = new Date().toISOString(); return structuredClone(item); }
}
