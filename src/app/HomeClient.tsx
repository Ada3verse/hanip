"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { PageContainer, PrimaryButton, SectionHeader, StatusBadge } from "@/components/ui";
import { loadChatSession } from "@/lib/chat/sessionStorage";
import { getAuthSession } from "@/lib/auth/authSession";
import { applyUserSettings, loadUserSettings } from "@/lib/settings/settingsEngine";
import type { LearningGoal, LearningMode } from "@/lib/types/chat";

const MODE_OPTIONS: Array<{ value: LearningMode; label: string; description: string }> = [
  { value: "learn", label: "처음부터 배우기", description: "개념을 차근차근 설명받아요." },
  { value: "review", label: "짧게 복습하기", description: "알고 있는 내용을 빠르게 확인해요." },
  { value: "practice", label: "문제로 연습하기", description: "문제를 풀며 부족한 부분을 찾아요." },
];
const GOAL_OPTIONS: Array<{ value: LearningGoal; label: string; description: string }> = [
  { value: "concept", label: "개념 이해", description: "원리와 기준을 알아봐요." },
  { value: "exam", label: "시험 대비", description: "헷갈리는 함정을 확인해요." },
  { value: "practice", label: "문제 풀이", description: "새 문장에 직접 적용해요." },
  { value: "review", label: "오답 정리", description: "틀린 이유를 다시 살펴봐요." },
];
const EXAMPLE_QUESTIONS = ["명사와 대명사는 어떻게 달라요?", "조사는 왜 필요한가요?", "이 문장에서 품사를 찾아 줘."];

export default function HomeClient() {
  const [input, setInput] = useState("");
  const [learningMode, setLearningMode] = useState<LearningMode>("learn");
  const [learningGoal, setLearningGoal] = useState<LearningGoal>("concept");
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [displayName, setDisplayName] = useState("학생");
  const isComposingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      const auth = await getAuthSession().initialize();
      applyUserSettings(loadUserSettings());
      if (!cancelled) { setHasStoredSession(Boolean(loadChatSession())); setDisplayName(auth.user?.displayName || "학생"); }
    });
    return () => { cancelled = true; };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || isComposingRef.current) return;
    router.push(`/chat?q=${encodeURIComponent(question)}&mode=${learningMode}&goal=${learningGoal}&startType=new`);
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !isComposingRef.current) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <AppHeader subtitle="오늘의 국어 문법 학습" />
      <PageContainer className="py-7 sm:py-10">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><StatusBadge tone="success">학습 준비 완료</StatusBadge><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">안녕하세요, {displayName}님.</h1><p className="mt-2 text-base text-stone-600 sm:text-lg">오늘은 어떤 방식으로 문법을 공부할까요?</p></div>
          {hasStoredSession && <article className="surface-card w-full p-4 lg:max-w-sm"><p className="text-xs font-bold text-emerald-800">지난 학습</p><h2 className="mt-1 font-bold">이전 대화를 이어서 볼 수 있어요.</h2><p className="mt-1 text-sm text-stone-600">저장된 질문과 학습 상태에서 계속합니다.</p><div className="mt-3 flex gap-2"><Link href="/chat?startType=resume_session" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-bold text-white">지난 학습 이어하기</Link><button type="button" onClick={() => setHasStoredSession(false)} className="min-h-12 rounded-xl border border-stone-300 px-4 text-sm font-bold">새 학습</button></div></article>}
        </section>

        <form onSubmit={submit} className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="surface-card p-5"><SectionHeader title="1. 학습 방식" description="지금 필요한 공부 방법을 하나 골라요."/><div className="mt-4 grid gap-3 sm:grid-cols-3">{MODE_OPTIONS.map((option) => { const selected = learningMode === option.value; return <label key={option.value} className={`relative cursor-pointer rounded-xl border p-4 transition hover:border-emerald-700 ${selected ? "border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800" : "border-stone-200 bg-white"}`}><input type="radio" name="learningMode" value={option.value} checked={selected} onChange={() => setLearningMode(option.value)} className="sr-only"/><span className="flex items-center justify-between gap-2 font-bold">{option.label}<span aria-hidden="true">{selected ? "✓" : "○"}</span></span><span className="mt-2 block text-sm leading-5 text-stone-600">{option.description}</span></label>; })}</div></section>
            <section className="surface-card p-5"><SectionHeader title="2. 학습 목표" description="오늘 집중하고 싶은 목표를 선택해요."/><div className="mt-4 grid grid-cols-2 gap-3">{GOAL_OPTIONS.map((option) => { const selected = learningGoal === option.value; return <label key={option.value} className={`cursor-pointer rounded-xl border p-3.5 transition hover:border-emerald-700 ${selected ? "border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800" : "border-stone-200"}`}><input type="radio" name="learningGoal" value={option.value} checked={selected} onChange={() => setLearningGoal(option.value)} className="sr-only"/><span className="flex items-center justify-between text-sm font-bold">{option.label}<span aria-hidden="true">{selected ? "✓" : "○"}</span></span><span className="mt-1 block text-xs leading-5 text-stone-600">{option.description}</span></label>; })}</div></section>
          </div>
          <section className="surface-card flex flex-col p-5"><SectionHeader title="3. 질문하기" description="궁금한 내용을 편하게 적어 보세요."/><div className="mt-4 flex flex-wrap gap-2" aria-label="예시 질문">{EXAMPLE_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => setInput(question)} className="min-h-11 rounded-full border border-stone-300 bg-stone-50 px-3 text-left text-xs font-medium hover:border-emerald-700 hover:bg-emerald-50 sm:text-sm">{question}</button>)}</div><label htmlFor="question" className="sr-only">국어 문법 질문</label><textarea id="question" name="question" rows={4} maxLength={500} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={keyDown} onCompositionStart={() => { isComposingRef.current = true; }} onCompositionEnd={(event) => { isComposingRef.current = false; setInput(event.currentTarget.value); }} placeholder="예: ‘예쁜 꽃’에서 ‘예쁜’은 왜 형용사예요?" className="mt-4 min-h-36 w-full resize-y rounded-xl border border-stone-300 bg-stone-50 p-4 leading-7 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"/><div className="mt-2 flex items-center justify-between text-xs text-stone-500"><span>Enter로 질문 · Shift+Enter로 줄바꿈</span><span aria-live="polite">{input.length}/500</span></div><PrimaryButton type="submit" disabled={!input.trim()} className="mt-4 w-full">한잎에게 질문하기</PrimaryButton><div className="mt-auto pt-5 text-center text-sm"><Link href="/progress" className="font-semibold text-emerald-900 underline underline-offset-4">내 학습 기록 먼저 보기</Link></div></section>
        </form>
      </PageContainer>
    </main>
  );
}
