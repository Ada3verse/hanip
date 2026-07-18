"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-lg font-bold tracking-tight">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-800">잎</span>
          <span>한잎</span>
        </Link>
        {subtitle && <p className="hidden text-sm font-medium text-stone-600 md:block">{subtitle}</p>}
        <nav aria-label="학생 메뉴" className="flex items-center gap-1 text-sm">
          <Link aria-current={pathname === "/progress" ? "page" : undefined} href="/progress" className="app-nav-link">학습 기록</Link>
          <Link aria-current={pathname === "/settings" ? "page" : undefined} href="/settings" className="app-nav-link">설정</Link>
          <Link aria-current={pathname.startsWith("/account") ? "page" : undefined} href="/account" className="app-nav-link">계정</Link>
          <button type="button" onClick={logout} className="app-nav-link hidden sm:inline-flex">로그아웃</button>
        </nav>
      </div>
    </header>
  );
}
