import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { loadRuntimeEnvironment } from "./load-runtime-env.mjs";

loadRuntimeEnvironment();

const checksOnly = process.argv.includes("--checks-only");
const issues = [];
const warnings = [];
const pass = [];
const issue = (code, detail, severity = "high") => issues.push({ code, detail, severity });
const check = (condition, code, detail) => condition ? pass.push(code) : issue(code, detail);
const read = (path) => readFileSync(path, "utf8");

const robots = read("src/app/robots.ts");
const sitemap = read("src/app/sitemap.ts");
const proxy = read("src/proxy.ts");
const http = read("src/lib/security/http.ts");
const nextConfig = read("next.config.ts");
const loginRoute = read("src/app/api/auth/login/route.ts");
const studentAuthService = read("src/lib/security/authService.ts");
const studentLoginPage = read("src/app/login/page.tsx");
const adminLoginRoute = read("src/app/api/admin/login/route.ts");
const adminApiRoute = read("src/app/api/admin/[...path]/route.ts");
const adminAuth = read("src/lib/admin/adminAuth.ts");
const adminConversationView = read("src/app/admin/conversations/[conversationId]/ConversationReviewClient.tsx");
const firestoreRules = read("firestore.rules");
const privacyPolicy = read("src/lib/security/privacyPolicy.ts");
const uiComponents = read("src/components/ui/index.tsx");
const homeClient = read("src/app/HomeClient.tsx");
const chatPage = read("src/app/chat/page.tsx");

