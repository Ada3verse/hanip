"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAuthSession } from "@/lib/auth/authSession";
import { loadUserSettings, normalizeUserSettings, resetUserSettings, saveUserSettings } from "@/lib/settings/settingsEngine";
import type { UserSettings } from "@/lib/settings/types";
export default function SettingsClient() {
  const [saved, setSaved] = useState<UserSettings | null>(null); const [draft, setDraft] = useState<UserSettings | null>(null); const [notice, setNotice] = useState("");
  useEffect(() => { void getAuthSession().initialize().then(() => { const value = loadUserSettings(); setSaved(value); setDraft(value); }); }, []);
  const dirty = useMemo(() => Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft)), [saved, draft]);
  if (!draft) return <main className="min-h-screen bg-white" />;
  function update(patch: Partial<UserSettings>) { setDraft((value) => value ? normalizeUserSettings({ ...value, ...patch, updatedAt: value.updatedAt }) : value); setNotice(""); }
  function save() { try { const value = saveUserSettings(draft!); setSaved(value); setDraft(value); setNotice("설정을 저장했어요."); } catch { setNotice("설정을 저장하지 못했어요. 기존 설정은 유지됩니다."); } }
  function reset() { if (!window.confirm("설정을 기본값으로 초기화할까요? 학습 기록은 유지됩니다.")) return; const value = resetUserSettings(); setSaved(value); setDraft(value); setNotice("기본 설정으로 초기화했어요."); }
  return <main className="min-h-screen bg-zinc-50 px-4 py-10 text-black"><section className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"><Link href="/" className="text-sm font-medium">← 홈</Link><h1 className="mt-4 text-2xl font-bold">설정</h1><div className="mt-6 space-y-5">
    <label className="block text-sm font-semibold">AI 튜터 이름<input value={draft.tutorName} onChange={(e) => update({ tutorName: e.target.value })} maxLength={20} className="mt-2 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-normal" /></label>
    <label className="block text-sm font-semibold">입력 방식<select value={draft.preferredInputMode} onChange={(e) => update({ preferredInputMode: e.target.value as UserSettings["preferredInputMode"] })} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal"><option value="balanced">균형 있게</option><option value="choice_preferred">선택지 선호</option><option value="free_input_preferred">직접 입력 선호</option></select></label>
    <label className="block text-sm font-semibold">글자 크기<select value={draft.textSize} onChange={(e) => update({ textSize: e.target.value as UserSettings["textSize"] })} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal"><option value="small">작게</option><option value="medium">보통</option><option value="large">크게</option></select></label>
    {([["reducedMotion", "모션 줄이기"], ["showLearningStatus", "학습 상태 표시"], ["showSuggestedReplies", "선택지 표시"]] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 text-sm font-semibold"><span>{label}</span><input type="checkbox" checked={draft[key]} onChange={(e) => update({ [key]: e.target.checked })} className="size-5" /></label>)}
  </div>{notice && <p className="mt-5 text-sm" role="status">{notice}</p>}<div className="mt-6 flex gap-2"><button disabled={!dirty} onClick={save} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">저장</button><button onClick={reset} className="rounded-lg border border-zinc-400 px-4 py-2 text-sm font-semibold">기본값으로 초기화</button></div></section></main>;
}
