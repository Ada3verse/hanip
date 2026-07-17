import type { Metadata } from "next";
import { requireStudentPageSession } from "@/lib/security/studentAccess";
export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };
export default async function ProgressLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireStudentPageSession("/progress"); return children; }
