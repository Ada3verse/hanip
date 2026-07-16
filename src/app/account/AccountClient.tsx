"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthSession } from "@/lib/auth/authSession";
import type { AuthSessionState } from "@/lib/auth/types";
import { getLocalLearningRepository } from "@/lib/repository/repositoryFactory";
import type { LearningUserData } from "@/lib/repository/types";
import { applyUserSettings, loadUserSettings } from "@/lib/settings/settingsEngine";

function maskedId(id: string) { return id.length < 12 ? `${id.slice(0, 4)}…` : `${id.slice(0, 8)}…${id.slice(-4)}`; }

export default function AccountClient() {
  const [auth, setAuth] = useState<AuthSessionState>({ status: "loading", user: null, error: null });
  const [data, setData] = useState<LearningUserData | null>(null);
  useEffect(() => {
    const session = getAuthSession();
    const unsubscribe = session.subscribe(setAuth);
    void session.initialize().then((state) => {
      if (state.user) { setData(getLocalLearningRepository().loadUserDataSync(state.user.id)); applyUserSettings(loadUserSettings()); }
    });
    return unsubscribe;
  }, []);

  async function rename() {
    const name = window.prompt("표시 이름을 입력해 주세요.", auth.user?.displayName ?? "학생");
    if (name === null) return;
    await getAuthSession().updateDisplayName(name);
  }
  async function newGuest() {
    if (!window.confirm("현재 계정에서 나가고 새 게스트 계정을 시작할까요? 기존 학습 데이터는 이 기기에 유지됩니다.")) return;
    await getAuthSession().signOut();
    const user = await getAuthSession().signInAsGuest();
    setData(getLocalLearningRepository().loadUserDataSync(user.id));
  }
  async function signOut() {
    if (!window.confirm("로그아웃할까요? 저장된 학습 데이터는 삭제되지 않습니다.")) return;
    await getAuthSession().signOut();
    setData(null);
  }

  if (auth.status === "loading") return <main className="min-h-screen bg-white" />;
  if (!auth.user) return <main className="mx-auto max-w-xl p-8"><p>로그아웃 상태입니다.</p><button className="mt-4 rounded-lg bg-black px-4 py-2 text-white" onClick={() => void newGuest()}>새 게스트 계정 시작</button></main>;
  const concepts = data?.progress.concepts ?? [];
  const lastStudied = concepts.map(({ lastStudiedAt }) => lastStudiedAt).sort().at(-1);
  return <main className="min-h-screen bg-zinc-50 px-4 py-10 text-black"><section className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <Link href="/" className="text-sm font-medium">← 홈</Link><h1 className="mt-4 text-2xl font-bold">계정</h1>
    <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm"><dt>표시 이름</dt><dd className="font-semibold">{auth.user.displayName}</dd><dt>AI 튜터 이름</dt><dd>{loadUserSettings().tutorName}</dd><dt>사용자 유형</dt><dd>게스트</dd><dt>사용자 ID</dt><dd>{maskedId(auth.user.id)}</dd><dt>저장된 세션</dt><dd>{data?.sessions.length ?? 0}개</dd><dt>학습 중인 개념</dt><dd>{concepts.filter(({ status }) => status === "learning" || status === "needs_review").length}개</dd><dt>마지막 학습</dt><dd>{lastStudied ? new Date(lastStudied).toLocaleString("ko-KR") : "기록 없음"}</dd><dt>저장 위치</dt><dd>이 기기</dd></dl>
    <p className="mt-6 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">향후 계정을 연결하면 여러 기기에서 학습 기록을 이어갈 수 있어요.</p>
    <div className="mt-6 flex flex-wrap gap-2"><Link href="/settings" className="rounded-lg border border-black px-3 py-2 text-sm font-semibold">설정으로 이동</Link><button onClick={() => void rename()} className="rounded-lg border border-black px-3 py-2 text-sm font-semibold">표시 이름 변경</button><button onClick={() => void newGuest()} className="rounded-lg border border-zinc-400 px-3 py-2 text-sm font-semibold">새 게스트 계정 시작</button><button onClick={() => void signOut()} className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white">로그아웃</button></div>
  </section></main>;
}
