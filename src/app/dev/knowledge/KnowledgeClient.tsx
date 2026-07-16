"use client";

import { useState } from "react";
import { getImportedContentPacks, importKnowledgeContentPack } from "@/lib/knowledge/contentPack/importer";
import { sampleDraftPack } from "@/lib/knowledge/contentPack/sampleDraftPack";
import { validateKnowledgeContentPack } from "@/lib/knowledge/contentPack/validator";
import type { KnowledgeVerificationStatus } from "@/lib/knowledge/source/types";

export default function KnowledgeClient() {
  const [, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<KnowledgeVerificationStatus | "all">("all");
  const validation = validateKnowledgeContentPack(sampleDraftPack);
  const packs = getImportedContentPacks();
  const concepts = sampleDraftPack.concepts.filter((concept) => {
    const matchesQuery = `${concept.id} ${concept.name} ${concept.aliases.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const statuses = [concept.provenance.verificationStatus, concept.definition?.verificationStatus, ...concept.explanation.map(({ verificationStatus }) => verificationStatus)].filter(Boolean);
    return matchesQuery && (status === "all" || statuses.includes(status));
  });
  async function copyJson() { await navigator.clipboard.writeText(JSON.stringify(sampleDraftPack, null, 2)); }
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-black">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-zinc-600">Development only</p>
        <h1 className="mt-1 text-3xl font-bold">Knowledge Content Packs</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="rounded-lg bg-black px-4 py-2 text-white" onClick={() => setRevision((value) => value + 1)}>Pack 전체 검증 실행</button>
          <button className="rounded-lg border border-black bg-white px-4 py-2" onClick={() => { importKnowledgeContentPack(sampleDraftPack); setRevision((value) => value + 1); }}>Registry에 Sample 등록</button>
          <button className="rounded-lg border border-black bg-white px-4 py-2" onClick={() => void copyJson()}>JSON 예시 복사</button>
        </div>
        <section className="mt-5 rounded-xl bg-white p-4 text-sm">
          <p>Pack: {sampleDraftPack.id} · v{sampleDraftPack.version} · draft</p>
          <p>concept {sampleDraftPack.concepts.length}개 · source {sampleDraftPack.sources.length}개 · errors {validation.errors.length} · warnings {validation.warnings.length}</p>
          <p>현재 Registry 반영 Pack: {packs.length}개</p>
        </section>
        <div className="mt-5 flex gap-2">
          <input className="min-h-11 flex-1 rounded-lg border px-3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="concept 검색" />
          <select className="rounded-lg border bg-white px-3" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">전체</option><option value="draft">draft</option><option value="reviewed">reviewed</option><option value="verified">verified</option>
          </select>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {concepts.map((concept) => (
            <article key={concept.id} className="rounded-xl bg-white p-4">
              <h2 className="font-bold">{concept.name}</h2><p className="text-xs text-zinc-500">{concept.id}</p>
              <p className="mt-2 text-sm">정의 {concept.definition ? 1 : 0} · 판별 기준 {concept.classificationCriteria.length} · 예문 {concept.examples.length} · 오개념 {concept.misconceptions.length} · 발문 {concept.teachingPrompts.length}</p>
              <ul className="mt-2 text-sm">{concept.provenance.sources.map((source) => <li key={source.id}>{source.title} · {source.type}{source.pageRange ? ` · ${source.pageRange}` : ""}</li>)}</ul>
            </article>
          ))}
        </div>
        <details className="mt-6 rounded-xl bg-white p-4"><summary className="font-bold">Content Pack JSON 미리보기</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(sampleDraftPack, null, 2)}</pre></details>
      </div>
    </main>
  );
}
