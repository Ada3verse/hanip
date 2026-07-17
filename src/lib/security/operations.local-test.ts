import { MemoryStudentCredentialStore } from "./authService";
import { StudentAuthService } from "./authService";
import { LoginAttemptLimiter } from "./rateLimit";
import { createStudentAccount, resetStudentPin } from "./accountAdministration";
import { MemoryStudentSessionStore, issueStudentSession, verifyStudentSession } from "./session";
import { runRetentionWorker, type RetentionCandidate } from "./retentionWorker";
import { calculateRetentionDeadline, privacyRetentionPolicy } from "./privacyPolicy";

export async function runSecurityOperationsLocalTests() {
  let passed = 0; const check = (value: unknown, label: string) => { if (!value) throw new Error(`Security operations test failed: ${label}`); passed += 1; };
  const credentials = new MemoryStudentCredentialStore(); const sessions = new MemoryStudentSessionStore(); const audit: string[] = []; const pepper = "test-pepper";
  const created = await createStudentAccount({ nickname: "가상학생01", pin: "1234", pepper, credentials, audit: (event) => { audit.push(event.type); }, now: new Date("2026-07-02T00:00:00+09:00") });
  check(created.retentionDeadline === "2026-12-31T14:59:59.000Z", "retention deadline Asia/Seoul");
  try { await createStudentAccount({ nickname: "가상학생01", pin: "9999", pepper, credentials, audit: () => undefined }); check(false, "duplicate rejected"); } catch { check(true, "duplicate rejected"); }
  const record = await credentials.findByNicknameHash((await import("./pin")).nicknameLookupHash("가상학생01", pepper)); check(record?.pinHash.includes("1234") === false, "PIN plaintext absent");
  const cookie = await issueStudentSession(created.uid, "student", 1, "session-secret", sessions); const reset = await resetStudentPin({ nickname: "가상학생01", pin: "5678", pepper, credentials, sessions, audit: (event) => { audit.push(event.type); } }); check(reset.oneTimePin === "5678" && !(await verifyStudentSession(cookie, "session-secret", sessions)), "PIN reset revokes session");
  const history={uid:created.uid,conversations:[{id:"conversation-1",messages:["학생 질문","한잎 AI 답변"]}],learningState:{concept:"품사",understanding:2,misconceptions:["형태 기준"]},statistics:{questions:1}};const before=structuredClone(history);const preLockSession=await issueStudentSession(created.uid,"student",2,"session-secret",sessions);const auth=new StudentAuthService({credentials,sessions,pepper,sessionSecret:"session-secret",limiter:new LoginAttemptLimiter()});for(let index=0;index<5;index+=1)await auth.login({nickname:"가상학생01",pin:"9999",ipHash:`pin-${index}`,requiredConsent:true});const lockedRecord=await credentials.findByNicknameHash((await import("./pin")).nicknameLookupHash("가상학생01",pepper));check(lockedRecord?.status==="locked"&&lockedRecord.failedLoginCount===5,"E2E five failures lock account");check(!(await verifyStudentSession(preLockSession,"session-secret",sessions,2)),"E2E lock revokes session");await resetStudentPin({nickname:"가상학생01",pin:"0000",pepper,credentials,sessions,audit:(event)=>{audit.push(event.type);}});const resetRecord=await credentials.findByNicknameHash((await import("./pin")).nicknameLookupHash("가상학생01",pepper));check(resetRecord?.uid===before.uid&&resetRecord.status==="active"&&resetRecord.failedLoginCount===0,"E2E reset preserves uid and clears lock");check(JSON.stringify(history)===JSON.stringify(before),"E2E reset preserves conversations and learning state");const relogin=await auth.login({nickname:"가상학생01",pin:"0000",ipHash:"after-reset",requiredConsent:true});check(relogin.ok,"E2E login with reset PIN");
  const values: RetentionCandidate[] = [{ uid: "expired", retentionDeadline: "2025-12-31T14:59:59.000Z", deletionStatus: "active" }, { uid: "future", retentionDeadline: "2027-12-31T14:59:59.000Z", deletionStatus: "active" }]; const deleted: string[] = [];
  const gateway = { listExpired: async () => values, deleteUser: async (uid: string) => { deleted.push(uid); }, markDeleted: async () => undefined, audit: async () => undefined };
  const dry = await runRetentionWorker({ gateway, now: new Date("2026-01-01T00:00:00Z") }); check(dry.dryRun && deleted.length === 0 && dry.candidateCount === 1, "dry run never deletes");
  const actual = await runRetentionWorker({ gateway, now: new Date("2026-01-01T00:00:00Z"), confirm: true }); check(actual.deletedCount === 1 && deleted[0] === "expired", "confirmed expiry delete");
  check(privacyRetentionPolicy.reviewed && privacyRetentionPolicy.termsVersion === "2026-07-01-v1" && audit.includes("student_created") && audit.includes("pin_reset"), "policy and audit");
  check(calculateRetentionDeadline(new Date("2026-01-01T00:00:00Z")) === "2026-12-31T14:59:59.000Z", "annual deadline"); return passed;
}
