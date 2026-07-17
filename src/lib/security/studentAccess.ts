import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSecurityContext } from "./serverContext";
import { STUDENT_SESSION_COOKIE, verifyStudentSession } from "./session";

function safeReturnPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function getAuthenticatedStudentSession() {
  const value = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value ?? "";
  if (!value) return null;
  try {
    const session = await verifyStudentSession(
      value,
      process.env.HANIP_SESSION_SECRET ?? "",
      getSecurityContext().sessions,
    );
    return session?.role === "student" ? session : null;
  } catch {
    return null;
  }
}

export async function requireStudentPageSession(returnPath: string) {
  const session = await getAuthenticatedStudentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(safeReturnPath(returnPath))}`);
  }
  return session;
}
