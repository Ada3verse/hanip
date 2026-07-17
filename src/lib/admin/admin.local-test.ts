import { hashAdministratorPassword, isAcceptableAdministratorPassword, issueAdminSession, verifyAdministratorPassword, verifyAdminSession } from "./adminAuth";
import { MemoryAdminSecurityStore } from "./adminStore";
import { getAdministratorLoginGuardState, loginAdministrator, resetAdministratorLoginGuard } from "./adminService";
import { requireAdminReauthentication } from "./adminRequest";

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
export async function runAdminLocalTests() {
  let checks = 0; const store = new MemoryAdminSecurityStore(); const pepper = "test-admin-pepper-with-sufficient-length"; const sessionSecret = "test-admin-session-secret-with-sufficient-length";
  const hash = await hashAdministratorPassword("correct-password", pepper);
  assert(await verifyAdministratorPassword("correct-password", hash, pepper), "admin password verification"); checks += 1;
  assert(!(await verifyAdministratorPassword("wrong-password", hash, pepper)), "admin wrong password rejection"); checks += 1;
  assert(!isAcceptableAdministratorPassword("password", "operator") && !isAcceptableAdministratorPassword("operator", "operator") && isAcceptableAdministratorPassword("correct-password", "operator"), "admin password policy"); checks += 1;
  const cookie = await issueAdminSession("operator", sessionSecret, store, 1_000);
  assert((await verifyAdminSession(cookie, sessionSecret, store, 1_001))?.adminId === "operator", "admin session verification"); checks += 1;
  assert(await verifyAdminSession(cookie, sessionSecret, store, 1_000 + 30 * 60_000) === null, "admin session expires after 30 minutes"); checks += 1;
  assert(await verifyAdminSession(cookie, "wrong-secret", store, 1_001) === null, "student/admin boundary signature"); checks += 1;
  const original = { id: process.env.HANIP_ADMIN_ID, hash: process.env.HANIP_ADMIN_PASSWORD_HASH, pepper: process.env.HANIP_ADMIN_PASSWORD_PEPPER, secret: process.env.HANIP_ADMIN_SESSION_SECRET };
  try {
    process.env.HANIP_ADMIN_ID = "operator"; process.env.HANIP_ADMIN_PASSWORD_HASH = hash; process.env.HANIP_ADMIN_PASSWORD_PEPPER = pepper; process.env.HANIP_ADMIN_SESSION_SECRET = sessionSecret;resetAdministratorLoginGuard();
    const success = await loginAdministrator({ adminId: "operator", password: "correct-password", ipHash: "ip-a", store });
    assert(success.ok, "administrator login success"); checks += 1;
    assert(await requireAdminReauthentication("correct-password", "DELETE STUDENT", "DELETE STUDENT") && !(await requireAdminReauthentication("wrong-password", "DELETE STUDENT", "DELETE STUDENT")), "sensitive action password reauthentication"); checks += 1;
    const failure = await loginAdministrator({ adminId: "operator", password: "wrong-password", ipHash: "ip-b", store });
    assert(!failure.ok, "administrator login failure"); checks += 1;
    resetAdministratorLoginGuard();
    const wrongId=await loginAdministrator({adminId:"unknown",password:"correct-password",ipHash:"wrong-id",store});resetAdministratorLoginGuard();const wrongPassword=await loginAdministrator({adminId:"operator",password:"wrong-password",ipHash:"wrong-password",store});assert(!wrongId.ok&&!wrongPassword.ok,"unknown id and wrong password share failure result");checks+=1;resetAdministratorLoginGuard();
    let locked = false;
    for (let index = 0; index < 5; index += 1) { const attempt = await loginAdministrator({ adminId: "operator", password: "wrong-password", ipHash: "ip-lock", store }); locked = !attempt.ok && attempt.locked; }
    assert(locked&&getAdministratorLoginGuardState().failedAttempts===5, "administrator brute-force lock"); checks += 1;
    process.env.HANIP_ADMIN_PASSWORD_HASH="invalid-after-lock";const blocked=await loginAdministrator({adminId:"operator",password:"correct-password",ipHash:"locked",store});assert(!blocked.ok&&blocked.locked&&getAdministratorLoginGuardState().failedAttempts===5,"locked administrator skips password verification");checks+=1;
    assert(store.auditEvents.some((event) => event.result === "success") && store.auditEvents.some((event) => event.result === "failure"), "admin audit trail"); checks += 1;
  } finally {
    resetAdministratorLoginGuard();for (const [key, value] of [["HANIP_ADMIN_ID",original.id],["HANIP_ADMIN_PASSWORD_HASH",original.hash],["HANIP_ADMIN_PASSWORD_PEPPER",original.pepper],["HANIP_ADMIN_SESSION_SECRET",original.secret]] as const) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
  return checks;
}
