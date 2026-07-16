"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application error", { digest: error.digest }); }, [error]);
  return <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black"><section role="alert" className="w-full max-w-md text-center"><h1 className="text-2xl font-bold">잠시 문제가 생겼어요.</h1><p className="mt-4 leading-7 text-zinc-600">학습 기록은 그대로 두고 화면을 다시 불러올 수 있어요.</p><div className="mt-7 flex justify-center gap-3"><button type="button" onClick={reset} className="min-h-11 rounded-lg bg-black px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">다시 시도</button><Link href="/" className="min-h-11 rounded-lg border border-black px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">홈으로</Link></div></section></main>;
}
