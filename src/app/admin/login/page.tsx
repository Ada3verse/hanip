"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminId, password }) });
      if (!response.ok) throw new Error("login_failed");
      router.replace("/admin"); router.refresh();
    } catch { setError("관리자 인증에 실패했습니다."); } finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-white px-5 text-black"><form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-200 p-6"><div><p className="text-sm text-gray-500">학생 계정과 분리된 운영자 영역</p><h1 className="mt-1 text-2xl font-semibold">한잎 관리자 로그인</h1></div><label className="block text-sm font-medium">관리자 ID<input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="username" value={adminId} onChange={(event)=>setAdminId(event.target.value)} required /></label><label className="block text-sm font-medium">비밀번호<input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" type="password" autoComplete="current-password" minLength={8} value={password} onChange={(event)=>setPassword(event.target.value)} required /></label><p className="text-xs text-gray-500">비밀번호는 최소 8자이며 12자 이상을 권장합니다.</p>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button className="min-h-11 w-full rounded-lg bg-black px-4 py-2 text-white disabled:bg-gray-400" disabled={loading}>{loading?"확인 중…":"로그인"}</button></form></main>;
}
