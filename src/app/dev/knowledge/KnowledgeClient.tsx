"use client";
import { useMemo, useState } from "react";
import { calculateConceptCoverage } from "@/lib/knowledge/authoring/coverage";
import { registerAuthoringPack } from "@/lib/knowledge/authoring/registry";
import { authoringSamplePack } from "@/lib/knowledge/authoring/samplePack";
import { validateAuthoringPack } from "@/lib/knowledge/authoring/validator";
import type { PackStatus } from "@/lib/knowledge/authoring/types";

export default function KnowledgeClient() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState<PackStatus | "all">("all"); const [notice, setNotice] = useState("");
  const validation = useMemo(() => validateAuthoringPack(authoringSamplePack), []);
  const concepts = authoringSamplePack.concepts.filter((concept) => `${concept.conceptId} ${concept.title} ${concept.aliases.join(" ")}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || authoringSamplePack.status === status));
  const graph = authoringSamplePack.concepts.map(({ title, prerequisites }) => `${title} ← ${prerequisites.length ? prerequisites.join(", ") : "시작"}`);
  async function copyJson() { await navigator.clipboard.writeText(JSON.stringify(authoringSamplePack, null, 2)); setNotice("JSON을 복사했습니다."); }
  return <main className="min-h-screen bg-zinc-100 px-4 py-8 text-black"><div className="mx-auto max-w-6xl">
    <p className="text-sm font-semibold text-zinc-600">Development only</p><h1 className="mt-1 text-3xl font-bold">Knowledge Pack 저작·검증</h1>
    <p className="mt-2 text-sm text-amber-800">{authoringSamplePack.note}</p>
    <div className="mt-5 flex flex-wrap gap-2"><button className="rounded-lg bg-black px-4 py-2 text-white" onClick={() => setNotice(validation.valid ? "전체 검증 완료" : "등록을 막는 오류가 있습니다.")}>Pack 전체 검증</button><button className="rounded-lg border bg-white px-4 py-2" onClick={() => { const result = registerAuthoringPack(authoringSamplePack); setNotice(result.registered ? "샘플 draft를 개발 Registry에 등록했습니다." : "등록이 차단됐습니다."); }}>샘플 Pack import</button><button className="rounded-lg border bg-white px-4 py-2" onClick={() => void copyJson()}>JSON 복사</button></div>
    {notice && <p className="mt-3 text-sm" role="status">{notice}</p>}
    <section className="mt-5 grid gap-3 rounded-xl bg-white p-4 text-sm md:grid-cols-4"><p>Pack <strong>{authoringSamplePack.packId}</strong></p><p>Status <strong>{authoringSamplePack.status}</strong></p><p>Concept <strong>{authoringSamplePack.concepts.length}</strong></p><p>Errors <strong>{validation.issues.filter(({ severity }) => severity === "error").length}</strong> · Warnings <strong>{validation.issues.filter(({ severity }) => severity === "warning").length}</strong></p></section>
    <div className="mt-5 flex gap-2"><input className="min-h-11 flex-1 rounded-lg border px-3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="concept 검색" aria-label="개념 검색"/><select className="rounded-lg border bg-white px-3" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="검증 상태"><option value="all">전체</option><option value="draft">draft</option><option value="reviewed">reviewed</option><option value="verified">verified</option></select></div>
    <section className="mt-5 rounded-xl bg-white p-4"><h2 className="font-bold">검증 결과</h2>{validation.issues.length ? <ul className="mt-2 text-sm">{validation.issues.map((item, index) => <li key={`${item.code}-${index}`}>{item.severity} · {item.code} · {item.message}</li>)}</ul> : <p className="mt-2 text-sm">error·warning 없음</p>}</section>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{concepts.map((concept) => { const coverage = calculateConceptCoverage(concept); return <article key={concept.conceptId} className="rounded-xl bg-white p-4"><h2 className="font-bold">{concept.title}</h2><p className="text-xs text-zinc-500">{concept.conceptId} · coverage {coverage.score}%</p><p className="mt-2 text-sm">정의 {coverage.roles.definitions.current}/3 · 예문 {coverage.roles.originalExamples.current}/6 · 반례 {coverage.roles.counterexamples.current}/2 · 오개념 {coverage.roles.misconceptions.current}/3 · 확인 {coverage.roles.checks.current}/5 · Worked Example {coverage.roles.workedExamples.current}/2</p><p className="mt-2 text-xs">provenance: {concept.provenanceIds.join(", ")}</p><p className="mt-2 text-xs">중복 예문: {new Set(concept.examples.map(({ sentence }) => sentence)).size === concept.examples.length ? "없음" : "있음"}</p></article>; })}</div>
    <section className="mt-5 rounded-xl bg-white p-4"><h2 className="font-bold">Prerequisite 그래프 요약</h2><ul className="mt-2 text-sm">{graph.map((line) => <li key={line}>{line}</li>)}</ul></section>
    <details className="mt-5 rounded-xl bg-white p-4"><summary className="font-bold">JSON 미리보기</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(authoringSamplePack, null, 2)}</pre></details>
  </div></main>;
}
