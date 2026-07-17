const target = process.argv[2];
const allowedStatuses = new Set([301, 302, 307, 308]);
const outcomes = [];

function add(name, status, detail) { outcomes.push({ name, status, detail }); }
function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url;
  } catch { return null; }
}

if (!target) {
  console.log("WARNING EXTERNAL_SECURITY_CHECK_SKIPPED · URL을 제공하지 않아 외부 요청 0회");
  process.exit(0);
}
const base = safeUrl(target);
if (!base) {
  console.error("실행 불가 · 본인이 소유한 https URL을 입력하세요.");
  process.exit(2);
}

async function request(path, method = "HEAD") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try { return await fetch(new URL(path, base), { method, redirect: "manual", signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

try {
  const httpUrl = new URL(base); httpUrl.protocol = "http:";
  const http = await fetch(httpUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5_000) });
  add("HTTP→HTTPS", allowedStatuses.has(http.status) && /^https:/i.test(http.headers.get("location") ?? "") ? "정상" : "위험", `HTTP ${http.status}`);
} catch { add("HTTP→HTTPS", "실행 불가", "연결 실패"); }

const home = await request("/");
add("HTTPS", home.ok ? "정상" : "확인 필요", `HTTP ${home.status}`);
for (const [header, label] of [["content-security-policy", "CSP"], ["strict-transport-security", "HSTS"], ["x-content-type-options", "nosniff"], ["referrer-policy", "Referrer-Policy"], ["permissions-policy", "Permissions-Policy"]]) {
  add(label, home.headers.has(header) ? "정상" : "위험", home.headers.has(header) ? "설정됨" : "누락");
}
add("Frame 보호", home.headers.has("x-frame-options") || (home.headers.get("content-security-policy") ?? "").includes("frame-ancestors") ? "정상" : "위험", "헤더 검사");

for (const path of ["/admin", "/chat", "/api/chat", "/.env", "/.env.local", "/swagger-ui/index.html", "/actuator", "/dev/security"]) {
  const response = await request(path, "GET");
  const safe = response.status === 401 || response.status === 403 || response.status === 404 || allowedStatuses.has(response.status);
  add(path, safe ? "정상" : response.status >= 500 ? "위험" : "확인 필요", `HTTP ${response.status}`);
}
const login = await request("/login", "GET");
add("로그인 noindex", (login.headers.get("x-robots-tag") ?? "").includes("noindex") ? "정상" : "위험", "X-Robots-Tag 검사");

const setCookie = login.headers.get("set-cookie");
if (setCookie) {
  const attributes = setCookie.toLowerCase();
  add("세션 쿠키", attributes.includes("httponly") && attributes.includes("secure") && attributes.includes("samesite") && attributes.includes("path=") && (attributes.includes("max-age=") || attributes.includes("expires=")) && !attributes.includes("domain=") ? "정상" : "위험", "값을 제외한 속성만 검사");
} else add("세션 쿠키", "실행 불가", "로그인 없는 읽기 요청에는 Set-Cookie 없음");

for (const item of outcomes) console.log(`${item.status} · ${item.name} · ${item.detail}`);
process.exit(outcomes.some(({ status }) => status === "위험") ? 1 : 0);
