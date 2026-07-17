import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedStudentSession } from "@/lib/security/studentAccess";
export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };
export default async function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) { if (await getAuthenticatedStudentSession()) redirect("/"); return children; }
