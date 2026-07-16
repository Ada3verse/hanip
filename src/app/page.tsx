"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadChatSession } from "@/lib/chat/sessionStorage";
import { getAuthSession } from "@/lib/auth/authSession";
import { applyUserSettings, loadUserSettings } from "@/lib/settings/settingsEngine";
import type { FormEvent, KeyboardEvent } from "react";
import type { LearningGoal, LearningMode } from "@/lib/types/chat";

const LEARNING_MODE_OPTIONS: Array<{
  value: LearningMode;
  label: string;
}> = [
  { value: "learn", label: "처음부터 배우기" },
  { value: "review", label: "짧게 복습하기" },
  { value: "practice", label: "문제로 연습하기" },
];

const LEARNING_GOAL_OPTIONS: Array<{
  value: LearningGoal;
  label: string;
}> = [
  { value: "concept", label: "개념 이해" },
  { value: "exam", label: "시험 대비" },
  { value: "practice", label: "문제 풀이" },
  { value: "review", label: "오답 정리" },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [learningMode, setLearningMode] = useState<LearningMode>("learn");
  const [learningGoal, setLearningGoal] =
    useState<LearningGoal>("concept");
  const isComposingRef = useRef(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      await getAuthSession().initialize();
      applyUserSettings(loadUserSettings());
      if (!cancelled) setHasStoredSession(Boolean(loadChatSession()));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = input.trim();

    if (!question || isComposingRef.current) {
      return;
    }

    router.push(
      `/chat?q=${encodeURIComponent(question)}&mode=${learningMode}&goal=${learningGoal}&startType=new`,
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === "Enter" &&
      (event.nativeEvent.isComposing || isComposingRef.current)
    ) {
      return;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-black sm:px-10">
      <section className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">한잎</h1>
        <p className="mt-4 text-base text-zinc-700 sm:text-lg">
          국어 문법을 AI와 함께 이해해 보세요.
        </p>
        <Link
          href="/progress"
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
        >
          내 학습 기록
        </Link>
        <Link href="/account" className="ml-4 inline-block text-sm font-medium underline underline-offset-4">계정</Link>
        <Link href="/settings" className="ml-4 inline-block text-sm font-medium underline underline-offset-4">설정</Link>
        {hasStoredSession && (
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            <Link
              href="/chat?startType=resume_session"
              className="rounded-lg border border-black px-3 py-2 font-medium"
            >
              이전 대화 이어서 하기
            </Link>
            <button
              type="button"
              onClick={() => setHasStoredSession(false)}
              className="rounded-lg border border-zinc-300 px-3 py-2 font-medium"
            >
              새로 시작하기
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-10 text-left">
          <fieldset className="mb-6">
            <legend className="text-sm font-semibold">학습 방식</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {LEARNING_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-black ${
                    learningMode === option.value
                      ? "border-black bg-black text-white"
                      : "border-zinc-300 bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="learningMode"
                    value={option.value}
                    checked={learningMode === option.value}
                    onChange={() => setLearningMode(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mb-6">
            <legend className="text-sm font-semibold">학습 목표</legend>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LEARNING_GOAL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-black ${
                    learningGoal === option.value
                      ? "border-black bg-black text-white"
                      : "border-zinc-300 bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="learningGoal"
                    value={option.value}
                    checked={learningGoal === option.value}
                    onChange={() => setLearningGoal(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="question" className="text-lg font-semibold">
            무엇이 궁금한가요?
          </label>
          <input
            id="question"
            name="question"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              isComposingRef.current = false;
              setInput(event.currentTarget.value);
            }}
            placeholder="예: 품사가 뭐예요?"
            className="mt-3 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-4 text-base text-black outline-none placeholder:text-zinc-500 focus:border-black"
          />
          <button
            type="submit"
            className="mt-6 block w-full rounded-lg bg-black px-4 py-4 text-center text-base font-semibold text-white"
          >
            질문하기
          </button>
        </form>
      </section>
    </main>
  );
}
