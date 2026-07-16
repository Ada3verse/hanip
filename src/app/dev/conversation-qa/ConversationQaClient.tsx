"use client";

import { useState } from "react";
import { CONVERSATION_QA_SCENARIOS } from "./scenarios";
import { runConversationQaScenario } from "@/lib/qa/conversationQa";
import type { ConversationQaResult } from "@/lib/qa/types";
import { runConversationQaLocalTests } from "@/lib/qa/conversationQa.local-test";
import { runChatStateIntegrationLocalTests } from "@/lib/qa/chatStateIntegration.local-test";

export default function ConversationQaClient() {
  const [results, setResults] = useState<Record<string, ConversationQaResult>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  function runOne(id: string) {
    const scenario = CONVERSATION_QA_SCENARIOS.find((item) => item.id === id);
    if (!scenario) return;
    setResults((current) => ({ ...current, [id]: runConversationQaScenario(scenario) }));
  }

  async function runAll() {
    if (running) return;
    setRunning(true);
    runConversationQaLocalTests();
    runChatStateIntegrationLocalTests();
    setResults({});
    for (const [index, scenario] of CONVERSATION_QA_SCENARIOS.entries()) {
      await Promise.resolve();
      setResults((current) => ({
        ...current,
        [scenario.id]: runConversationQaScenario(scenario),
      }));
      setProgress(index + 1);
    }
    setRunning(false);
  }

  const values = Object.values(results);
  const counts = {
    pass: values.filter(({ status }) => status === "pass").length,
    warning: values.filter(({ status }) => status === "warning").length,
    fail: values.filter(({ status }) => status === "fail").length,
  };

  async function copyIssue(result: ConversationQaResult, issueIndex: number) {
    const issue = result.issues[issueIndex];
    const detail = result.assistantDetails.find(({ turn }) => turn === issue.turn);
    await navigator.clipboard.writeText([
      `시나리오 ID: ${result.scenarioId}`,
      `문제 코드: ${issue.code}`,
      `학생 입력: ${detail?.studentInput ?? ""}`,
      `AI 응답: ${detail?.response ?? ""}`,
      `activeConcept: ${detail?.meta?.dialoguePlan?.activeConcept ?? ""}`,
      `dialoguePlan: ${JSON.stringify(detail?.meta?.dialoguePlan ?? null)}`,
      `learningState: ${JSON.stringify(detail?.meta?.learningState ?? null)}`,
    ].join("\n"));
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-black sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-600">Development only</p>
            <h1 className="mt-1 text-3xl font-bold">Conversation QA</h1>
            <p className="mt-2 text-sm text-zinc-600">연속 대화 UX를 Mock으로 재생하고 규칙 기반 문제를 탐지합니다.</p>
          </div>
          <button type="button" onClick={runAll} disabled={running} className="rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50">
            {running ? `전체 실행 ${progress}/${CONVERSATION_QA_SCENARIOS.length}` : "전체 실행"}
          </button>
        </header>

        <section className="mt-6 grid grid-cols-4 gap-3">
          {[["전체", CONVERSATION_QA_SCENARIOS.length], ["통과", counts.pass], ["주의", counts.warning], ["실패", counts.fail]].map(([label, count]) => (
            <div key={label} className="rounded-xl bg-white p-4"><p className="text-sm text-zinc-600">{label}</p><p className="mt-1 text-2xl font-bold">{count}</p></div>
          ))}
        </section>

        <div className="mt-8 space-y-6">
          {CONVERSATION_QA_SCENARIOS.map((scenario) => {
            const result = results[scenario.id];
            return (
              <article key={scenario.id} data-qa-scenario={scenario.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 className="font-bold">{scenario.id}. {scenario.title}</h2>{result && <p className="mt-1 text-sm font-semibold">{result.status === "pass" ? "통과" : result.status === "warning" ? "주의" : "실패"}</p>}</div>
                  <button type="button" onClick={() => runOne(scenario.id)} className="rounded-lg border border-black px-3 py-2 text-sm font-semibold">실행</button>
                </div>
                {result && (
                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <section><h3 className="text-sm font-bold">Transcript</h3><ol className="mt-2 space-y-2">{result.transcript.map((message, index) => <li key={index} className="rounded-lg bg-zinc-100 p-3 text-sm"><strong>{message.role}</strong><p className="mt-1 whitespace-pre-wrap">{message.content}</p></li>)}</ol></section>
                    <section>
                      <h3 className="text-sm font-bold">Issues</h3>
                      {result.issues.length === 0 ? <p className="mt-2 text-sm text-emerald-700">발견된 문제가 없습니다.</p> : <ul className="mt-2 space-y-2">{result.issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="rounded-lg border border-zinc-200 p-3 text-sm"><strong>{issue.code} · turn {issue.turn}</strong><p className="mt-1">{issue.message}</p><button type="button" onClick={() => void copyIssue(result, index)} className="mt-2 text-xs font-semibold underline">문제 복사</button></li>)}</ul>}
                      <h3 className="mt-5 text-sm font-bold">개발 meta</h3>
                      <ul className="mt-2 space-y-2 text-xs">{result.assistantDetails.map((detail) => <li key={detail.turn} className="rounded-lg bg-zinc-100 p-3">turn {detail.turn} · activeConcept: {detail.meta?.dialoguePlan?.activeConcept ?? "-"} · action: {detail.meta?.dialoguePlan?.action ?? "-"} · strategy: {detail.meta?.strategy ?? "-"} · persona: {detail.meta?.tutorPersona?.tone ?? "-"}</li>)}</ul>
                    </section>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
