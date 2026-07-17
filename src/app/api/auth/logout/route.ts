import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDENT_SESSION_COOKIE } from "@/lib/security/session";
import { getSecurityContext } from "@/lib/security/serverContext";
import { isSameOriginRequest } from "@/lib/security/http";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ authenticated: false }, { status: 403 });
  const cookieStore = await cookies(); const response = NextResponse.json({ authenticated: false });
  const sessionId = cookieStore.get(STUDENT_SESSION_COOKIE)?.value.split(".")[0]; if (sessionId) await getSecurityContext().sessions.revoke(sessionId);
  response.cookies.set(STUDENT_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