check(nextConfig.includes("noindex, nofollow") && ["/login", "/chat/:path*", "/account/:path*", "/dev/:path*"].every((path) => nextConfig.includes(path)), "AUTH_PAGE_INDEXABLE", "비공개 페이지 noindex 누락");
check(["/login", "/chat", "/progress", "/settings", "/account", "/admin", "/dev", "/api"].every((path) => robots.includes(`\"${path}`)), "ROBOTS_SENSITIVE_ROUTE_EXPOSED", "robots 민감 경로 누락");
check(!sitemap.includes("/chat") && !sitemap.includes("/progress"), "PRIVATE_PAGE_INDEXABLE", "비공개 페이지가 sitemap에 포함됨");
check(!http.includes('Access-Control-Allow-Origin\", \"*') && !http.includes("includes(\"*\")"), "CORS_WILDCARD_WITH_CREDENTIALS", "wildcard CORS 감지");
check(http.includes("HANIP_ALLOWED_ORIGINS") && proxy.includes("evaluateRequestOrigin") && proxy.includes("status: 403"), "UNTRUSTED_ORIGIN_ALLOWED", "Origin allowlist 또는 거부 처리 누락");
for (const path of ["/.env", "/.env.local", "/.git/config", "/swagger-ui", "/actuator", "/debug", "/server-status", "/phpinfo.php"]) check(proxy.includes(`\"${path}\"`), path.startsWith("/.env") ? "ENV_FILE_PUBLICLY_ACCESSIBLE" : "DEV_DOCUMENTATION_EXPOSED", `${path} 차단 누락`);
check(nextConfig.includes("Content-Security-Policy") && nextConfig.includes("Strict-Transport-Security"), "INTERNAL_ERROR_DISCLOSED", "기본 보안 헤더 누락");
check(!read("src/app/error.tsx").includes("error.stack") && !read("src/app/global-error.tsx").includes("error.stack"), "STACK_TRACE_DISCLOSED", "오류 화면 stack 노출");
check(!read("src/app/error.tsx").includes("error.message"), "FILE_PATH_DISCLOSED", "오류 화면 상세 메시지 노출");
check(loginRoute.includes("httpOnly: true") && loginRoute.includes("sameSite: \"lax\"") && loginRoute.includes("secure: process.env.NODE_ENV === \"production\"") && loginRoute.includes("maxAge:"), "INSECURE_COOKIE_ATTRIBUTE", "세션 쿠키 속성 누락");
check(proxy.includes('pathname === "/"') && proxy.includes("/account") && proxy.includes("/chat") && proxy.includes("validSignature"), "UNAUTHENTICATED_PRIVATE_API", "홈 또는 보호 경로 인증 누락");
check(read("src/app/page.tsx").includes('requireStudentPageSession("/")') && ["chat", "progress", "settings", "account"].every((path) => read(`src/app/${path}/layout.tsx`).includes("requireStudentPageSession")), "STUDENT_ROUTE_SERVER_AUTH_MISSING", "학생 전용 화면의 서버 세션 재검증 누락");
check(read("src/app/login/layout.tsx").includes("getAuthenticatedStudentSession") && studentLoginPage.includes("getSafeReturnPath"), "STUDENT_LOGIN_RETURN_FLOW_MISSING", "로그인 사용자 우회 또는 안전한 복귀 경로 누락");
check(read("src/app/api/chat/route.ts").includes('authenticatedSession.role !== "student"'), "CHAT_STUDENT_SESSION_NOT_ENFORCED", "채팅 API 학생 role 재검증 누락");
check(uiComponents.includes("min-h-12") && read("src/app/globals.css").includes("prefers-reduced-motion") && read("src/app/globals.css").includes("font-size: 16px"), "CLASSROOM_UI_ACCESSIBILITY_MISSING", "터치 크기·모션 감소·모바일 입력 접근성 누락");
check(studentLoginPage.includes('inputMode="numeric"') && studentLoginPage.includes("remainingAttempts") && studentLoginPage.includes('role="dialog"'), "STUDENT_LOGIN_UX_INCOMPLETE", "PIN 키패드·남은 횟수·잠금 dialog 누락");
check(homeClient.includes("EXAMPLE_QUESTIONS") && homeClient.includes("maxLength={500}") && homeClient.includes("Shift+Enter"), "STUDENT_HOME_GUIDANCE_MISSING", "예시 질문·글자 수·키보드 안내 누락");
check(chatPage.includes('aria-label="대화 내용"') && chatPage.includes("다시 시도") && chatPage.includes("safe-area-inset-bottom"), "CHAT_CLASSROOM_UX_INCOMPLETE", "대화 접근성·재시도·모바일 입력창 보호 누락");
check(read("src/app/admin/page.tsx").includes("AdminShell") && read("src/app/admin/login/page.tsx").includes("관리자 로그인"), "ADMIN_PAGE_MISSING", "관리자 페이지 누락");
check(proxy.includes("hanip_admin_session") && proxy.includes("HANIP_ADMIN_SESSION_SECRET") && proxy.includes("/admin/login"), "ADMIN_API_UNPROTECTED", "관리자 경로의 별도 인증 경계 누락");
check(proxy.includes("hanip_admin_session") && proxy.includes("HANIP_SESSION_SECRET") && proxy.includes("HANIP_ADMIN_SESSION_SECRET"), "ADMIN_SESSION_SHARED_WITH_STUDENT", "학생·관리자 세션 분리 누락");
check(/sameSite:\s*"strict"/.test(adminLoginRoute) && /httpOnly:\s*true/.test(adminLoginRoute) && adminLoginRoute.includes("ADMIN_SESSION_MS"), "ADMIN_COOKIE_INSECURE", "관리자 쿠키 보호 속성 누락");
const adminService = read("src/lib/admin/adminService.ts");
check(adminAuth.includes("isAcceptableAdministratorPassword") && adminAuth.includes("30 * 60_000") && adminAuth.includes("scrypt-admin-v1"), "ADMIN_AUTH_WEAK", "관리자 비밀번호 정책·세션 만료·비밀번호 해시 구조 누락");
check(adminService.includes("MAX_FAILURES=5") && adminService.includes("administratorLocked") && adminService.indexOf("if(administratorLocked)") < adminService.indexOf("await verifyAdministratorPassword"), "ADMIN_LOCKOUT_WEAK", "관리자 5회 실패 잠금 또는 잠금 상태 해시 비교 차단 누락");
check(adminApiRoute.includes("conversation_content_view") && adminApiRoute.includes("원문 조회 사유"), "ADMIN_CONVERSATION_VIEW_NOT_AUDITED", "대화 원문 조회 감사 누락");
check(adminApiRoute.includes("pin_reset") && adminApiRoute.includes("sessions.docs.forEach") && adminApiRoute.includes('requireAdminReauthentication(value.administratorPassword,"RESET PIN","RESET PIN")'), "ADMIN_PIN_RESET_NOT_AUDITED", "PIN 초기화 재인증·감사 또는 세션 폐기 누락");
check(adminApiRoute.includes("confirmed_irreversible_delete") && adminApiRoute.includes("recursiveDelete"), "ADMIN_DELETE_NOT_AUDITED", "계정 삭제 감사 또는 연쇄 삭제 누락");
check(!adminApiRoute.includes("impersonat") && !proxy.includes("impersonat"), "ADMIN_IMPERSONATION_ENABLED", "관리자 가장하기 기능 감지");
check(adminApiRoute.includes("DELETE EXPIRED DATA") && adminApiRoute.includes("requireAdminReauthentication"), "RETENTION_DELETE_UNPROTECTED", "보유기간 삭제 재인증 누락");
check(adminApiRoute.includes("requireAdministrator") && firestoreRules.includes("allow read, create, update, delete: if false"), "CROSS_USER_ADMIN_DATA_EXPOSED", "교차 사용자 데이터 보호 누락");
check(studentAuthService.includes("failedLoginCount + 1") && studentAuthService.includes("Math.min(5") && studentAuthService.includes("PIN_ATTEMPTS_EXHAUSTED"), "PIN_ATTEMPT_LIMIT_NOT_ENFORCED", "학생 PIN 5회 제한 누락");
check(studentAuthService.indexOf('record.status === "locked"') < studentAuthService.indexOf("verifyPin(input.pin"), "LOCKED_ACCOUNT_PIN_RECHECKED", "잠긴 계정에서 PIN 해시 재검증 가능");
check(studentLoginPage.includes("로그인 제한") && studentLoginPage.includes("관리자에게 문의해 주세요"), "LOCKED_LOGIN_NOTICE_MISSING", "잠금 안내 Modal 누락");
check(studentLoginPage.includes("disabled={locked}") && (studentLoginPage.includes("disabled={loading||locked}") || (studentLoginPage.includes("const ready =") && studentLoginPage.includes("!locked") && studentLoginPage.includes("disabled={!ready}"))), "LOCKED_LOGIN_INPUT_STILL_ENABLED", "잠금 후 입력 또는 버튼 비활성화 누락");
check(adminApiRoute.includes('status:"active"') && adminApiRoute.includes("failedLoginCount:0") && adminApiRoute.includes("lockedUntil:null"), "PIN_RESET_DID_NOT_CLEAR_LOCK", "관리자 PIN 초기화 잠금 해제 누락");
check(adminApiRoute.includes("sessions.docs.forEach") && adminApiRoute.includes("revokedAt"), "PIN_RESET_DID_NOT_REVOKE_SESSIONS", "PIN 초기화 기존 세션 폐기 누락");
check(adminConversationView.includes('role==="assistant"') && adminConversationView.includes("한잎 AI") && adminApiRoute.includes('value.role==="assistant"'), "ADMIN_CONVERSATION_AI_RESPONSE_MISSING", "관리자 대화 상세 AI 응답 표시 누락");
check(adminApiRoute.includes("conversation_content_view") && adminApiRoute.includes("purpose.slice"), "CONVERSATION_VIEW_NOT_AUDITED", "대화 원문 열람 감사 누락");
check(!read("src/lib/admin/adminStore.ts").includes("content:") && !read("src/lib/admin/types.ts").includes("content:"), "CONVERSATION_CONTENT_WRITTEN_TO_AUDIT_LOG", "감사 로그에 대화 원문 필드 감지");
check(["adminSessions", "adminAuditLogs", "retentionAuditLogs"].every((name) => firestoreRules.includes(`match /${name}`)), "ADMIN_FIRESTORE_RULES_EXPOSED", "관리자 저장소의 클라이언트 차단 규칙 누락");
check(read("src/lib/security/environment.ts").includes("validateProductionSecrets") && read("src/lib/security/environment.ts").includes("reused"), "WEAK_PRODUCTION_SECRET_ALLOWED", "Production 비밀값 강도·재사용 검사 누락");

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const secretPatterns = [
  ["OPENAI_KEY", /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/],
  ["PRIVATE_KEY", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=]{20,}/],
  ["FIREBASE_ADMIN", /(?:private_key_id|client_email|service[_-]?account)\s*[=:]\s*["'][^"']{8,}/i],
  ["HIGH_ENTROPY_SECRET", /(?:session_secret|pin_pepper|service_role|database_password)\s*[=:]\s*["'][A-Za-z0-9_+\/-]{20,}["']/i],
];
const currentSecretHits = [];
for (const file of trackedFiles) {
  if (/\.(?:png|jpg|jpeg|gif|ico|pdf|lock)$/i.test(file)) continue;
  let content = ""; try { content = read(file); } catch { continue; }
  if (/\.local-test\./.test(file)) content = content.replaceAll("server@test-project.iam.gserviceaccount.com", "test@example.com").replaceAll("test-only-value", "fixture");
  for (const [type, pattern] of secretPatterns) if (!(type === "FIREBASE_ADMIN" && /\.local-test\./.test(file)) && pattern.test(content) && !content.includes("your_api_key_here")) currentSecretHits.push({ file, type });
}
for (const hit of currentSecretHits) issue("SECRET_FOUND_IN_CURRENT_FILES", `${hit.file} · ${hit.type}`);

let history = "";
try { history = execFileSync("git", ["log", "--all", "--format=commit:%H", "-p", "--", ".", ":(exclude)package-lock.json"], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }); } catch { warnings.push("Git 기록 읽기 실패"); }
let commit = "unknown"; let file = "unknown"; const historyHits = [];
for (const line of history.split("\n")) {
  if (line.startsWith("commit:")) commit = line.slice(7, 19);
  if (line.startsWith("+++ b/")) file = line.slice(6);
  if (!line.startsWith("+") || line.startsWith("+++") || line.includes("server@test-project.iam.gserviceaccount.com") || line.includes("test-only-value")) continue;
  for (const [type, pattern] of secretPatterns) if (pattern.test(line) && !line.includes("your_api_key_here")) historyHits.push({ commit, file, type });
}
for (const hit of [...new Map(historyHits.map((item) => [`${item.commit}:${item.file}:${item.type}`, item])).values()]) issue("SECRET_FOUND_IN_GIT_HISTORY", `${hit.commit} · ${hit.file} · ${hit.type}`);
check(!JSON.stringify([...currentSecretHits, ...historyHits]).match(/sk-(?:proj-)?/), "SECRET_UNMASKED_IN_REPORT", "보고서 비밀값 마스킹 실패");

const piiHits = [];
for (const file of trackedFiles.filter((path) => /(?:test|fixture|mock|seed|scenario)/i.test(path))) {
  let content = ""; try { content = read(file); } catch { continue; }
  const cleaned = content.replaceAll("010-1234-5678", "").replaceAll("010101-3123456", "").replace(/[A-Za-z0-9._%+-]+@example\.(?:com|org)/g, "");
  if (/01[016789]-?\d{3,4}-?\d{4}|\d{6}-[1-4]\d{6}/.test(cleaned)) piiHits.push(file);
}
for (const filePath of [...new Set(piiHits)]) issue("REAL_STUDENT_DATA_IN_FIXTURE", filePath);

if (!privacyPolicy.includes("reviewed: true")) issue("REQUIRED_PRIVACY_POLICY_UNCONFIRMED", "보유기간·시행일·문의처 운영자 확정 필요", "blocking");
warnings.push("EXTERNAL_SECURITY_CHECK_SKIPPED · 배포 URL 미제공 · 외부 요청 0회");
warnings.push("Firebase Emulator 미실행");
if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) warnings.push("Firebase Admin Credential 미검증");
warnings.push("Firestore Rules 실제 배포 여부는 Firebase Console에서 확인 필요");
warnings.push("실제 학생 계정 생성 여부는 운영자가 확인 필요");

function run(name, command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: { ...process.env, HANIP_USE_MOCK_AI: "true", HANIP_ENABLE_LIVE_AI_TESTS: "false" } });
  if (result.status !== 0) issue(`${name.toUpperCase()}_FAILED`, `${name} exit ${result.status}`, "blocking"); else pass.push(name);
}
if (!checksOnly) {
  run("lint", "npm", ["run", "lint"]);
  run("build", "npm", ["run", "build"]);
}

const blocking = issues.filter(({ severity }) => severity === "blocking" || severity === "high");
const status = blocking.length ? "BLOCKED" : warnings.length || issues.length ? "WARNING" : "PASS";
console.log(`SECURITY DEPLOYMENT GATE · ${status}`);
console.log(`checks ${pass.length} · issues ${issues.length} · warnings ${warnings.length}`);
for (const item of issues) console.log(`${item.severity.toUpperCase()} · ${item.code} · ${item.detail}`);
for (const warning of warnings) console.log(`WARNING · ${warning}`);
console.log("network · OpenAI 0 · Firebase 0 · external HTTP 0");
process.exit(status === "BLOCKED" ? 1 : 0);
