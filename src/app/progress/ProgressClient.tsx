"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadChatSession } from "@/lib/chat/sessionStorage";
import { getAuthSession } from "@/lib/auth/authSession";
import { applyUserSettings, loadUserSettings } from "@/lib/settings/settingsEngine";

import { createProgressChatHref } from "@/lib/progress/progressEngine";
import {
  clearLearningProgress,
  createEmptyLearningProgress,
  loadLearningProgress,
} from "@/lib/progress/progressStorage";
import type {
  ConceptProgressStatus,
  LearningProgress,
} from "@/lib/progress/types";

const STATUS_LABELS: Record<ConceptProgressStatus, string> = {
  not_started: "시작 전",
  learning: "학습 중",
  needs_review: "복습 필요",
  understood: "이해함",
};

export default function ProgressClient() {
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [hasStoredSession, setHasStoredSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      await getAuthSession().initialize();
      applyUserSettings(loadUserSettings());
      if (!cancelled) {
        setProgress(loadLearningProgress());
        setHasStoredSession(Boolean(loadChatSession()));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClearProgress() {
    if (
      !window.confirm(
        "누적된 학습 기록을 모두 지울까요? 현재 대화 기록은 유지됩니다.",
      )
    ) return;
    clearLearningProgress();
    setProgress(createEmptyLearningProgress());
  }

  if (!progress) {
    return <main className="min-h-screen bg-white" />;
  }

  const understoodCount = progress.concepts.filter(
    ({ status }) => status === "understood",
  ).length;
  const reviewCount = progress.concepts.filter(
    ({ status }) => status === "needs_review",
  ).length;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-black sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium">← 홈</Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">내 학습 기록</h1>
            <p className="mt-2 text-sm text-zinc-600">
              이 브라우저에서 학습한 개념과 복습할 내용을 확인할 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearProgress}
            className="self-start rounded-lg border border-zinc-400 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:self-auto"
          >
            학습 기록 초기화
          </button>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="학습 기록 요약">
          {[
            ["전체 학습 세션", progress.totalSessions],
            ["학습한 개념", progress.concepts.length],
            ["이해한 개념", understoodCount],
            ["복습 필요", reviewCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-600 sm:text-sm">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        {progress.concepts.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-700">아직 누적된 학습 기록이 없어요.</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white">
              학습 시작하기
            </Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="개념별 학습 기록">
            {[...progress.concepts]
              .sort((a, b) => Date.parse(b.lastStudiedAt) - Date.parse(a.lastStudiedAt))
              .map((concept) => (
                <article key={concept.conceptId} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold">{concept.conceptName}</h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {STATUS_LABELS[concept.status]}
                      </p>
                    </div>
                    <p className="text-right text-sm"><strong className="text-2xl">{concept.masteryScore}</strong>/100</p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200" aria-label={`이해 점수 ${concept.masteryScore}점`}>
                    <div className="h-full bg-black" style={{ width: `${concept.masteryScore}%` }} />
                  </div>
                  <p className="mt-4 text-sm text-zinc-600">
                    마지막 학습: {new Date(concept.lastStudiedAt).toLocaleString("ko-KR")}
                  </p>
                  {concept.misconceptionIds.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold">대표 오개념</h3>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {concept.misconceptionIds.slice(0, 3).map((item) => (
                          <li key={item} className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {([
                      ["이어서 학습", "continue"],
                      ["복습하기", "review"],
                      ["문제로 연습하기", "practice"],
                    ] as const).map(([label, action]) => (
                      <Link
                        key={action}
                        href={createProgressChatHref(concept, action)}
                        className="min-h-10 rounded-lg border border-black bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                      >
                        {label}
                      </Link>
                    ))}
                    {hasStoredSession && (
                      <Link
                        href="/chat?startType=resume_session"
                        className="min-h-10 rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm font-semibold"
                      >
                        이전 대화 이어서 하기
                      </Link>
                    )}
                  </div>
                </article>
              ))}
          </section>
        )}
      </div>
    </main>
  );
}
