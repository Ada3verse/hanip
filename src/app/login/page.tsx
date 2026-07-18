"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { InlineNotice, PrimaryButton } from "@/components/ui";

type LoginError = { message?: string; code?: string; remainingAttempts?: number };
const CONTACT = "동신중학교 정보교육 담당(정경원)";
function getSafeReturnPath() {
  const value = new URLSearchParams(window.location.search).get("next") ?? "/";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/admin") && !value.startsWith("/api") ? value : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialogReturnTarget = useRef<HTMLFormElement>(null);
  const dialogWasOpen = useRef(false);
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const ready = nickname.trim().length >= 2 && pin.length === 4 && !loading && !locked;

  useEffect(() => {
    if (!modalMessage) { if (dialogWasOpen.current) { dialogWasOpen.current = false; queueMicrotask(() => dialogReturnTarget.current?.focus()); } return; }
    dialogWasOpen.current = true; closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setModalMessage(""); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [modalMessage]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname, pin, termsAccepted: data.get("terms") === "on", privacyAccepted: data.get("privacy") === "on", optionalAnalytics: data.get("analytics") === "on" }) });
      if (response.ok) { router.replace(getSafeReturnPath()); router.refresh(); return; }
      const value = await response.json() as LoginError;
      if (value.code === "PIN_ATTEMPTS_EXHAUSTED" || value.code === "ACCOUNT_LOCKED") {
        setLocked(true); setModalMessage(value.message ?? "로그인이 잠겨 있습니다. 관리자에게 문의해 주세요."); setError("");
      } else {
        const remaining = typeof value.remainingAttempts === "number" ? value.remainingAttempts : null;
        setError(`닉네임 또는 PIN이 올바르지 않습니다.${remaining !== null ? ` 남은 입력 기회는 ${remaining}회입니다.` : ""}`);
      }
    } catch { setError("인터넷 연결이 불안정해요. 입력한 내용은 그대로 두었으니 다시 시도해 주세요."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-950 sm:grid sm:place-items-center sm:py-12">
      <section className="mx-auto w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-xl font-black text-emerald-900" aria-hidden="true">잎</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight">한잎</h1>
          <p className="mt-2 font-semibold text-emerald-900">AI와 함께 배우는 국어 문법</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">닉네임과 4자리 PIN으로 학습 기록을 이어갈 수 있어요.</p>
        </div>

        <form onSubmit={submit} className="surface-card mt-7 space-y-5 p-5 sm:p-7" ref={dialogReturnTarget} tabIndex={-1}>
          <label htmlFor="nickname" className="block text-sm font-bold">닉네임
            <input id="nickname" name="nickname" required minLength={2} maxLength={20} autoComplete="username" value={nickname} onChange={(event) => setNickname(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100" disabled={locked}/>
          </label>
          <label htmlFor="pin" className="block text-sm font-bold">4자리 PIN
            <input id="pin" name="pin" required pattern="[0-9]{4}" inputMode="numeric" type="password" autoComplete="current-password" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} className="mt-2 min-h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-center font-mono text-2xl tracking-[0.65em] focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100" disabled={locked} aria-describedby="pin-help"/>
            <span id="pin-help" className="mt-2 block text-xs font-normal text-stone-500">숫자 네 자리만 입력해요. 입력한 PIN은 화면에 보이지 않아요.</span>
          </label>
          <div className="rounded-xl bg-stone-50 p-3 text-xs leading-5 text-stone-600">운영자가 발급한 닉네임과 PIN을 사용해요. 같은 닉네임으로 새 계정이 중복 생성되지 않습니다.</div>
          <label className="flex gap-3 text-sm leading-6"><input name="terms" required type="checkbox" disabled={locked} className="mt-1 size-5 shrink-0 accent-emerald-800"/><span>(필수) <Link className="font-semibold underline underline-offset-2" href="/terms">이용약관</Link>에 동의합니다.</span></label>
          <label className="flex gap-3 text-sm leading-6"><input name="privacy" required type="checkbox" disabled={locked} className="mt-1 size-5 shrink-0 accent-emerald-800"/><span>(필수) <Link className="font-semibold underline underline-offset-2" href="/privacy/summary">개인정보 처리 안내</Link>를 확인했습니다.</span></label>
          <label className="flex gap-3 text-sm leading-6"><input name="analytics" type="checkbox" disabled={locked} className="mt-1 size-5 shrink-0 accent-emerald-800"/><span>(선택) 서비스 개선을 위한 추가 분석에 동의합니다.</span></label>
          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          {locked && <InlineNotice tone="error">로그인이 잠겨 있습니다. 관리자에게 문의해 주세요.</InlineNotice>}
          <PrimaryButton type="submit" disabled={!ready} className="w-full">{loading ? "안전하게 확인하고 있어요…" : "학습 시작하기"}</PrimaryButton>
        </form>
        <div className="mt-5 text-center text-xs leading-5 text-stone-600">
          <p className="font-semibold text-stone-800">실명, 학번, 전화번호는 입력하지 마세요.</p>
          <p className="mt-2"><Link href="/privacy" className="underline">개인정보 처리방침</Link><span aria-hidden="true"> · </span><Link href="/terms" className="underline">이용약관</Link></p>
          <p className="mt-2">문의: {CONTACT}</p>
        </div>
      </section>
      {modalMessage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalMessage(""); }}><section role="dialog" aria-modal="true" aria-labelledby="login-limit-title" aria-describedby="login-limit-description" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><h2 id="login-limit-title" className="text-xl font-bold">로그인 제한</h2><p id="login-limit-description" className="mt-3 text-sm leading-6">{modalMessage}</p><p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">문의: {CONTACT}</p><PrimaryButton ref={closeButton} onClick={() => setModalMessage("")} className="mt-5 w-full">확인</PrimaryButton></section></div>}
    </main>
  );
}
