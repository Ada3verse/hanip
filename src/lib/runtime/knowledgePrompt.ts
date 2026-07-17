import type { ChatApiResponse } from "@/lib/types/chat";

const MAX_EVIDENCE = 4;
const text = (value: unknown, max = 600) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function buildRuntimeKnowledgePayload(plannedResponse: ChatApiResponse) {
  const retrieval = plannedResponse.meta?.retrieval;
  return {
    knowledgeFound: !(retrieval?.reason.includes("knowledge_not_found") ?? true),
    strategy: retrieval?.reason.find((reason) => reason.startsWith("strategy_"))?.slice("strategy_".length) ?? null,
    evidence: retrieval?.usedEvidence.slice(0, MAX_EVIDENCE).map((item) => ({ role: item.role, content: text(item.content) })) ?? [],
  };
}
