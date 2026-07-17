"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

type LoginError = { message?: string; code?: string; remainingAttempts?: number };
const CONTACT = "동신중학교 정보교육 담당(정경원)";
function getSafeReturnPath() {
  const value = new URLSearchParams(window.location.search).get("next") ?? "/";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/admin") && !value.startsWith("/api") ? value : "/";
}
export default function LoginPage() {
  const router = useRouter(); const closeButton = useRef<HTMLButtonElement>(null);
  const [nickname,setNickname]=useState(""); const [pin,setPin]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const [locked,setLocked]=useState(false); const [modalMessage,setModalMessage]=useState("");
  useEffect(()=>{if(!modalMessage)return;closeButton.current?.focus();const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setModalMessage("")};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape)},[modalMessage]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (loading || locked) return; setLoading(true); setError(""); const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname, pin, termsAccepted: data.get("terms") === "on", privacyAccepted: data.get("privacy") === "on", optionalAnalytics: data.get("analytics") === "on" }) });
      if (response.ok) { router.replace(getSafeReturnPath()); router.refresh(); return; }
      const value=await response.json() as LoginError;
      if(value.code==="PIN_ATTEMPTS_EXHAUSTED"||value.code==="ACCOUNT_LOCKED"){setLocked(true);setModalMessage(value.message??"로그인이 잠겨 있습니다. 관리자에게 문의해 주세요.");setError("");}
      else {const remaining=typeof value.remainingAttempts==="number"?value.remainingAttempts:null;setError(`닉네임 또는 PIN이 올바르지 않습니다.${remaining!==null?` 남은 입력 기회는 ${remaining}회입니다.`:""}`);}
    } catch { setError("로그인 요청을 처리하지 못했습니다."); } finally { setLoading(false); }
  }
  return <main className="min-h-screen bg-white px-5 py-10 text-black"><div className="mx-auto max-w-md"><h1 className="text-3xl font-bold">한잎 시작하기</h1><div className="mt-6 rounded-xl bg-zinc-100 p-4 text-sm leading-6"><p>한잎은 학습을 이어 가기 위해 닉네임, 인증·접속 기록, 질문과 답변, 학습 진행 상황을 매년 12월 31일까지 저장해요.</p><p className="mt-2 font-semibold">실명, 전화번호, 이메일, 학교명처럼 나를 알아볼 수 있는 정보는 대화창에 입력하지 마세요.</p></div><form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-semibold">닉네임<input name="nickname" required minLength={2} maxLength={20} autoComplete="username" value={nickname} onChange={(event)=>setNickname(event.target.value)} className="mt-2 w-full rounded-lg border p-3 disabled:bg-zinc-100" disabled={locked}/></label><label className="block text-sm font-semibold">4자리 PIN<input name="pin" required pattern="[0-9]{4}" inputMode="numeric" type="password" autoComplete="current-password" maxLength={4} value={pin} onChange={(event)=>setPin(event.target.value.replace(/\D/g,"").slice(0,4))} className="mt-2 w-full rounded-lg border p-3 disabled:bg-zinc-100" disabled={locked}/></label><label className="flex gap-3 text-sm"><input name="terms" required type="checkbox" disabled={locked}/><span>(필수) <Link className="underline" href="/terms">이용약관</Link>(2026-07-01-v1)에 동의합니다.</span></label><label className="flex gap-3 text-sm"><input name="privacy" required type="checkbox" disabled={locked}/><span>(필수) <Link className="underline" href="/privacy">개인정보 처리 안내</Link>(2026-07-01-v1)를 확인했습니다.</span></label><label className="flex gap-3 text-sm"><input name="analytics" type="checkbox" disabled={locked}/><span>(선택) 서비스 개선을 위한 추가 분석에 동의합니다.</span></label>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{locked&&<p role="status" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">로그인이 잠겨 있습니다. 관리자에게 문의해 주세요.</p>}<button disabled={loading||locked} className="w-full rounded-lg bg-black p-3 font-semibold text-white disabled:opacity-50">{loading?"확인 중…":"로그인"}</button></form><p className="mt-6 text-xs leading-5 text-zinc-600">계정과 PIN은 운영자가 발급합니다. PIN을 잊었다면 기존 번호를 조회할 수 없으며 운영자에게 초기화를 요청해야 합니다. 문의: {CONTACT}</p></div>{modalMessage&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setModalMessage("")}}><section role="dialog" aria-modal="true" aria-labelledby="login-limit-title" aria-describedby="login-limit-description" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h2 id="login-limit-title" className="text-xl font-semibold">로그인 제한</h2><p id="login-limit-description" className="mt-3 text-sm leading-6">{modalMessage}</p><p className="mt-2 text-sm text-zinc-600">문의: {CONTACT}</p><button ref={closeButton} onClick={()=>setModalMessage("")} className="mt-5 min-h-11 w-full rounded-lg bg-black px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">확인</button></section></div>}</main>;
}
