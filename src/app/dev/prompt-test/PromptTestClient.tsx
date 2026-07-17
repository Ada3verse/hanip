"use client";

import { useState } from "react";

import { SCENARIOS } from "./scenarios";
import type { PromptTestScenario, ScenarioId } from "./scenarios";
import { createMockChatResponse } from "@/lib/testing/mockChatResponse";
import { runLearningRouteLocalTests } from "@/lib/knowledge/dependency/learningRoute.local-test";
import { runLearningStateLocalTests } from "@/lib/learningState/learningState.local-test";
import { runDialoguePlannerLocalTests } from "@/lib/dialogue/dialoguePlanner.local-test";
import { runTutorPersonaLocalTests } from "@/lib/persona/tutorPersona.local-test";
import { runSessionStartLocalTests } from "@/lib/chat/sessionStart.local-test";
import { runQuestionUxLocalTests } from "@/lib/dialogue/questionUx.local-test";
import { runSourceSelectorLocalTests } from "@/lib/knowledge/source/sourceSelector.local-test";
import { runRetrievalEngineLocalTests } from "@/lib/knowledge/retrieval/retrievalEngine.local-test";
import { runContentPackValidatorLocalTests } from "@/lib/knowledge/contentPack/validator.local-test";
import { runContentPackImporterLocalTests } from "@/lib/knowledge/contentPack/importer.local-test";
import { runEvaluationEngineLocalTests } from "@/lib/evaluation/evaluationEngine.local-test";
import { runMasteryEngineLocalTests } from "@/lib/mastery/masteryEngine.local-test";
import { runProgressEngineLocalTests } from "@/lib/progress/progressEngine.local-test";
import { runHintEngineLocalTests } from "@/lib/hint/hintEngine.local-test";
import { runWorkedExampleEngineLocalTests } from "@/lib/workedExample/workedExampleEngine.local-test";
import { runSessionSummaryEngineLocalTests } from "@/lib/sessionSummary/sessionSummaryEngine.local-test";
import { runGoalEngineLocalTests } from "@/lib/goal/goalEngine.local-test";
import { runMisconceptionLearningEngineLocalTests } from "@/lib/misconceptionLearning/misconceptionLearningEngine.local-test";
import { runAdaptiveEngineLocalTests } from "@/lib/adaptive/adaptiveEngine.local-test";
import { runLocalLearningRepositoryTests } from "@/lib/repository/localLearningRepository.local-test";
import { runRepositoryMigrationTests } from "@/lib/repository/migrations.local-test";
import { runLocalAuthProviderTests } from "@/lib/auth/localAuthProvider.local-test";
import { runAuthSessionTests } from "@/lib/auth/authSession.local-test";
import { runSettingsEngineTests } from "@/lib/settings/settingsEngine.local-test";
import { runTutorRuntimeTests } from "@/lib/runtime/tutorRuntime.local-test";
import { runResponseProviderFactoryLocalTests } from "@/lib/runtime/responseProviderFactory.local-test";
import { runLiveResponseCoreLocalTests } from "@/lib/runtime/liveResponseCore.local-test";
import { runRuntimeRequestGuardLocalTests } from "@/lib/runtime/requestGuard.local-test";
import { runReadinessEngineTests } from "@/lib/readiness/readinessEngine.local-test";
import { runFirebaseRepositoryLocalTests } from "@/lib/repository/firebase/firebase.local-test";
import { runFirebaseProductionRepositoryLocalTests } from "@/lib/repository/firebase/firebaseRepository.local-test";
import { runFirebaseHealthLocalTests } from "@/lib/firebase/health.local-test";
import { runFirebaseConfigLocalTests } from "@/lib/firebase/config.local-test";
import { runStudentModelTests } from "@/lib/studentModel/studentModelEngine.local-test";
import { runStudentModelIntegrationTests } from "@/lib/studentModel/studentModelIntegration.local-test";
import { runExplanationStrategyLocalTests } from "@/lib/explanation/explanationStrategy.local-test";
import { runKnowledgeAuthoringLocalTests } from "@/lib/knowledge/authoring/authoring.local-test";
import { runSourceIngestionLocalTests } from "@/lib/knowledge/ingestion/ingestion.local-test";
import { runKnowledgeReleaseLocalTests } from "@/lib/knowledge/release/releaseEngine.local-test";
import { runImportWizardLocalTests } from "@/lib/knowledge/importWizard/importWizard.local-test";
import { runPartsOfSpeechTextbookDraftLocalTests } from "@/lib/knowledge/partsOfSpeech/textbookDraft/pack.local-test";
import type { SelectedKnowledgeBundle } from "@/lib/knowledge/source/types";
import type {
  AiMeta,
  ChatApiRequest,
  ChatApiResponse,
  StudentSessionModel,
} from "@/lib/types/chat";

