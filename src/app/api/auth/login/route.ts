import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getStudentAuthService } from "@/lib/security/serverContext";
import { isValidNickname } from "@/lib/security/pin";
import { STUDENT_SESSION_COOKIE, SESSION_ABSOLUTE_MS } from "@/lib/security/session";
import { isSameOriginRequest } from "@/lib/security/http";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "요청을 처리할 수 없습니다." }, { status: 403 });
  let body: unknown; try { body = await request.json(); } catch { body = null; }
  const value = typeof body === "object" && body ? body as Record<string, unknown> : {};
  const nickname = typeof value.nickname === "string" ? value.nickname : ""; const pin = typeof value.pin === "string" ? value.pin : "";
  const requiredConsent = value.termsAccepted === true && value.privacyAccepted === true;
  if (!isValidNickname(nickname) || !/^\d{4}$/.test(pin)) return NextResponse.json({ message: "닉네임 또는 PIN을 확인해 주세요." }, { status: 401 });
  const ipValue = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(`${ipValue}:${process.env.HANIP_RATE_LIMIT_SECRET ?? ""}`).digest("hex");
  const deviceSummary = (request.headers.get("user-agent") ?? "unknown").replace(/[^\x20-\x7E]/g, "").slice(0, 160);
  const result = await getStudentAuthService().login({ nickname, pin, ipHash, requiredConsent, optionalAnalytics: value.optionalAnalytics === true, deviceSummary });
  if (!result.ok) return NextResponse.json({ message: result.message, code: result.code, remainingAttempts: result.remainingAttempts }, { status: result.locked ? 423 : 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(STUDENT_SESSION_COOKIE, result.cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.floor(SESSION_ABSOLUTE_MS / 1_000) });
  return response;
}
