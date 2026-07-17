import type { Metadata } from "next";
import { requireStudentPageSession } from "@/lib/security/studentAccess";
export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };
export default async function ChatLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireStudentPageSession("/chat"); return children; }