type ScenarioResult = {
  status: "idle" | "loading" | "success" | "error";
  response?: ChatApiResponse;
  error?: string;
};

type Verdict = "pass" | "warning" | "fail";

type ConditionResult = {
  label: string;
  met: boolean;
  critical: boolean;
};

type Assessment = {
  verdict: Verdict;
  conditions: ConditionResult[];
};

const EMPTY_STUDENT_MODEL: StudentSessionModel = {
  currentConcept: "",
  currentFlowStage: "",
  understoodConcepts: [],
  needsSupportConcepts: [],
  misconceptions: [],
  lastEvaluation: null,
  lastNextAction: null,
  confidence: null,
  consecutiveSuggestedReplyUses: 0,
  lastResponseMode: null,
  hintLevel: 0,
  consecutiveUnknownResponses: 0,
  learningStatus: "in_progress",
  completionEvidence: [],
  learningMode: "learn",
  learningGoal: "concept",
  priorProgressLoaded: false,
  priorMasteryScore: null,
  priorConceptStatus: null,
  activePrerequisite: null,
  completedPrerequisites: [],
  prerequisiteReturnConcept: null,
  learningRoute: null,
  suspendedConcept: null,
};

const INITIAL_RESULTS: Record<ScenarioId, ScenarioResult> = {
  a: { status: "idle" },
  b: { status: "idle" },
  c: { status: "idle" },
  d: { status: "idle" },
  e: { status: "idle" },
  f: { status: "idle" },
  g: { status: "idle" },
  h: { status: "idle" },
  i: { status: "idle" },
  j: { status: "idle" },
  k: { status: "idle" },
  l: { status: "idle" },
  m: { status: "idle" },
  n: { status: "idle" },
  o: { status: "idle" },
  p1: { status: "idle" },
  p2: { status: "idle" },
  p3: { status: "idle" },
  p4: { status: "idle" },
  q1: { status: "idle" },
  q2: { status: "idle" },
  q3: { status: "idle" },
  q4: { status: "idle" },
  q5: { status: "idle" },
  r: { status: "idle" },
  s: { status: "idle" },
  t: { status: "idle" },
};

const VERDICT_LABELS: Record<Verdict, string> = {
  pass: "통과",
  warning: "주의",
  fail: "실패",
};

const VERDICT_STYLES: Record<Verdict, string> = {
  pass: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  fail: "bg-red-100 text-red-800",
};

function isAiMeta(value: unknown): value is AiMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    "concept" in value &&
    typeof value.concept === "string" &&
    "flowStage" in value &&
    typeof value.flowStage === "string" &&
    "evaluation" in value &&
    (value.evaluation === "correct" ||
      value.evaluation === "partial_correct" ||
      value.evaluation === "misconception" ||
      value.evaluation === "apply_fail" ||
      value.evaluation === "unknown") &&
    "nextAction" in value &&
    typeof value.nextAction === "string" &&
    "misconception" in value &&
    typeof value.misconception === "string" &&
    "confidence" in value &&
    typeof value.confidence === "number" &&
    "learningStatus" in value &&
    (value.learningStatus === "in_progress" ||
      value.learningStatus === "ready_to_complete" ||
      value.learningStatus === "completed") &&
    "completionEvidence" in value &&
    Array.isArray(value.completionEvidence) &&
    value.completionEvidence.every((item) => typeof item === "string") &&
    "strategy" in value &&
    (value.strategy === "discover" ||
      value.strategy === "guide" ||
      value.strategy === "challenge" ||
      value.strategy === "review" ||
      value.strategy === "mastery")
  );
}

