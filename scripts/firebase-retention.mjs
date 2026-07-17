import { getAdminFirestore } from "./firebase-admin-runtime.mjs";
const confirm = process.argv.includes("--confirm"); const firestore = getAdminFirestore(); const now = new Date(); const query = await firestore.collection("users").where("retentionDeadline", "<=", now.toISOString()).get(); const candidates = query.docs.filter((item) => item.data().deletionStatus !== "deleted");
console.log(`보유기간 만료 대상: ${candidates.length}건 · ${confirm ? "삭제 실행" : "Dry Run"}`);
if (!confirm) process.exit(0);
let deleted = 0; let failed = 0;
for (const item of candidates) { try { const deadline = Date.parse(String(item.data().retentionDeadline)); if (!Number.isFinite(deadline) || deadline > now.getTime()) throw new Error("invalid_deadline"); await firestore.recursiveDelete(item.ref); await firestore.collection("retentionAuditLogs").add({ uidHash: (await import("node:crypto")).createHash("sha256").update(item.id).digest("hex"), status: "completed", occurredAt: now.toISOString(), reasonCode: "retention_expired" }); deleted += 1; } catch { await firestore.collection("retentionAuditLogs").add({ status: "failed", occurredAt: now.toISOString(), reasonCode: "retention_delete_failed" }); failed += 1; } }
console.log(`삭제 완료: ${deleted}건 · 실패: ${failed}건`); if (failed) process.exitCode = 1;
