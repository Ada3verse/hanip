import { NextResponse, type NextRequest } from "next/server";
import { STUDENT_SESSION_COOKIE } from "@/lib/security/constants";
import { corsResponseHeaders, evaluateRequestOrigin } from "@/lib/security/http";

const PRIVATE_ROBOTS_PATHS = ["/login", "/chat", "/progress", "/settings", "/account", "/admin", "/dev"];
const DANGEROUS_PATHS = new Set([
  "/.env", "/.env.local", "/.git", "/.git/config", "/swagger-ui", "/swagger-ui/index.html",
  "/swagger", "/api-docs", "/actuator", "/debug", "/server-status", "/phpinfo.php",
]);

async function validSignature(cookie: string, secret: string | undefined) {
  const [id, token, signature] = cookie.split(".");
  if (!id || !token || !signature || !secret) return false;
  const encoder = new TextEncoder(); const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${id}.${token}`)));
  const actual = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(signature.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
  return signed.length === actual.length && signed.every((value, index) => value === actual[index]);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  if (DANGEROUS_PATHS.has(pathname)) return new NextResponse(null, { status: 404 });
  if (pathname.startsWith("/api/")) {
    const origin = evaluateRequestOrigin(request);
    if (!origin.allowed) return NextResponse.json({ message: "요청을 처리할 수 없습니다." }, { status: 403 });
    if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: corsResponseHeaders(request) });
  }
  const isPrivate = PRIVATE_ROBOTS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const response = NextResponse.next();
  if (isPrivate) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  for (const [key, value] of corsResponseHeaders(request)) response.headers.set(key, value);

  const protectedPath = pathname === "/" || ["/chat", "/progress", "/settings", "/account"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const adminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (adminPath && pathname !== "/admin/login") {
    const adminCookie = request.cookies.get("hanip_admin_session")?.value;
    if (!adminCookie || !(await validSignature(adminCookie, process.env.HANIP_ADMIN_SESSION_SECRET))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }
  if (!protectedPath) return response;
  const cookie = request.cookies.get(STUDENT_SESSION_COOKIE)?.value;
  if (!cookie || !(await validSignature(cookie, process.env.HANIP_SESSION_SECRET))) {
    const login = new URL("/login", request.url); login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|hanip-icon.svg|manifest.webmanifest|sw.js).*)"] };