function isChatApiResponse(value: unknown): value is ChatApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    "suggestedReplies" in value &&
    Array.isArray(value.suggestedReplies) &&
    value.suggestedReplies.every((reply) => typeof reply === "string") &&
    (!("meta" in value) || value.meta === undefined || isAiMeta(value.meta))
  );
}

function KnowledgeBundleResult({ bundle }: { bundle?: SelectedKnowledgeBundle }) {
  if (!bundle) return null;
  const entries = [
    ["정의", bundle.definitionSource], ["설명", bundle.explanationSource],
    ["예문", bundle.exampleSource], ["오개념", bundle.misconceptionSource],
    ["교수 발문", bundle.teachingSource],
  ] as const;
  return (
    <div>
      <h3 className="text-sm font-bold">Knowledge Source Bundle</h3>
      <p className="mt-2 text-sm">concept: {bundle.concept} · verificationStatus: {bundle.verificationStatus}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {entries.map(([label, source]) => (
          <li key={label}>{label}: {source ? `${source.title} · ${source.type}${source.pageRange ? ` · ${source.pageRange}` : ""}` : "없음"}</li>
        ))}
      </ul>
    </div>
  );
}

function RetrievalResult({ meta }: { meta?: AiMeta }) {
  const retrieval = meta?.retrieval;
  if (!retrieval) return null;
  return (
    <div>
      <h3 className="text-sm font-bold">Retrieved Evidence</h3>
      <p className="mt-2 text-sm">reason: {retrieval.reason.join(" / ")}</p>
      <p className="mt-1 text-sm">selected source: {retrieval.selectedSources.map((source) => `${source.title} (${source.type})`).join(" / ") || "없음"}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {retrieval.usedEvidence.map((evidence) => <li key={evidence.id}>{evidence.role}: {evidence.content}</li>)}
      </ul>
    </div>
  );
}

function AnswerEvaluationResult({ meta }: { meta?: AiMeta }) {
  const result = meta?.answerEvaluation;
  if (!result) return null;
  return (
    <div>
      <h3 className="text-sm font-bold">Rule-based Answer Evaluation</h3>
      <p className="mt-2 text-sm">
        evaluation: {result.evaluation} · confidence: {result.confidence} ·
        completionSatisfied: {String(result.completionSatisfied)}
      </p>
      <p className="mt-1 text-sm">
        matchedEvidence: {result.matchedEvidence.join(" / ") || "없음"}
      </p>
      <p className="mt-1 text-sm">
        matchedMisconception: {result.matchedMisconceptions.join(" / ") || "없음"}
      </p>
    </div>
  );
}

