"use client";

import { useState } from "react";
import { createLiveFirebaseHealthProbes, runFirebaseHealthCheck, type FirebaseHealthResult } from "@/lib/firebase/health";

export default function FirebaseClient() {
  const [result, setResult] = useState<FirebaseHealthResult | null>(null); const [loading, setLoading] = useState(false);
  async function run() { setLoading(true); try { setResult(await runFirebaseHealthCheck(createLiveFirebaseHealthProbes())); } finally { setLoading(false); } }
  const items = result ? [["Initialize", result.firebaseInitialized], ["Anonymous Auth", result.auth], ["Firestore", result.firestore], ["Repository", result.repository], ["Runtime", result.runtime]] as const : [];
  return <main className="min-h-screen bg-zinc-100 px-4 py-10 text-black"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold text-zinc-500">Development only</p><h1 className="mt-2 text-3xl font-bold">Firebase Health</h1><p className="mt-3 text-sm text-zinc-600">페이지 진입만으로 Firebase를 호출하지 않습니다. 아래 버튼을 누르면 실제 프로젝트에 읽기·쓰기 검사를 수행합니다.</p>
    <button type="button" onClick={() => void run()} disabled={loading} className="mt-6 rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:bg-zinc-400">{loading ? "검사 중…" : "실제 Firebase 검사"}</button>
    {result && <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{result.status}</h2><span>{result.elapsed}ms</span></div><dl className="mt-5 grid gap-3">{items.map(([name, item]) => <div key={name} className="flex justify-between border-t border-zinc-100 pt-3"><dt>{name}</dt><dd className="font-semibold">{item.status} · {item.elapsed}ms</dd></div>)}</dl><p className="mt-5 text-sm">Provider: {result.provider} · Config: {result.firebaseConfigured ? "configured" : "missing"} · Ready: {String(result.ready)}</p>{result.warning.length > 0 && <p className="mt-2 text-sm text-amber-700">{result.warning.join(", ")}</p>}</section>}
  </div></main>;
}
