import { adaptiveQuestionPrompt } from "@/lib/prompts/modules/adaptiveQuestion";
import { answerEvaluationPrompt } from "@/lib/prompts/modules/answerEvaluation";
import { basePrompt } from "@/lib/prompts/modules/base";
import { conceptGraphPrompt } from "@/lib/prompts/modules/conceptGraph";
import { dependencyPrompt } from "@/lib/prompts/modules/dependency";
import { learningModePrompt } from "@/lib/prompts/modules/learningMode";
import { learningGoalPrompt } from "@/lib/prompts/modules/learningGoal";
import { socraticEnginePrompt } from "@/lib/prompts/modules/socraticEngine";
import { studentMemoryPrompt } from "@/lib/prompts/modules/studentMemory";
import { teachingFlowPrompt } from "@/lib/prompts/modules/teachingFlow";
import { tutorStrategyPrompt } from "@/lib/prompts/modules/tutorStrategy";
import { dialoguePlannerPrompt } from "@/lib/prompts/modules/dialoguePlanner";
import { tutorPersonaPrompt } from "@/lib/prompts/modules/tutorPersona";
import { retrievalPrompt } from "@/lib/prompts/modules/retrieval";
import { evaluationPrompt } from "@/lib/prompts/modules/evaluation";
import { masteryPrompt } from "@/lib/prompts/modules/mastery";
import { hintPrompt } from "@/lib/prompts/modules/hint";
import { workedExamplePrompt } from "@/lib/prompts/modules/workedExample";
import { sessionSummaryPrompt } from "@/lib/prompts/modules/sessionSummary";
import { goalPrompt } from "@/lib/prompts/modules/goal";
import { misconceptionLearningPrompt } from "@/lib/prompts/modules/misconceptionLearning";
import { adaptivePrompt } from "@/lib/prompts/modules/adaptive";
import { runtimePrompt } from "@/lib/prompts/modules/runtime";

const systemPrompt = [
  basePrompt,
  learningModePrompt,
  learningGoalPrompt,
  teachingFlowPrompt,
  conceptGraphPrompt,
  studentMemoryPrompt,
  answerEvaluationPrompt,
  adaptiveQuestionPrompt,
  socraticEnginePrompt,
  dependencyPrompt,
  tutorStrategyPrompt,
  dialoguePlannerPrompt,
  retrievalPrompt,
  evaluationPrompt,
  masteryPrompt,
  hintPrompt,
  workedExamplePrompt,
  sessionSummaryPrompt,
  goalPrompt,
  misconceptionLearningPrompt,
  adaptivePrompt,
  tutorPersonaPrompt,
  runtimePrompt,
].join("\n\n");

export default systemPrompt;