function assessScenario(
  scenario: PromptTestScenario,
  response?: ChatApiResponse,
): Assessment {
  const message = response?.message.trim() ?? "";
  const suggestedReplies = response?.suggestedReplies ?? [];
  const meta = response?.meta;
  const conditions: ConditionResult[] = [
    {
      label: "AI 응답이 존재함",
      met: message.length > 0,
      critical: true,
    },
    {
      label: `evaluation이 ${scenario.expectedEvaluation}임`,
      met: meta?.evaluation === scenario.expectedEvaluation,
      critical: true,
    },
    {
      label: `concept에 ${scenario.expectedConceptKeywords.join(", ")} 포함`,
      met:
        scenario.expectedConceptKeywords.length === 0 ||
        scenario.expectedConceptKeywords.every((keyword) =>
          meta?.concept.includes(keyword),
        ),
      critical: false,
    },
    {
      label: `nextAction이 기대 행동(${scenario.expectedNextActions.join(", ")})과 연결됨`,
      met:
        scenario.expectedNextActions.length === 0 ||
        scenario.expectedNextActions.some((keyword) =>
          meta?.nextAction.includes(keyword),
        ),
      critical: false,
    },
    ...scenario.requiredMessagePatterns.map(({ label, pattern }) => ({
      label,
      met: pattern.test(message),
      critical: false,
    })),
    ...scenario.forbiddenMessagePatterns.map(({ label, pattern }) => ({
      label,
      met: !pattern.test(message),
      critical: true,
    })),
    ...(scenario.expectedSuggestedReplies
      ? [
          {
            label: `suggestedReplies가 ${scenario.expectedSuggestedReplies.min}~${scenario.expectedSuggestedReplies.max}개임`,
            met:
              suggestedReplies.length >= scenario.expectedSuggestedReplies.min &&
              suggestedReplies.length <= scenario.expectedSuggestedReplies.max,
            critical: false,
          },
          ...scenario.expectedSuggestedReplies.requiredPatterns.map(
            ({ label, pattern }) => ({
              label,
              met: suggestedReplies.some((reply) => pattern.test(reply)),
              critical: false,
            }),
          ),
        ]
      : []),
    ...(scenario.expectedHintLevelUsed !== undefined
      ? [
          {
            label: `hintLevelUsed가 ${scenario.expectedHintLevelUsed}임`,
            met: meta?.hintLevelUsed === scenario.expectedHintLevelUsed,
            critical: false,
          },
        ]
      : []),
    ...(scenario.expectedLearningStatus
      ? [
          {
            label: `learningStatus가 ${scenario.expectedLearningStatus}임`,
            met: meta?.learningStatus === scenario.expectedLearningStatus,
            critical: true,
          },
        ]
      : []),
    ...(scenario.expectedStrategy
      ? [
          {
            label: `strategy가 ${scenario.expectedStrategy}임`,
            met: meta?.strategy === scenario.expectedStrategy,
            critical: true,
          },
        ]
      : []),
    ...(scenario.expectedDialogueActions
      ? [{
          label: `dialogue action이 ${scenario.expectedDialogueActions.join(" 또는 ")}임`,
          met: Boolean(
            meta?.dialoguePlan &&
              scenario.expectedDialogueActions.includes(
                meta.dialoguePlan.action as "hint" | "explain",
              ),
          ),
          critical: true,
        }]
      : []),
    ...(scenario.expectedPersona
      ? [
          {
            label: `persona tone이 ${scenario.expectedPersona.tones.join(" 또는 ")}임`,
            met: Boolean(
              meta?.tutorPersona &&
                scenario.expectedPersona.tones.includes(meta.tutorPersona.tone),
            ),
            critical: true,
          },
          {
            label: "학생 생각을 먼저 인정하는 persona임",
            met:
              meta?.tutorPersona?.acknowledgeStudent ===
              scenario.expectedPersona.acknowledgeStudent,
            critical: true,
          },
        ]
      : []),
    ...(scenario.requiredCompletionEvidencePatterns ?? []).map(
      ({ label, pattern }) => ({
        label,
        met: pattern.test(meta?.completionEvidence.join("\n") ?? ""),
        critical: false,
      }),
    ),
  ];
  const hasCriticalFailure = conditions.some(
    (condition) => condition.critical && !condition.met,
  );
  const hasUnmetCondition = conditions.some((condition) => !condition.met);

  return {
    verdict: hasCriticalFailure
      ? "fail"
      : hasUnmetCondition
        ? "warning"
        : "pass",
    conditions,
  };
}

