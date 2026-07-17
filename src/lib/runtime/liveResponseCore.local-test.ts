import { createLiveResponseCore, normalizeLiveOutput, RuntimeProviderError } from "./liveResponseCore";
import type { ChatApiRequest, ChatApiResponse } from "@/lib/types/chat";

const request: ChatApiRequest = { messages: [{ role: "user", content: "품사가 뭐야?" }] };
const plannedResponse: ChatApiResponse = {
  message: "Mock plan",
  suggestedReplies: [],
  meta: {
    concept: "품사", flowStage: "진단", evaluation: "unknown", nextAction: "ask", misconception: "", confidence: 0.5,
    learningStatus: "in_progress", completionEvidence: [], strategy: "discover",
  },
};

export async function runLiveResponseCoreLocalTests() {
  const check = (condition: boolean, label: string) => { if (!condition) throw new Error(`Live Response Core local test failed: ${label}`); };
  check(normalizeLiveOutput(JSON.stringify({ answer: "품사는 단어의 종류야.", suggestedReplies: ["알겠어", "알겠어", "예를 볼래", "더 볼래"] }))?.suggestedReplies.length === 3, "A contract normalization");
  check(normalizeLiveOutput(JSON.stringify({ answer: "sourceId: source-secret-123456", suggestedReplies: [] })) === null, "B provenance blocked");
  const keyLikeValue = ["sk", "proj", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
  check(normalizeLiveOutput(JSON.stringify({ answer: keyLikeValue, suggestedReplies: [] })) === null, "C key pattern blocked");
  let calls = 0;
  const retrying = createLiveResponseCore({
    client: { async create() { calls += 1; if (calls === 1) throw Object.assign(new Error("network failure"), { status: 503 }); return { output_text: JSON.stringify({ answer: "품사는 단어의 종류야.", suggestedReplies: [] }) }; } },
    createRequest: () => ({}),
  });
  const success = await retrying.generate({ request, plannedResponse });
  check(calls === 2 && success.message.includes("품사"), "D one retry then success");
  calls = 0;
  const rateLimited = createLiveResponseCore({
    client: { async create() { calls += 1; throw Object.assign(new Error("rate limit"), { status: 429 }); } },
    createRequest: () => ({}),
  });
  try { await rateLimited.generate({ request, plannedResponse }); } catch (error) { check(error instanceof RuntimeProviderError && error.category === "rate_limit", "E categorized rate limit"); }
  check(calls === 1, "F no retry for rate limit");
  return 6;
}
