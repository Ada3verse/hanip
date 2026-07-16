import { CONVERSATION_QA_SCENARIOS } from "@/app/dev/conversation-qa/scenarios";
import { runConversationQaScenario } from "./conversationQa";

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(`Chat state integration failed: ${message}`);
}

export function runChatStateIntegrationLocalTests() {
  for (const id of ["U", "V", "W"]) {
    const scenario = CONVERSATION_QA_SCENARIOS.find((item) => item.id === id);
    check(Boolean(scenario), `${id} scenario exists`);
    const result = runConversationQaScenario(scenario!);
    check(result.transcript.filter(({ role }) => role === "assistant").length === result.assistantDetails.length, `${id} assistant state accumulated`);
    check(
      result.status !== "fail",
      `${id} has no blocking issue (${result.issues.map(({ code }) => code).join(", ")})`,
    );
  }
  const scenarioU = CONVERSATION_QA_SCENARIOS.find(({ id }) => id === "U")!;
  const resultU = runConversationQaScenario(scenarioU);
  check(resultU.assistantDetails.every(({ suggestedReplies, response, meta }) =>
    suggestedReplies.length >= 2 || /한 단어로 답해도 돼|예:|___|적어 봐/.test(response) || meta?.learningStatus === "completed"
  ), "U always has active replies or an input guide");
  check(new Set(resultU.assistantDetails.map(({ response }) => response)).size === resultU.assistantDetails.length, "U questions change by hint stage");
}