export default function PromptTestClient({
  liveTestsEnabled,
}: {
  liveTestsEnabled: boolean;
}) {
  const [results, setResults] =
    useState<Record<ScenarioId, ScenarioResult>>(INITIAL_RESULTS);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    title: string;
  } | null>(null);
  const [liveScenarioIds, setLiveScenarioIds] = useState<ScenarioId[]>([]);
  const [liveResults, setLiveResults] = useState<
    Partial<Record<ScenarioId, { response?: ChatApiResponse; error?: string; elapsed: number; provider: "openai"; apiCalled: boolean }>>
  >({});
  const [isRunningLive, setIsRunningLive] = useState(false);

  async function runScenario(scenario: PromptTestScenario) {
    setResults((currentResults) => ({
      ...currentResults,
      [scenario.id]: { status: "loading" },
    }));

    try {
      const requestBody: ChatApiRequest = {
        messages: scenario.messages,
        learningMode: scenario.learningMode ?? "learn",
        learningGoal: scenario.learningGoal ?? "concept",
        startType: scenario.startType ?? "new",
        studentModel: {
          ...EMPTY_STUDENT_MODEL,
          learningMode: scenario.learningMode ?? "learn",
          learningGoal: scenario.learningGoal ?? "concept",
          ...scenario.studentModel,
        },
      };
      const data = createMockChatResponse(requestBody);

      setResults((currentResults) => ({
        ...currentResults,
        [scenario.id]: { status: "success", response: data },
      }));
    } catch (error) {
      console.error("Failed to run prompt test scenario:", error);
      setResults((currentResults) => ({
        ...currentResults,
        [scenario.id]: {
          status: "error",
          error: "테스트 실행에 실패했습니다.",
        },
      }));
    }
  }

  function toggleLiveScenario(id: ScenarioId) {
    setLiveScenarioIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 1
          ? [...current, id]
          : current,
    );
  }

  async function runLiveTests() {
    if (
      !liveTestsEnabled ||
      isRunningLive ||
      liveScenarioIds.length === 0 ||
      liveScenarioIds.length > 1
    ) return;

    setIsRunningLive(true);
    setLiveResults({});
    for (const id of liveScenarioIds) {
      const scenario = SCENARIOS.find((item) => item.id === id);
      if (!scenario) continue;
      const requestBody: ChatApiRequest = {
        messages: scenario.messages,
        learningMode: scenario.learningMode ?? "learn",
        learningGoal: scenario.learningGoal ?? "concept",
        studentModel: {
          ...EMPTY_STUDENT_MODEL,
          learningMode: scenario.learningMode ?? "learn",
          learningGoal: scenario.learningGoal ?? "concept",
          ...scenario.studentModel,
        },
      };

      try {
        const startedAt = performance.now();
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hanip-live-ai-test": "true",
          },
          body: JSON.stringify(requestBody),
        });
        const data: unknown = await response.json();
        setLiveResults((current) => ({ ...current, [id]: response.ok && isChatApiResponse(data)
          ? { response: data, elapsed: Math.round(performance.now() - startedAt), provider: "openai", apiCalled: true }
          : { error: "실제 AI 요청이 차단되었거나 실패했습니다.", elapsed: Math.round(performance.now() - startedAt), provider: "openai", apiCalled: response.status !== 403 },
        }));
      } catch (error) {
        console.error("Failed to run live AI test:", error);
        setLiveResults((current) => ({
          ...current,
          [id]: { error: "실제 AI 요청에 실패했습니다.", elapsed: 0, provider: "openai", apiCalled: true },
        }));
      }
    }
    setIsRunningLive(false);
  }

  async function runAllScenarios() {
    if (isRunningAll) {
      return;
    }

    setIsRunningAll(true);
    runLearningRouteLocalTests();
    runLearningStateLocalTests();
    runDialoguePlannerLocalTests();
    runStudentModelTests();
    await runStudentModelIntegrationTests();
    runExplanationStrategyLocalTests();
    runKnowledgeAuthoringLocalTests();
    await runSourceIngestionLocalTests();
    runKnowledgeReleaseLocalTests();
    await runImportWizardLocalTests();
    runPartsOfSpeechTextbookDraftLocalTests();
    runTutorPersonaLocalTests();
    runSessionStartLocalTests();
    runQuestionUxLocalTests();
    runSourceSelectorLocalTests();
    runRetrievalEngineLocalTests();
    runContentPackValidatorLocalTests();
    runContentPackImporterLocalTests();
    runEvaluationEngineLocalTests();
    runMasteryEngineLocalTests();
    runProgressEngineLocalTests();
    runHintEngineLocalTests();
    runWorkedExampleEngineLocalTests();
    runSessionSummaryEngineLocalTests();
    runGoalEngineLocalTests();
    runMisconceptionLearningEngineLocalTests();
    runAdaptiveEngineLocalTests();
    await runLocalLearningRepositoryTests();
    runRepositoryMigrationTests();
    await runLocalAuthProviderTests();
    await runAuthSessionTests();
    runSettingsEngineTests();
    await runTutorRuntimeTests();
    runResponseProviderFactoryLocalTests();
    await runLiveResponseCoreLocalTests();
    runRuntimeRequestGuardLocalTests();
    await runFirebaseRepositoryLocalTests();
    await runFirebaseProductionRepositoryLocalTests();
    runFirebaseConfigLocalTests();
    await runFirebaseHealthLocalTests();
    await runReadinessEngineTests();

    for (const [index, scenario] of SCENARIOS.entries()) {
      setProgress({ current: index + 1, title: scenario.title });
      await runScenario(scenario);
    }

    setProgress({ current: SCENARIOS.length, title: "전체 실행 완료" });
    setIsRunningAll(false);
  }

  const assessments = SCENARIOS.flatMap((scenario) => {
    const result = results[scenario.id];

    if (result.status === "success") {
      return [assessScenario(scenario, result.response)];
    }

    if (result.status === "error") {
      return [assessScenario(scenario)];
    }

    return [];
  });
  const summary = {
    pass: assessments.filter(({ verdict }) => verdict === "pass").length,
    warning: assessments.filter(({ verdict }) => verdict === "warning").length,
    fail: assessments.filter(({ verdict }) => verdict === "fail").length,
  };
  const hasLoadingScenario = Object.values(results).some(
    ({ status }) => status === "loading",
  );

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 text-black sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold text-zinc-600">
            Development only
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                한잎 Prompt Test
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
                미리 정한 대화로 AI 응답과 meta를 자동 판정합니다.
              </p>
            </div>
            <button
              type="button"
              disabled={isRunningAll || hasLoadingScenario}
              onClick={() => void runAllScenarios()}
              className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isRunningAll ? "전체 실행 중" : "전체 실행"}
            </button>
          </div>

          {(progress || assessments.length > 0) && (
            <div
              className="mt-6 rounded-xl border border-zinc-200 bg-white p-4"
              aria-live="polite"
            >
              {progress && (
                <p className="text-sm font-medium">
                  진행: {progress.current}/{SCENARIOS.length} · {progress.title}
                </p>
              )}
              <p className="mt-2 text-sm text-zinc-700">
                완료 {assessments.length}/{SCENARIOS.length} · 통과 {summary.pass} ·
                주의 {summary.warning} · 실패 {summary.fail}
              </p>
            </div>
          )}
        </header>

        <section className="mb-8 rounded-2xl border border-zinc-300 bg-white p-5 text-sm">
          <h2 className="font-bold">Firebase Provider 상태</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div><dt className="text-zinc-500">Provider</dt><dd className="font-semibold">{process.env.NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER === "firebase" ? "Firebase" : "Local (기본값)"}</dd></div>
            <div><dt className="text-zinc-500">Firestore Save / Load</dt><dd className="font-semibold">메모리 Gateway 로컬 검증</dd></div>
            <div><dt className="text-zinc-500">Fallback</dt><dd className="font-semibold">Local 자동 전환 활성</dd></div>
            <div><dt className="text-zinc-500">Repository</dt><dd className="font-semibold">READY · 계약 테스트 통과</dd></div>
            <div><dt className="text-zinc-500">Health</dt><dd className="font-semibold">WARNING · 실제 검사는 /dev/firebase에서 수동 실행</dd></div>
            <div><dt className="text-zinc-500">외부 호출</dt><dd className="font-semibold">자동 테스트에서는 비활성</dd></div>
          </dl>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-lg font-bold">Live AI 수동 테스트</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-700">
            {liveTestsEnabled
              ? "선택한 시나리오만 실제 AI로 순차 실행합니다."
              : "HANIP_USE_MOCK_AI=false와 HANIP_ENABLE_LIVE_AI_TESTS=true를 모두 설정해야 수동 실행할 수 있습니다."}
          </p>
          <p className="mt-2 text-sm font-semibold">
            예상 요청 수: {liveScenarioIds.length}회 / 이번 실행 최대 1회
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.map((scenario) => (
              <label key={scenario.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={liveScenarioIds.includes(scenario.id)}
                  disabled={
                    isRunningLive ||
                    (!liveScenarioIds.includes(scenario.id) &&
                      liveScenarioIds.length >= 1)
                  }
                  onChange={() => toggleLiveScenario(scenario.id)}
                  className="mt-1"
                />
                <span>{scenario.title}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={
              !liveTestsEnabled ||
              isRunningLive ||
              liveScenarioIds.length === 0
            }
            onClick={() => void runLiveTests()}
            className="mt-4 rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isRunningLive ? "실제 AI 테스트 중" : "실제 AI 테스트"}
          </button>
          {Object.keys(liveResults).length > 0 && (
            <ul className="mt-4 space-y-2 text-sm" aria-live="polite">
              {liveScenarioIds.map((id) => {
                const result = liveResults[id];
                if (!result) return null;
                return (
                  <li key={id}>
                    <strong>{id.toUpperCase()}</strong>: {result.response?.message ?? result.error}
                    <span className="ml-2 text-zinc-600">
                      Provider {result.provider} · 실제 호출 {result.apiCalled ? "예" : "아니요"} · {result.elapsed}ms · Concept {result.response?.meta?.concept ?? "-"} · Evidence {result.response?.meta?.retrieval?.usedEvidence.length ?? 0}개
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {SCENARIOS.map((scenario) => {
            const result = results[scenario.id];
            const hasRun = result.status !== "idle";
            const assessment =
              result.status === "success"
                ? assessScenario(scenario, result.response)
                : result.status === "error"
                  ? assessScenario(scenario)
                  : undefined;

            return (
              <section
                key={scenario.id}
                data-scenario={scenario.id}
                data-verdict={assessment?.verdict ?? result.status}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{scenario.title}</h2>
                      {assessment && <VerdictBadge verdict={assessment.verdict} />}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {scenario.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={result.status === "loading" || isRunningAll}
                    onClick={() => void runScenario(scenario)}
                    className="shrink-0 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {result.status === "loading"
                      ? "실행 중"
                      : hasRun
                        ? "다시 실행"
                        : "실행"}
                  </button>
                </div>

                <ScenarioMessages scenario={scenario} />

                {result.status === "loading" && (
                  <p role="status" className="mt-5 text-sm text-zinc-600">
                    AI 응답을 기다리고 있습니다.
                  </p>
                )}

                {result.status === "error" && (
                  <p role="alert" className="mt-5 text-sm text-red-700">
                    {result.error}
                  </p>
                )}

                {assessment && <AssessmentResult assessment={assessment} />}

                {result.status === "success" && result.response && (
                  <div className="mt-5 space-y-5" aria-live="polite">
                    <div>
                      <h3 className="text-sm font-bold">실제 AI 응답</h3>
                      <p className="mt-2 whitespace-pre-wrap rounded-xl border border-zinc-200 p-4 text-sm leading-7">
                        {result.response.message}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold">suggestedReplies</h3>
                      {result.response.suggestedReplies.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {result.response.suggestedReplies.map((reply) => (
                            <li
                              key={reply}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            >
                              {reply}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-600">빈 배열</p>
                      )}
                    </div>

                    <MetaResult meta={result.response.meta} />
                    <AnswerEvaluationResult meta={result.response.meta} />
                    <RetrievalResult meta={result.response.meta} />
                    <KnowledgeBundleResult bundle={result.response.meta?.knowledgeBundle} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function ScenarioMessages({ scenario }: { scenario: PromptTestScenario }) {
  return (
    <div className="mt-5 rounded-xl bg-zinc-100 p-4">
      <h3 className="text-sm font-bold">입력 대화</h3>
      <ol className="mt-3 space-y-3">
        {scenario.messages.map((message, index) => (
          <li key={`${message.role}-${index}`}>
            <p className="text-xs font-semibold text-zinc-500">
              {message.role}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
              {message.content}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${VERDICT_STYLES[verdict]}`}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

function AssessmentResult({ assessment }: { assessment: Assessment }) {
  const satisfied = assessment.conditions.filter(({ met }) => met);
  const unmet = assessment.conditions.filter(({ met }) => !met);

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <ConditionList
        title="충족한 조건"
        conditions={satisfied}
        emptyMessage="충족한 조건이 없습니다."
        className="text-emerald-800"
      />
      <ConditionList
        title="충족하지 못한 조건"
        conditions={unmet}
        emptyMessage="모든 조건을 충족했습니다."
        className="text-red-800"
      />
    </div>
  );
}

function ConditionList({
  title,
  conditions,
  emptyMessage,
  className,
}: {
  title: string;
  conditions: ConditionResult[];
  emptyMessage: string;
  className: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      {conditions.length > 0 ? (
        <ul className={`mt-2 space-y-2 text-sm ${className}`}>
          {conditions.map((condition) => (
            <li key={condition.label}>{condition.met ? "✓" : "✕"} {condition.label}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </div>
  );
}

function MetaResult({ meta }: { meta?: AiMeta }) {
  if (!meta) {
    return (
      <div>
        <h3 className="text-sm font-bold">전체 meta</h3>
        <p className="mt-2 text-sm text-zinc-600">
          구조화된 meta가 반환되지 않았습니다.
        </p>
      </div>
    );
  }

  const fields = [
    ["concept", meta.concept],
    ["flowStage", meta.flowStage],
    ["evaluation", meta.evaluation],
    ["nextAction", meta.nextAction],
    ["misconception", meta.misconception || '""'],
    ["confidence", String(meta.confidence)],
    ["hintLevelUsed", String(meta.hintLevelUsed ?? "")],
    ["learningStatus", meta.learningStatus],
    ["completionEvidence", meta.completionEvidence.join(" / ") || '""'],
    ["strategy", meta.strategy],
    ["learningState", meta.learningState ? JSON.stringify(meta.learningState) : '""'],
    ["dialoguePlan", meta.dialoguePlan ? JSON.stringify(meta.dialoguePlan) : '""'],
    ["tutorPersona", meta.tutorPersona ? JSON.stringify(meta.tutorPersona) : '""'],
    ["runtimeEvents", meta.runtimeEvents ? JSON.stringify(meta.runtimeEvents) : '""'],
    ["runtimeLog", meta.runtimeLog ? JSON.stringify(meta.runtimeLog) : '""'],
    ["retrieval", meta.retrieval ? JSON.stringify(meta.retrieval) : '""'],
    ["answerEvaluation", meta.answerEvaluation ? JSON.stringify(meta.answerEvaluation) : '""'],
    ["mastery", meta.mastery ? JSON.stringify(meta.mastery) : '""'],
    ["hintState", meta.hintState ? JSON.stringify(meta.hintState) : '""'],
    ["workedExampleState", meta.workedExampleState ? JSON.stringify(meta.workedExampleState) : '""'],
    ["sessionSummary", meta.sessionSummary ? JSON.stringify(meta.sessionSummary) : '""'],
    ["goalState", meta.goalState ? JSON.stringify(meta.goalState) : '""'],
    ["misconceptionProfiles", meta.misconceptionProfiles ? JSON.stringify(meta.misconceptionProfiles) : '""'],
    ["adaptiveProfile", meta.adaptiveProfile ? JSON.stringify(meta.adaptiveProfile) : '""'],
    ["adaptiveStrategy", meta.adaptiveStrategy ? JSON.stringify(meta.adaptiveStrategy) : '""'],
  ];

  return (
    <div>
      <h3 className="text-sm font-bold">전체 meta</h3>
      <dl className="mt-2 grid grid-cols-[minmax(0,8rem)_1fr] overflow-hidden rounded-xl border border-zinc-200 text-sm">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="border-b border-r border-zinc-200 bg-zinc-100 px-3 py-2 font-semibold">
              {label}
            </dt>
            <dd className="break-words border-b border-zinc-200 px-3 py-2">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
