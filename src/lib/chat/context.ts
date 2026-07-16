import type {
  ChatMessage,
  CompressedChatContext,
  StudentSessionModel,
} from "@/lib/types/chat";

const MESSAGE_COMPRESSION_THRESHOLD = 20;
const RECENT_MESSAGE_COUNT = 8;
const SUMMARY_REFRESH_INTERVAL = 10;
const MAX_SUMMARY_CACHE_ENTRIES = 100;
const summaryCache = new Map<string, string>();

function normalizeList(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function shortText(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized;
}

function hashConversation(messages: ChatMessage[]) {
  const stablePrefix = messages
    .slice(0, MESSAGE_COMPRESSION_THRESHOLD)
    .map(({ role, content }) => `${role}:${content}`)
    .join("\u001f");
  let hash = 2166136261;

  for (let index = 0; index < stablePrefix.length; index += 1) {
    hash ^= stablePrefix.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function buildSummary(
  messages: ChatMessage[],
  studentModel: Partial<StudentSessionModel> | undefined,
) {
  const currentConcept = studentModel?.currentConcept?.trim() || "확인 중";
  const currentFlowStage = studentModel?.currentFlowStage?.trim() || "확인 중";
  const understoodConcepts = normalizeList(studentModel?.understoodConcepts);
  const needsSupportConcepts = normalizeList(studentModel?.needsSupportConcepts);
  const misconceptions = normalizeList(studentModel?.misconceptions);
  const completionEvidence = normalizeList(studentModel?.completionEvidence);
  const latestAssistantMessage = [...messages]
    .reverse()
    .find(({ role }) => role === "assistant")?.content;
  const questionPurpose =
    studentModel?.lastNextAction?.trim() ||
    (latestAssistantMessage ? shortText(latestAssistantMessage) : "현재 이해 확인");

  return `[이전 대화 압축 요약]
- 현재 학습 개념: ${currentConcept}
- Teaching Flow 단계: ${currentFlowStage}
- 이해한 내용: ${understoodConcepts.join(", ") || "아직 확인되지 않음"}
- 아직 어려운 내용: ${needsSupportConcepts.join(", ") || "확인되지 않음"}
- 대표 오개념: ${misconceptions.join(", ") || "없음"}
- 완료 증거: ${completionEvidence.join(" / ") || "아직 없음"}
- 최근 힌트 사용: 도움 단계 ${studentModel?.hintLevel ?? 0}, 연속 이해 불가 ${studentModel?.consecutiveUnknownResponses ?? 0}회
- 현재 질문 목적: ${questionPurpose}
이 요약은 내부 참고용이며 학생에게 노출하지 마세요. 요약과 현재 Student Model이 다르면 현재 Student Model을 우선하세요.`;
}

function cacheSummary(key: string, summary: string) {
  if (summaryCache.size >= MAX_SUMMARY_CACHE_ENTRIES) {
    const oldestKey = summaryCache.keys().next().value;
    if (oldestKey) summaryCache.delete(oldestKey);
  }
  summaryCache.set(key, summary);
}

export function compressChatContext(
  messages: ChatMessage[],
  studentModel?: Partial<StudentSessionModel>,
): CompressedChatContext {
  if (messages.length <= MESSAGE_COMPRESSION_THRESHOLD) {
    return {
      summary: "",
      recentMessages: messages,
      summarizedMessageCount: 0,
      summaryVersion: null,
      summaryRefreshed: false,
    };
  }

  const summaryVersion = Math.floor(
    (messages.length - MESSAGE_COMPRESSION_THRESHOLD - 1) /
      SUMMARY_REFRESH_INTERVAL,
  );
  const cacheKey = `${hashConversation(messages)}:${summaryVersion}`;
  let summary = summaryCache.get(cacheKey);
  const summaryRefreshed = !summary;

  if (!summary) {
    summary = buildSummary(
      messages.slice(0, -RECENT_MESSAGE_COUNT),
      studentModel,
    );
    cacheSummary(cacheKey, summary);
  }

  return {
    summary,
    recentMessages: messages.slice(-RECENT_MESSAGE_COUNT),
    summarizedMessageCount: messages.length - RECENT_MESSAGE_COUNT,
    summaryVersion,
    summaryRefreshed,
  };
}
