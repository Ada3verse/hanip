import { createChatFixture } from "@/lib/testing/chatFixtures";
import {
  getConceptDependency,
  getDependencyConceptName,
} from "@/lib/knowledge/dependency";
import { inferDependencyConceptId } from "@/lib/knowledge/dependency/dependencyEngine";
import { getCurrentRouteConcept } from "@/lib/knowledge/dependency/learningRoute";
import {
  calculateLearningState,
  inferLearningConceptId,
} from "@/lib/learningState/learningStateEngine";
import { calculateMastery, isMastered } from "@/lib/mastery/masteryEngine";
import {
  calculateHintState,
  createInitialHintState,
} from "@/lib/hint/hintEngine";
import {
  classifyUserIntent,
  createDialoguePlan,
  isExplicitTopicChange,
  type InterruptionState,
} from "@/lib/dialogue/dialoguePlanner";
import {
  applyTutorPersona,
  createTutorPersonaPlan,
} from "@/lib/persona/tutorPersona";
import type {
  ChatApiRequest,
  ChatApiResponse,
} from "@/lib/types/chat";
import { RUNTIME_STEPS } from "@/lib/runtime/types";
import {
  findKnowledgeBundle,
  findRelevantKnowledge,
  getEvaluationCompletionCriteria,
  misconceptionLibrary,
  retrieveKnowledge,
  toKnowledgeEvidenceBundle,
} from "@/lib/knowledge";
import { evaluateStudentAnswer } from "@/lib/evaluation/evaluationEngine";
import {
  calculateWorkedExampleState,
  isWorkedExampleActive,
} from "@/lib/workedExample/workedExampleEngine";
import {
  createSessionSummary,
  isSessionEndIntent,
} from "@/lib/sessionSummary/sessionSummaryEngine";
import { calculateGoalState } from "@/lib/goal/goalEngine";
import {
  getActiveMisconceptionProfile,
  updateMisconceptionProfiles,
} from "@/lib/misconceptionLearning/misconceptionLearningEngine";
import {
  createAdaptiveTurnStrategy,
  inferAdaptiveProfile,
} from "@/lib/adaptive/adaptiveEngine";
import {
  createEmptyRuntimeStudentModel,
  getStudentConceptState,
  hasUsedExplanation,
  recordExplanation,
  updateRuntimeStudentModel,
} from "@/lib/studentModel/studentModelEngine";
import { renderMockExplanation, selectExplanationPlan } from "@/lib/explanation/explanationStrategy";

const DIRECT_NOUN_PRONOUN_PATTERN = /명사.*대명사|대명사.*명사/;
const CONFUSION_PATTERN = /잘\s*모르|모르겠|이해가\s*안|무슨\s*말|헷갈|아직도\s*모르|^아니[요]?$/;

function findOriginalExplicitQuestion(request: ChatApiRequest) {
  return request.messages.find(({ role, content }) =>
    role === "user" && classifyUserIntent(content).some((intent) =>
      ["explain_request", "compare_request", "example_request", "definition_request"].includes(intent),
    ),
  )?.content ?? "";
}

function repliesForTeachingStrategy(strategy: string | undefined) {
  if (strategy === "COMPARE") return ["차이를 알겠어", "예문을 더 보고 싶어", "잘 모르겠어"];
  if (strategy === "EXAMPLE") return ["예를 만들어 볼래", "예문을 더 보고 싶어", "아직 헷갈려"];
  if (strategy === "QUIZ") return ["문제 풀어볼래", "한 번 더 설명해줘", "아직 모르겠어"];
  if (strategy === "GUIDED_DISCOVERY") return ["힌트를 따라가 볼래", "더 쉬운 예가 필요해", "아직 모르겠어"];
  return ["이해했어", "다른 예도 보고 싶어", "잘 모르겠어"];
}

function applyDirectAnswerFirst(response: ChatApiResponse, request: ChatApiRequest) {
  const users = request.messages.filter(({ role }) => role === "user");
  const lastUser = users.at(-1)?.content.trim() ?? "";
  const originalQuestion = findOriginalExplicitQuestion(request);
  const nounPronounRequest = DIRECT_NOUN_PRONOUN_PATTERN.test(lastUser);
  const usedNounPronounExample = hasUsedExplanation(
    request.studentModel?.studentProfile,
    "명사와 대명사",
    /민지/,
  ) || Boolean(request.studentModel?.studentProfile?.explanationHistory.some(({ conceptId }) => conceptId === "명사와 대명사"));
  const confusion = CONFUSION_PATTERN.test(lastUser);
  const failureCount = Math.max(
    request.studentModel?.consecutiveUnknownResponses ?? 0,
    users.slice(1).filter(({ content }) => CONFUSION_PATTERN.test(content)).length,
  );
  const bridgeWasGiven = request.messages.some(({ role, content }) =>
    role === "assistant" && /명사와 대명사를 이해하려면.*품사|먼저 품사/.test(content),
  );

  if (/오늘\s*날씨|날씨\s*(?:어때|알려)/.test(lastUser)) {
    response.message = "날씨는 한잎의 국어 문법 학습 범위 밖이라 정확히 알려 주기 어려워. 하던 문법 질문으로 돌아갈까?";
    response.suggestedReplies = ["문법 학습 계속하기", "다른 문법 질문하기"];
    return;
  }
  if (/수사/.test(lastUser) && /(?:수\s*)?관형사/.test(lastUser) && /구분|차이|달라|어떻게/.test(lastUser)) {
    const strategy = response.meta?.strategy;
    const lead = strategy === "challenge"
      ? "차이를 짧게 정리한 뒤 **새 문장에 적용**해 보자. "
      : strategy === "guide"
        ? "대표 **예문에서 판단 기준과 이유**를 함께 확인해 보자. "
      : strategy === "review"
        ? "**이전에 헷갈렸던 기준**을 다른 예시로 다시 확인해 볼게. "
        : strategy === "mastery"
          ? "핵심 차이를 확인한 뒤 **교과서 수준의 새 문장에 적용**해 보자. "
          : "";
    const example = strategy === "review" ? "‘사과 하나’와 ‘한 사과’" : "‘학생이 둘 왔다’와 ‘두 학생이 왔다’";
    response.message = `${lead}**수사**는 문장에서 체언 자리를 차지하고 조사가 붙을 수 있지만, **수 관형사**는 뒤의 명사를 직접 꾸며. ${example}에서 뒤의 명사를 직접 꾸미는 말은 어느 쪽일까?`;
    response.suggestedReplies = strategy === "review" ? ["한", "하나", "잘 모르겠어"] : ["두", "둘", "잘 모르겠어"];
  } else if (nounPronounRequest) {
    response.message = usedNounPronounExample
      ? "같은 내용을 다른 예로 볼게. **명사**는 이름을 직접 나타내고, **대명사**는 그 이름을 대신해. ‘선생님이 오셨다’와 ‘그분이 오셨다’에서 이름을 대신하는 말은 무엇일까?"
      : /예문|예시/.test(lastUser)
      ? "명사는 사람·사물·장소 등의 **이름을 직접 나타내는 말**이고, 대명사는 그런 명사를 **대신하는 말**이야.\n\n1. 민지는 책을 읽었다. → ‘민지’는 사람의 이름을 나타내는 명사야.\n2. 그는 책을 읽었다. → ‘그’는 ‘민지’를 대신하는 대명사야.\n\n둘의 가장 큰 차이를 한 문장으로 말해 볼래?"
      : "**명사**는 이름을 직접 나타내고, **대명사**는 이미 나온 명사를 대신하는 말이야. ‘민지가 왔다’와 ‘그가 왔다’에서 ‘그’는 ‘민지’를 대신해. 둘의 가장 큰 차이를 한 문장으로 말해 볼래?";
    response.suggestedReplies = usedNounPronounExample
      ? ["그분", "선생님", "잘 모르겠어"]
      : ["차이가 보여", "예문을 더 보고 싶어", "아직 헷갈려"];
  } else if (/대명사/.test(lastUser) && /왜[^?？]{0,20}필요|필요한\s*이유/.test(lastUser)) {
    response.message = "**대명사**는 이미 나온 명사를 반복하지 않고 대신 가리키기 위해 필요해. ‘민지는 책을 읽고, 그는 웃었다’에서 ‘그’는 앞의 민지를 대신해. 그럼 ‘그’는 왜 대명사일까?";
    response.suggestedReplies = ["민지를 대신하기 때문이야", "사람 이름이기 때문이야", "아직 헷갈려"];
  } else if (confusion && DIRECT_NOUN_PRONOUN_PATTERN.test(originalQuestion) && failureCount < 2) {
    response.message = "더 쉽게 말하면 **명사**는 이름을 직접 말하고, **대명사**는 이미 나온 이름을 대신해. ‘지우가 웃었다’의 ‘지우’와 ‘그가 웃었다’의 ‘그’를 비교하면, 이름을 대신하는 말은 어느 쪽일까?";
    response.suggestedReplies = ["그", "지우", "아직 헷갈려"];
  } else if (confusion && DIRECT_NOUN_PRONOUN_PATTERN.test(originalQuestion) && failureCount >= 2) {
    response.message = "명사와 대명사의 차이를 보려면 둘이 모두 **품사**, 즉 단어의 종류라는 점을 먼저 확인하면 좋아. ‘민지’와 ‘그’는 둘 다 사람을 가리키는 단어라고 볼 수 있을까?";
    response.suggestedReplies = ["둘 다 사람을 가리켜", "한쪽만 사람을 가리켜", "잘 모르겠어"];
  } else if (bridgeWasGiven && DIRECT_NOUN_PRONOUN_PATTERN.test(originalQuestion) && !confusion) {
    response.message = "품사가 단어의 종류라는 점을 확인했으니 원래 질문으로 돌아갈게. **명사**는 이름을 직접 나타내고 **대명사**는 그 이름을 대신해. ‘민지가 왔다’와 ‘그가 왔다’에서 이름을 대신하는 말은 무엇일까?";
    response.suggestedReplies = ["그", "민지", "잘 모르겠어"];
  } else if (/형태소(?:가|는)?\s*(?:뭐|무엇)/.test(lastUser)) {
    response.message = "**형태소**는 뜻을 가진 가장 작은 말의 단위야. 예를 들어 ‘학생들’은 사람을 뜻하는 ‘학생’과 여럿을 뜻하는 ‘들’로 나눌 수 있어. ‘학생들’에서 여럿이라는 뜻을 더하는 부분은 무엇일까?";
    response.suggestedReplies = ["들", "학생", "아직 헷갈려"];
  } else if (confusion && /형태소/.test(originalQuestion) && failureCount < 2) {
    response.message = "더 쉽게 보면, 긴 말을 뜻이 있는 작은 조각으로 나눈 것이 형태소야. ‘책들’에서 책을 뜻하는 ‘책’과 여럿을 뜻하는 ‘들’ 중 여럿을 더하는 조각은 어느 말일까?";
    response.suggestedReplies = ["들", "책", "아직 헷갈려"];
  } else if (/품사가?\s*(?:뭐|무엇)/.test(lastUser)) {
    const progressLead = request.studentModel?.priorProgressLoaded
      ? request.studentModel.priorConceptStatus === "needs_review"
        ? "전에 헷갈렸던 내용을 참고해 바로 핵심부터 보면, "
        : "이전에 공부한 내용을 바탕으로 바로 핵심부터 보면, "
      : "";
    if ((request.learningGoal ?? request.studentModel?.learningGoal) === "exam") {
      response.message = "**품사**는 단어를 문법적 성질에 따라 나눈 갈래야. 시험에서는 뜻만 보고 같은 품사라고 고르는 **함정**을 자주 헷갈려. ‘사람’과 ‘학생’은 뜻이 비슷하다는 이유만으로 품사가 같다고 판단해도 될까?";
      response.suggestedReplies = ["뜻만으로는 부족해", "뜻만 보면 돼", "잘 모르겠어"];
    } else if ((request.learningGoal ?? request.studentModel?.learningGoal) === "practice") {
      response.message = "**품사**는 단어의 문법적 종류야. 바로 새 예문에 적용해 보자. ‘새 가방을 샀다’에서 ‘새’는 어느 품사일까?";
      response.suggestedReplies = ["관형사", "명사", "잘 모르겠어"];
    } else {
      response.message = `${progressLead}**품사**는 단어를 형태·기능·의미 같은 문법적 성질에 따라 나눈 갈래야. 예를 들어 ‘사람’, ‘예쁘다’, ‘빨리’는 문법적 성질이 달라 서로 다른 품사로 나눠. 세 단어가 서로 다른 종류라는 점은 이해되니?`;
      response.suggestedReplies = request.studentModel?.priorProgressLoaded
        ? ["형태", "기능", "의미", "잘 모르겠어"]
        : ["이해돼", "기준을 더 알고 싶어", "잘 모르겠어"];
    }
  } else if (/조사는?\s*왜\s*단어/.test(lastUser)) {
    response.message = "조사는 혼자 쓰이기 어렵지만 체언 뒤에 붙어 다른 말과의 **문법적 관계**를 나타내는 하나의 품사라서 단어로 인정해. ‘학생이’에서 ‘이’는 ‘학생’이 문장의 주어임을 나타내지. 이 설명 뒤에 하던 학습으로 돌아갈까?";
    response.suggestedReplies = ["하던 학습으로 돌아갈래", "조사를 더 알고 싶어"];
  } else if (/조사(?:가|는)?\s*(?:뭐|무엇)/.test(lastUser)) {
    response.message = "**조사**는 주로 체언 뒤에 붙어 그 말과 다른 말의 문법적 관계를 나타내는 단어야. ‘학생이 웃는다’에서 ‘이’는 ‘학생’이 주어임을 드러내. 그럼 ‘학생이’에서 문법적 관계를 나타내는 말은 무엇일까?";
    response.suggestedReplies = ["이", "학생", "아직 헷갈려"];
  } else {
    return;
  }

  if (response.meta?.dialoguePlan) {
    const plan = response.meta.dialoguePlan;
    if (plan.directAnswerRequired) response.meta.concept = plan.activeConcept;
    if (nounPronounRequest) {
      plan.activeConcept = "명사와 대명사";
      plan.action = "explain";
      plan.responseMode = "direct_answer_then_check";
      plan.directAnswerRequired = true;
      plan.requestedExampleCount = /예문|예시/.test(lastUser) ? 2 : 0;
      plan.requestedComparisonTargets = ["명사", "대명사"];
    } else if (confusion && DIRECT_NOUN_PRONOUN_PATTERN.test(originalQuestion)) {
      plan.activeConcept = "명사와 대명사";
      plan.action = failureCount >= 2 ? "bridge" : "explain";
      plan.responseMode = failureCount >= 2 ? "bridge_to_prerequisite" : "same_concept_reexplain";
      plan.prerequisiteAllowed = failureCount >= 2;
      plan.originalQuestion = originalQuestion;
      plan.suspendedConcept = failureCount >= 2 ? "명사와 대명사" : null;
    }
    const asksWhyPronounIsNeeded = /대명사/.test(lastUser)
      && /왜[^?？]{0,20}필요|필요한\s*이유/.test(lastUser);
    if (plan.directAnswerRequired && !request.studentModel?.priorProgressLoaded && !asksWhyPronounIsNeeded && !usedNounPronounExample) {
      response.suggestedReplies = repliesForTeachingStrategy(plan.teachingStrategy);
    }
  }
  const previousHintLevel = Math.max(
    0,
    ...Object.values(request.studentModel?.hintStates ?? {}).map(({ hintLevel }) => hintLevel),
  );
  if (response.meta?.hintState && response.meta.hintState.hintLevel > previousHintLevel + 1) {
    response.meta.hintState.hintLevel = Math.min(5, previousHintLevel + 1) as typeof response.meta.hintState.hintLevel;
    if (response.meta.learningState?.hint) response.meta.learningState.hint.hintLevel = response.meta.hintState.hintLevel;
  }
}

export function getConceptQuestionAndReplies(
  conceptId: string,
  consecutiveSuggestedReplyUses = 0,
) {
  const definitions: Record<string, { question: string; replies: string[] }> = {
    morpheme: {
      question: "‘학생들’은 ‘학생’과 ‘들’처럼 뜻을 가진 부분으로 나눌 수 있을까?",
      replies: ["학생과 들", "나누기 어려워", "잘 모르겠어"],
    },
    word: {
      question: "‘학생’은 문장에서 하나의 단어로 쓰였을까?",
      replies: ["한 단어", "둘 이상의 단어", "잘 모르겠어"],
    },
    "parts-of-speech-overview": {
      question: "‘사람’, ‘예쁘다’, ‘빨리’는 같은 종류의 단어일까, 서로 다른 종류일까?",
      replies: ["같은 종류", "다른 종류", "잘 모르겠어"],
    },
    substantive: {
      question: "명사·대명사·수사 중 체언에 포함되는 말은 어느 것일까?",
      replies: ["세 가지 모두", "명사만", "잘 모르겠어"],
    },
    numeral: {
      question: "‘학생이 둘 왔다’에서 체언 자리에 있는 수 표현은 어느 말일까?",
      replies: ["둘", "학생", "잘 모르겠어"],
    },
    "numeral-vs-numeral-determiner": {
      question: "‘두 학생’에서 ‘두’가 꾸미는 말은 무엇일까?",
      replies: ["학생", "두", "잘 모르겠어"],
    },
    particle: {
      question: "‘학생이’에서 조사에 해당하는 말은 어느 것일까?",
      replies: ["이", "학생", "잘 모르겠어"],
    },
    "sentence-component": {
      question: "‘학생이 웃는다’에서 ‘학생’이 맡는 문장 성분은 무엇일까?",
      replies: ["주어", "목적어", "잘 모르겠어"],
    },
    "parts-of-speech-vs-sentence-component": {
      question: "품사는 단어의 종류이고, 문장 성분은 문장에서 맡는 무엇일까?",
      replies: ["역할", "모양", "잘 모르겠어"],
    },
  };
  const selected = definitions[conceptId] ?? definitions["parts-of-speech-overview"];
  if (consecutiveSuggestedReplyUses >= 2) {
    return {
      question: "판단할 때 본 기준을 한 단어로 말해 볼래?",
      replies: [],
    };
  }
  if (consecutiveSuggestedReplyUses === 1) {
    if (conceptId === "word") {
      return {
        question: "‘학생’ 뒤에 조사 ‘이’를 붙인 ‘학생이’에서 ‘학생’은 한 단어일까?",
        replies: ["한 단어", "둘 이상의 단어", "잘 모르겠어"],
      };
    }
    return {
      question: `${selected.question.replace(/[?？]$/, "")} 판단 기준도 함께 골라 볼래?`,
      replies: conceptId.includes("numeral")
        ? ["뒤 명사 수식", "조사 결합", "잘 모르겠어"]
        : ["형태", "기능", "의미", "잘 모르겠어"],
    };
  }
  return selected;
}

function getMorphemeHelp(unknownCount: number) {
  if (unknownCount >= 4) return {
    message: "형태소는 뜻을 가진 가장 작은 말의 단위야. 이 기준을 기억하고 원래 목표와 연결해 볼게. ‘두 학생’에서 ‘두’가 바로 뒤의 ‘학생’을 꾸미고 있을까?",
    replies: ["학생을 꾸며", "꾸미지 않아", "잘 모르겠어"],
    hintLevel: 3 as const,
  };
  if (unknownCount === 3) return {
    message: "여럿이라는 뜻을 더하는 부분은 ‘들’이야. 형태소는 뜻을 가진 가장 작은 말의 단위라고 보면 돼. ‘학생들’을 두 부분으로 나누면 어떻게 될까?",
    replies: ["학생 + 들", "학생들 하나", "잘 모르겠어"],
    hintLevel: 3 as const,
  };
  if (unknownCount === 2) return {
    message: "‘학생들’은 ‘학생’과 ‘들’로 나눌 수 있어. 두 부분 모두 뜻을 가지므로 형태소야. 그럼 여럿이라는 뜻을 더하는 부분은 무엇일까?",
    replies: ["학생", "들", "잘 모르겠어"],
    hintLevel: 2 as const,
  };
  return {
    message: "‘학생들’에서 ‘학생’은 사람을 뜻하고, ‘들’은 여럿이라는 뜻을 더해. 두 부분으로 나누면 어느 쪽일까?",
    replies: ["학생 + 들", "학생들 하나", "잘 모르겠어"],
    hintLevel: 1 as const,
  };
}

function createMockChatResponseCore(
  request: ChatApiRequest,
): ChatApiResponse {
  const model = request.studentModel ?? {};
  const mode = request.learningMode ?? model.learningMode ?? "learn";
  const goal = request.learningGoal ?? model.learningGoal ?? "concept";
  const lastUserMessage = [...request.messages]
    .reverse()
    .find(({ role }) => role === "user")?.content.trim() ?? "";
  const learningState = calculateLearningState({
    studentModel: model,
    learningProgress: request.learningProgress,
    learningMode: mode,
    learningGoal: goal,
  });
  const strategy = learningState.tutorStrategy;
  const dialoguePlan = createDialoguePlan({
    learningState,
    studentModel: model,
    messages: request.messages,
  });
  const hasCurrentSessionSignal =
    (model.lastEvaluation !== null && model.lastEvaluation !== undefined) ||
    (model.hintLevel ?? 0) > 0 ||
    model.learningStatus === "completed";

  if (model.learningRoute) {
    const currentId = getCurrentRouteConcept(model.learningRoute);
    const dependency = currentId ? getConceptDependency(currentId) : null;
    if (currentId && dependency) {
      const currentName = getDependencyConceptName(currentId);
      const isQuestionInput = /[?？]|뭐|어떻게|왜/.test(lastUserMessage);
      const answeringCurrent =
        inferDependencyConceptId(model.currentConcept) === currentId &&
        !isQuestionInput;
      const detectedQuestionConcept = inferDependencyConceptId(lastUserMessage);
      const unrelatedQuestion =
        isQuestionInput &&
        Boolean(detectedQuestionConcept) &&
        detectedQuestionConcept !== currentId &&
        !isExplicitTopicChange(lastUserMessage);
      if (unrelatedQuestion) {
        const interruption: InterruptionState = {
          interruptedConcept: currentName,
          interruptedQuestionPurpose: dialoguePlan.questionPurpose,
          interruptedRequiredFocus: dialoguePlan.requiredFocus,
          returnPending: true,
        };
        const focusQuestion = getConceptQuestionAndReplies(
          currentId,
          model.consecutiveSuggestedReplyUses ?? 0,
        );
        return createChatFixture({
          message: `그 질문은 지금 내용과 따로 짧게 살펴볼 수 있어. 이제 하던 ${interruption.interruptedConcept} 이야기로 돌아가서, ${focusQuestion.question}`,
          concept: interruption.interruptedConcept,
          evaluation: "unknown",
          nextAction: `${interruption.interruptedQuestionPurpose} 후 현재 경로 복귀`,
          suggestedReplies: focusQuestion.replies,
          strategy,
          flowStage: "진단",
        });
      }

      const cannotAnswer = /몰라|모르겠|이해가 안/.test(lastUserMessage);
      if (!answeringCurrent || cannotAnswer) {
        if (currentId === "morpheme" && cannotAnswer) {
          const help = getMorphemeHelp(Math.max(1, model.consecutiveUnknownResponses ?? 0));
          return createChatFixture({
            message: help.message,
            concept: currentName,
            evaluation: "unknown",
            nextAction: "형태소 도움 단계를 높여 확인",
            suggestedReplies: help.replies,
            hintLevelUsed: help.hintLevel,
            strategy,
            flowStage: "진단",
          });
        }
        const previousAssistant = [...request.messages]
          .reverse()
          .find(({ role }) => role === "assistant")?.content ?? "";
        const conceptPrompt = getConceptQuestionAndReplies(
          currentId,
          model.consecutiveSuggestedReplyUses ?? 0,
        );
        const question = currentId === "numeral-vs-numeral-determiner"
          ? (model.hintLevel ?? 0) >= 2
            ? "수 관형사는 뒤의 명사를 직접 꾸며. ‘두 학생’에서 명사는 어느 말일까?"
            : (model.hintLevel ?? 0) === 1
              ? "‘두’ 바로 뒤의 말은 ‘학생’이야; 한 단어로 답해도 돼: ‘두’가 꾸미는 대상은 어느 말일까?"
              : conceptPrompt.question
          : currentId === "morpheme"
            ? previousAssistant.includes("학생들")
              ? "‘학생들’은 ‘학생’과 ‘들’로 나눌 수 있어. 두 부분 모두 뜻을 조금씩 가지고 있을까?"
              : "먼저 형태소부터 확인해 볼게. ‘학생들’에서 뜻을 가진 가장 작은 부분을 나눠 볼 수 있을까?"
            : currentId === "word" && previousAssistant.includes("하나의 단어")
              ? "‘학생이’에서 ‘학생’ 뒤에는 조사 ‘이’가 붙어 있어. 이때 ‘학생’만 한 단어로 볼 수 있을까?"
            : conceptPrompt.question;
        return createChatFixture({
          message: cannotAnswer
            ? `조금 더 쉽게 볼게. ${question}`
            : question,
          concept: currentName,
          evaluation: "unknown",
          nextAction: dialoguePlan.questionPurpose,
          suggestedReplies: conceptPrompt.replies,
          strategy,
          flowStage: "진단",
        });
      }

      const nextId = model.learningRoute.route[
        model.learningRoute.currentIndex + 1
      ];
      const nextDependency = nextId ? getConceptDependency(nextId) : null;
      const recentAssistant = [...request.messages]
        .reverse()
        .find(({ role }) => role === "assistant")?.content ?? "";
      const nextQuestion = nextId === "word"
        ? "그럼 ‘학생’은 문장에서 하나의 단어로 쓰였을까?"
        : nextId === model.learningRoute.targetConcept
          ? "이제 원래 질문으로 돌아가 볼게. ‘두 학생’의 ‘두’는 뒤의 어떤 말을 꾸미고 있을까?"
          : nextDependency?.bridgeQuestion ??
            ((recentAssistant.includes("새 예문") || recentAssistant.includes("직접 꾸미"))
              ? "이번에는 ‘학생이 둘 왔다’의 ‘둘’에 조사를 붙일 수 있는지 말해 볼래?"
              : "이 기준을 새 예문에도 적용할 수 있을까?");
      return createChatFixture({
        message: `${dependency.bridgeExplanation} ${nextQuestion}`,
        concept: currentName,
        evaluation: "correct",
        nextAction:
          nextId ? "다음 학습 경로 개념으로 이동" : "학습 경로 완료",
        suggestedReplies: ["응", "아니", "잘 모르겠어"],
        strategy,
        flowStage: currentId === model.learningRoute.targetConcept ? "적용" : "분류기준",
      });
    }
  }

  if (model.activePrerequisite) {
    const dependency = getConceptDependency(model.activePrerequisite);
    if (dependency) {
      const answeringBridge =
        inferDependencyConceptId(model.currentConcept) ===
        model.activePrerequisite;
      const cannotAnswer = /몰라|모르겠|이해가 안/.test(lastUserMessage);
      if (!answeringBridge || cannotAnswer) {
        return createChatFixture({
          message: dependency.bridgeQuestion,
          concept: getDependencyConceptName(dependency.id),
          evaluation: "unknown",
          nextAction: "선수 개념 브리지 확인",
          suggestedReplies: ["알고 있어", "잘 모르겠어"],
          strategy,
          flowStage: "진단",
        });
      }

      const returnConcept = model.prerequisiteReturnConcept ?? "원래 개념";
      const returnQuestion = returnConcept.includes("numeral")
        ? "이제 원래 질문으로 돌아가서, ‘두 사람’의 ‘두’는 뒤의 무엇을 꾸미고 있을까?"
        : "이제 원래 질문으로 돌아가서, ‘사람’, ‘예쁘다’, ‘빨리’는 같은 종류의 단어일까?";
      return createChatFixture({
        message: `${dependency.bridgeExplanation} ${returnQuestion}`,
        concept: getDependencyConceptName(dependency.id),
        evaluation: "correct",
        nextAction: "선수 개념 완료 후 원래 개념 복귀",
        suggestedReplies: ["같아", "달라", "잘 모르겠어"],
        strategy,
        flowStage: "분류기준",
      });
    }
  }

  if (model.learningStatus === "ready_to_complete") {
    return createChatFixture({
      message:
        "뒤의 명사를 직접 꾸미면 **수 관형사**, 조사와 결합하거나 체언 자리에 서면 **수사**라는 기준을 새 예문에도 잘 적용했어.\n이 기준으로 두 품사를 구분할 수 있어.",
      concept: "수사와 수 관형사",
      evaluation: "correct",
      nextAction: "완료 정리",
      suggestedReplies: [
        "새 문제로 확인할래",
        "다른 개념을 물어볼래",
        "오늘은 여기까지",
      ],
      learningStatus: "completed",
      completionEvidence: [
        "뒤 명사 수식과 조사 결합을 판별 기준으로 설명함",
        "처음 보는 새 예문 ‘네 권’에 기준을 적용함",
      ],
      strategy,
      flowStage: "정리",
    });
  }

  if ((model.consecutiveSuggestedReplyUses ?? 0) >= 2) {
    return createChatFixture({
      message: "그 판단에서 사용한 **기준**을 한 단어로 짧게 말해 볼래?",
      concept: model.currentConcept || "품사",
      evaluation: "partial_correct",
      nextAction: "이유와 기준 확인",
      strategy,
      flowStage: "분류기준",
    });
  }

  if ((model.hintLevel ?? 0) >= 3) {
    return createChatFixture({
      message:
        "수 관형사는 **뒤의 명사를 직접 꾸미는 말**이야. ‘세 사람’의 ‘세’도 뒤의 명사를 꾸미고 있을까?",
      concept: "수사와 수 관형사",
      evaluation: "unknown",
      nextAction: "꾸미는 기준 확인",
      hintLevelUsed: 3,
      suggestedReplies: ["응", "아니", "잘 모르겠어"],
      strategy,
      flowStage: "비교",
    });
  }

  if (/수 관형사는 수사 뒤/.test(lastUserMessage)) {
    return createChatFixture({
      message:
        "수와 관련된 말이라는 점은 잘 찾았어. 수 관형사는 뒤의 명사를 직접 꾸며 주는 말이야. ‘세 사람’에서 ‘세’는 어떤 말을 꾸미고 있을까?",
      concept: "수 관형사",
      evaluation: "misconception",
      nextAction: "뒤 명사를 꾸미는 기준 확인",
      misconception: "numeral-determiner-position",
      strategy: "review",
      flowStage: "비교",
    });
  }

  if (/명사는 사람을 나타내/.test(lastUserMessage)) {
    return createChatFixture({
      message:
        "사람을 가리킨다는 점은 맞아. 명사는 사람뿐 아니라 사물, 장소, 개념의 이름도 나타내. 그럼 ‘학교’도 명사라고 볼 수 있을까?",
      concept: "명사",
      evaluation: "partial_correct",
      nextAction: "범위 보완 확인",
      suggestedReplies: ["명사야", "명사가 아니야", "잘 모르겠어"],
      strategy,
      flowStage: "대표품사",
    });
  }

  if (/무엇을 나타낸다는 말/.test(lastUserMessage)) {
    return createChatFixture({
      message:
        "‘나타낸다’는 말은 무엇을 가리키거나 어떤 뜻을 담는지 본다는 뜻이야. 예를 들어 ‘학생’은 사람을, ‘공부하다’는 행동을 말해. 둘은 같은 것을 말하고 있을까?",
      concept: "의미",
      nextAction: "쉬운 설명 후 차이 확인",
      suggestedReplies: ["같아", "달라", "잘 모르겠어"],
      strategy,
    });
  }

  if (lastUserMessage === "수사요.") {
    return createChatFixture({
      message:
        "수사의 뜻은 알고 있구나. 이번에는 ‘두’가 뒤의 명사 ‘학생’을 꾸미는지 확인해 보자. ‘두’는 ‘학생’을 꾸미고 있을까?",
      concept: "수사와 수 관형사",
      evaluation: "apply_fail",
      nextAction: "꾸미는 기준 적용 확인",
      suggestedReplies: ["꾸며", "꾸미지 않아", "잘 모르겠어"],
      strategy: "discover",
      flowStage: "적용",
    });
  }

  if (/품사와 문장 성분/.test(lastUserMessage)) {
    return createChatFixture({
      message:
        "품사는 **단어의 종류**이고 문장 성분은 **문장에서 맡는 역할**이야. ‘학생이 웃는다’와 ‘학생을 만났다’에서 같은 단어 ‘학생’은 주어와 목적어가 되지. 두 문장의 ‘학생’은 품사도 달라질까?",
      concept: "품사와 문장 성분",
      nextAction: "두 개념 구분 확인",
      suggestedReplies: ["같아", "달라", "잘 모르겠어"],
      strategy,
      flowStage: "비교",
    });
  }

  if (/몰라|모르겠|이해가 안 돼/.test(lastUserMessage)) {
    const hint = Math.min(3, Math.max(1, model.hintLevel ?? 1)) as 1 | 2 | 3;
    return createChatFixture({
      message:
        hint >= 2
          ? "수 관형사는 뒤의 명사를 직접 꾸며 줘. ‘두 학생’에서 ‘두’는 무엇을 꾸미고 있을까?"
          : "괜찮아. ‘두’ 뒤에 어떤 말이 오는지 먼저 볼까?",
      concept: model.currentConcept || "수사와 수 관형사",
      nextAction: "쉬운 예시 확인",
      hintLevelUsed: hint,
      suggestedReplies: ["학생", "두", "잘 모르겠어"],
      strategy: "guide",
      flowStage: "비교",
    });
  }

  if (/다른 종류/.test(lastUserMessage)) {
    return createChatFixture({
      message: "다르게 본 점은 좋아. 어떤 **기준** 때문에 다른 종류라고 생각했어?",
      concept: model.currentConcept || "품사",
      evaluation: "partial_correct",
      nextAction: "판단 이유 확인",
      strategy,
      flowStage: "분류기준",
    });
  }

  if (/수사와 수 관형사/.test(lastUserMessage)) {
    if (strategy === "mastery") {
      return createChatFixture({
        message:
          "교과서 수준의 새 문장에 적용해 보자. ‘넷만 남았다’의 ‘넷’을 조사 결합과 체언의 자리로 설명할 수 있을까?",
        concept: "수사와 수 관형사",
        evaluation: "correct",
        nextAction: "심화 연결과 전이 적용",
        strategy,
        flowStage: "적용",
      });
    }
    if (strategy === "review") {
      return createChatFixture({
        message:
          "이전에 헷갈린 판단을 다른 예시로 다시 볼게. ‘사과 하나를 먹었다’의 ‘하나’는 무엇을 근거로 판별할까?",
        concept: "수사와 수 관형사",
        evaluation: "misconception",
        nextAction: "오개념 비교 복습",
        strategy,
        flowStage: "비교",
      });
    }
    if (strategy === "challenge") {
      return createChatFixture({
        message:
          "새 문장과 반례에 도전해 보자. ‘첫 번째 학생’의 ‘첫’을 수사라고 하면 어떤 기준에 맞지 않을까?",
        concept: "수사와 수 관형사",
        evaluation: model.lastEvaluation === "correct" ? "correct" : "unknown",
        nextAction: "새 문제 전이 적용",
        strategy,
        flowStage: "적용",
      });
    }
    if (strategy === "guide") {
      return createChatFixture({
        message:
          "예문으로 판단 기준과 이유를 확인해 보자. ‘두 학생’의 ‘두’가 수 관형사인 근거는 무엇일까?",
        concept: "수사와 수 관형사",
        evaluation: "partial_correct",
        nextAction: "예문 판단 기준과 이유 확인",
        strategy,
        flowStage: "분류기준",
      });
    }
    if (mode === "review") {
      return createChatFixture({
        message:
          "핵심 기준을 짧게 확인할게. ‘학생이 둘 왔다’와 ‘두 학생이 왔다’에서 뒤의 명사를 꾸미는 표현은 어느 쪽일까?",
        concept: "수사와 수 관형사",
        nextAction: "복습 기준 비교 확인",
        suggestedReplies: ["둘", "두", "잘 모르겠어"],
        strategy,
        flowStage: "비교",
      });
    }
    return createChatFixture({
      message:
        "먼저 생각을 확인해 볼게. ‘학생이 둘 왔다’와 ‘두 학생이 왔다’에서 뒤의 명사를 꾸미는 수 표현은 같은 품사라고 생각해?",
      concept: "수사와 수 관형사",
      nextAction: "진단 관찰 질문",
      suggestedReplies: ["같은 품사", "다른 품사", "잘 모르겠어"],
      strategy,
      flowStage: "진단",
    });
  }

  if (/품사가\s*뭐(?:예요|야)|^품사$/.test(lastUserMessage)) {
    if (!hasCurrentSessionSignal && model.priorConceptStatus === "learning") {
      return createChatFixture({
        message:
          "이전에 보던 판단 기준부터 짧게 이어 갈게. 품사를 판단할 때 **형태·기능·의미** 중 무엇을 먼저 살펴봤는지 기억나?",
        concept: "품사",
        nextAction: "이전 판단 기준 확인",
        suggestedReplies: ["형태", "기능", "의미", "잘 모르겠어"],
        strategy: "guide",
        flowStage: "분류기준",
      });
    }
    if (
      !hasCurrentSessionSignal &&
      model.priorConceptStatus === "needs_review"
    ) {
      return createChatFixture({
        message:
          "전에 헷갈렸던 기준부터 다시 비교해 볼게. 뜻이 비슷하면 언제나 같은 품사라고 판단해도 될까?",
        concept: "품사",
        nextAction: "반복 오개념 비교 복습",
        suggestedReplies: ["항상 같아", "다를 수 있어", "잘 모르겠어"],
        misconception: model.misconceptions?.[0] ?? "",
        strategy: "review",
        flowStage: "비교",
      });
    }
    if (!hasCurrentSessionSignal && model.priorConceptStatus === "understood") {
      return createChatFixture({
        message:
          "기초 정의 대신 새 문장에 적용해 보자. ‘새 가방을 샀다’에서 ‘새’의 품사와 판단 기준을 짧게 적어 봐. 예: 관형사 / 뒤의 명사를 꾸밈",
        concept: "품사",
        nextAction: "새 문장 전이 적용",
        suggestedReplies: [],
        strategy: "challenge",
        flowStage: "적용",
      });
    }
    if (goal === "exam") {
      return createChatFixture({
        message:
          "시험에서 자주 헷갈리는 함정부터 확인할게. 뜻이 비슷한 단어는 언제나 같은 품사일까?",
        concept: "품사",
        nextAction: "시험 혼동 기준 비교",
        suggestedReplies: ["항상 같아", "다를 수 있어", "잘 모르겠어"],
        strategy,
      });
    }
    if (goal === "practice") {
      return createChatFixture({
        message: "새 예문에 적용해 보자. ‘빨리 달린다’에서 ‘빨리’는 어느 품사일까?",
        concept: "품사",
        nextAction: "문제 적용 판별",
        suggestedReplies: ["명사", "부사", "잘 모르겠어"],
        strategy,
        flowStage: "적용",
      });
    }
    if (goal === "review") {
      return createChatFixture({
        message:
          "이전에 헷갈린 형태·기능·의미 기준을 다시 확인할게. 품사를 뜻만 보고 정해도 될까?",
        concept: "품사",
        nextAction: "오개념 기준 재확인 복습",
        suggestedReplies: ["그래", "함께 봐야 해", "잘 모르겠어"],
        strategy: "review",
        flowStage: "분류기준",
      });
    }
    return createChatFixture({
      message:
        "설명하기 전에 생각을 확인해 볼게. ‘사람’, ‘예쁘다’, ‘빨리’는 같은 종류의 단어라고 생각해?",
      concept: "품사",
      nextAction: "진단 관찰 비교 확인",
      suggestedReplies: ["같은 종류", "다른 종류", "잘 모르겠어"],
      strategy,
    });
  }

  const fallbackConcept = isExplicitTopicChange(lastUserMessage)
    ? inferDependencyConceptId(lastUserMessage) ?? "parts-of-speech-overview"
    : inferDependencyConceptId(model.currentConcept) ??
      inferDependencyConceptId(lastUserMessage) ??
      "parts-of-speech-overview";
  const fallback = getConceptQuestionAndReplies(
    fallbackConcept,
    model.consecutiveSuggestedReplyUses ?? 0,
  );
  return createChatFixture({
    message: fallback.question,
    concept: getDependencyConceptName(fallbackConcept),
    nextAction: "현재 개념의 구체적 판단 대상 확인",
    suggestedReplies: fallback.replies,
    strategy,
  });
}

const FOCUS_PATTERNS: Record<string, RegExp> = {
  morpheme: /뜻을 가진|나눌|학생.*들/,
  word: /하나의 단어|홀로 쓰|조사와 결합/,
  "parts-of-speech-overview": /형태|기능|의미|단어의 종류|같은 종류|다른 종류/,
  numeral: /수량|순서|조사.*결합|체언/,
  "numeral-vs-numeral-determiner": /뒤의 명사|명사를.*꾸|바로 뒤|조사.*결합|두 학생/,
  particle: /체언 뒤|관계|조사|학생이/,
  "sentence-component": /주어|목적어|서술어|역할/,
};

function sameReplySet(left: string[], right: string[]) {
  return left.length === right.length &&
    [...left].sort().every((item, index) => item === [...right].sort()[index]);
}

function finalizeMockResponse(
  response: ChatApiResponse,
  request: ChatApiRequest,
  activeConceptId: string,
  focusLocked: boolean,
) {
  const recentAssistantMessage = [...request.messages]
    .reverse()
    .find(({ role }) => role === "assistant")?.content.trim() ?? "";
  if (response.message.trim() === recentAssistantMessage) {
    if (activeConceptId === "word") {
      response.message = "‘학생이’에서 ‘학생’ 뒤에는 조사 ‘이’가 붙어 있어. 이때 ‘학생’만 한 단어로 볼 수 있을까?";
      response.suggestedReplies = ["한 단어", "둘 이상의 단어", "잘 모르겠어"];
    } else {
      const alternate = getConceptQuestionAndReplies(activeConceptId, 1);
      response.message = alternate.question;
      response.suggestedReplies = alternate.replies;
    }
  }
  const pattern = FOCUS_PATTERNS[activeConceptId];
  if (focusLocked && pattern && !pattern.test(response.message)) {
    if (activeConceptId === "numeral-vs-numeral-determiner") {
      response.message = "‘두 학생’에서 ‘두’ 바로 뒤에 오는 명사는 ‘학생’이야. ‘두’가 이 명사를 직접 꾸미고 있다고 볼 수 있을까?";
      response.suggestedReplies = ["학생을 꾸며", "직접 꾸미지 않아", "잘 모르겠어"];
    } else {
      const safe = getConceptQuestionAndReplies(activeConceptId);
      response.message = safe.question;
      response.suggestedReplies = safe.replies;
    }
  }

  const history = request.recentSuggestedReplies ?? [];
  if (history.some((previous) => sameReplySet(previous, response.suggestedReplies))) {
    const alternate = getConceptQuestionAndReplies(activeConceptId, 1);
    if (!history.some((previous) => sameReplySet(previous, alternate.replies))) {
      response.suggestedReplies = alternate.replies;
    } else {
      response.suggestedReplies = [];
      if (!/한 단어로 답해도 돼|예:|___|이유를 짧게 한 문장/.test(response.message)) {
        response.message = `${response.message} 한 단어로 답해도 돼.`;
      }
    }
  }
  if (
    /(무엇|어느 말|어느 것)/.test(response.message) &&
    response.suggestedReplies.includes("응") &&
    response.suggestedReplies.includes("아니")
  ) response.suggestedReplies = [];
  if (/(왜|이유|근거|어떤 기준)/.test(response.message)) {
    response.suggestedReplies = [];
    if (!/한 단어로 답해도 돼|예:|___|이유를 짧게 한 문장/.test(response.message)) {
      response.message = `${response.message} 이유를 짧게 한 문장으로 적어 봐.`;
    }
  }
}

export function createMockChatResponseEngine(request: ChatApiRequest): ChatApiResponse {
  const response = createMockChatResponseCore(request);
  if (response.meta) {
    response.meta.knowledgeBundle = request.knowledgeBundle ?? findKnowledgeBundle(response.meta.concept);
    const preliminaryLearningState = calculateLearningState({
      studentModel: request.studentModel ?? {},
      learningProgress: request.learningProgress,
      learningMode: request.learningMode,
      learningGoal: request.learningGoal,
      currentConcept: response.meta.concept,
    });
    const preliminaryPlan = createDialoguePlan({
      learningState: preliminaryLearningState,
      studentModel: request.studentModel ?? {},
      messages: request.messages,
    });
    const recentStudentMessage = [...request.messages]
      .reverse()
      .find(({ role }) => role === "user")?.content ?? "";
    const preliminaryRetrieval = retrieveKnowledge({
      dialoguePlan: preliminaryPlan,
      studentModel: request.studentModel,
      recentStudentMessage,
      conversationMessages: request.messages.map(({ content }) => content),
      misconceptionProfiles: request.studentModel?.misconceptionProfiles,
      currentGoal: request.studentModel?.goalState?.currentGoal,
      currentMission: request.studentModel?.goalState?.missionDescription,
    });
    const adaptiveProfileForTurn = inferAdaptiveProfile({
      concept: preliminaryPlan.activeConcept,
      responseModes: [
        ...(request.studentModel?.responseModeHistory ?? []),
        ...(request.studentModel?.lastResponseMode
          ? [request.studentModel.lastResponseMode]
          : []),
      ],
      evaluations: request.studentModel?.evaluationHistory,
      hintStates: Object.values(request.studentModel?.hintStates ?? {}),
      workedExamples: Object.values(request.studentModel?.workedExampleStates ?? {}),
      masteryStates: Object.values(request.studentModel?.masteryStates ?? {}),
      previous: request.studentModel?.adaptiveProfile,
      studentConceptState: getStudentConceptState(request.studentModel?.studentProfile, preliminaryPlan.activeConcept),
    });
    const adaptiveStrategy = createAdaptiveTurnStrategy(adaptiveProfileForTurn);
    const knowledge = findRelevantKnowledge(
      recentStudentMessage,
      preliminaryPlan.activeConcept,
    );
    const answerEvaluation = evaluateStudentAnswer({
      studentAnswer: recentStudentMessage,
      activeConcept: preliminaryPlan.activeConcept,
      dialoguePlan: preliminaryPlan,
      retrievedEvidence: toKnowledgeEvidenceBundle(preliminaryRetrieval),
      misconceptionLibrary,
      completionCriteria: knowledge?.completionCriteria
        ? [
            ...knowledge.completionCriteria,
            ...getEvaluationCompletionCriteria(preliminaryRetrieval),
          ]
        : getEvaluationCompletionCriteria(preliminaryRetrieval),
      previousEvaluation: request.studentModel?.lastEvaluation,
      workedExampleState: Object.values(request.studentModel?.workedExampleStates ?? {}).find(
        (state) => !state.completedExample,
      ),
      adaptiveStrategy,
    });
    const masteryConceptId =
      inferLearningConceptId(preliminaryPlan.activeConcept) ??
      preliminaryPlan.activeConcept;
    const studentProfile = answerEvaluation.reason.some((reason) =>
      reason === "student_question_not_answer" || reason === "non_answer_question_carry_forward"
    )
      ? request.studentModel?.studentProfile
      : updateRuntimeStudentModel({
          previous: request.studentModel?.studentProfile,
          studentAnswer: recentStudentMessage,
          concept: preliminaryPlan.activeConcept,
          evaluation: answerEvaluation.evaluation,
          matchedMisconceptions: answerEvaluation.matchedMisconceptions,
          hasUnresolvedMisconception: Boolean(
            answerEvaluation.matchedMisconceptions.length ||
            request.studentModel?.misconceptionProfiles?.some(({ resolved, concept }) =>
              !resolved && (concept === preliminaryPlan.activeConcept || concept === masteryConceptId),
            ),
          ),
        });
    const misconceptionProfiles = updateMisconceptionProfiles({
      concept: masteryConceptId,
      evaluation: answerEvaluation.evaluation,
      matchedMisconceptions: answerEvaluation.matchedMisconceptions,
      existingProfiles: request.studentModel?.misconceptionProfiles,
      relatedExamples: preliminaryRetrieval.usedEvidence
        .filter(({ role }) => role === "worked_example")
        .map(({ id }) => id),
      relatedHints: preliminaryRetrieval.usedEvidence
        .filter(({ role }) => role === "hint" || role === "misconception")
        .map(({ id }) => id),
    });
    const activeMisconceptionProfile = getActiveMisconceptionProfile(
      misconceptionProfiles,
      masteryConceptId,
    );
    const previousMastery = request.studentModel?.masteryStates?.[masteryConceptId] ?? request.learningProgress?.concepts.find(
      ({ conceptId, conceptName }) =>
        conceptId === masteryConceptId ||
        inferLearningConceptId(conceptName) === masteryConceptId,
    )?.mastery;
    const mastery = calculateMastery({
      conceptId: masteryConceptId,
      evaluation: answerEvaluation.evaluation,
      evaluationConfidence: answerEvaluation.confidence,
      previous: previousMastery,
      completionEvidence: [
        ...(request.studentModel?.completionEvidence ?? []),
        ...(response.meta.completionEvidence ?? []),
      ],
      matchedMisconceptions: answerEvaluation.matchedMisconceptions,
      workedExampleSuccess:
        Boolean(Object.values(request.studentModel?.workedExampleStates ?? {}).find(
          (state) => !state.completedExample,
        )) && answerEvaluation.evaluation === "correct",
      misconceptionProfiles,
      studentConceptState: request.studentModel?.studentProfile
        ? getStudentConceptState(studentProfile, preliminaryPlan.activeConcept)
        : undefined,
    });
    const legacyHintLevel =
      (request.studentModel?.consecutiveUnknownResponses ?? 0) > 0 &&
      (request.studentModel?.consecutiveUnknownResponses ?? 0) >= (request.studentModel?.hintLevel ?? 0)
        ? Math.max(0, (request.studentModel?.hintLevel ?? 0) - 1)
        : request.studentModel?.hintLevel ?? 0;
    const previousHint =
      request.studentModel?.hintStates?.[masteryConceptId] ?? {
        ...createInitialHintState(masteryConceptId),
        hintLevel: legacyHintLevel as 0 | 1 | 2 | 3,
        hintCount: Math.max(0, (request.studentModel?.consecutiveUnknownResponses ?? 0) - 1),
      };
    const previousWorkedExample =
      request.studentModel?.workedExampleStates?.[masteryConceptId] ?? null;
    const hintState = answerEvaluation.reason.some((reason) =>
      reason === "student_question_not_answer" ||
      reason === "non_answer_question_carry_forward"
    )
      ? previousHint
      : calculateHintState({
          conceptId: masteryConceptId,
          evaluation: answerEvaluation.evaluation,
          confidence: answerEvaluation.confidence,
          mastery,
          learningMode: request.learningMode ?? request.studentModel?.learningMode ?? "learn",
          previous: previousHint,
          workedExampleActive: isWorkedExampleActive(previousWorkedExample),
          activeMisconceptionProfile,
          adaptiveStrategy,
        });
    const evaluatedStudentModel = {
      ...(request.studentModel ?? {}),
      lastEvaluation: answerEvaluation.evaluation,
      confidence: answerEvaluation.confidence,
      misconceptions: [
        ...new Set([
          ...(request.studentModel?.misconceptions ?? []),
          ...answerEvaluation.matchedMisconceptions,
        ]),
      ],
      studentProfile,
    };
    const learningState = calculateLearningState({
      studentModel: evaluatedStudentModel,
      learningProgress: request.learningProgress,
      learningMode: request.learningMode,
      learningGoal: request.learningGoal,
      currentConcept: response.meta.concept,
      masteryState: mastery,
      hintState,
      adaptiveProfile: adaptiveProfileForTurn,
    });
    response.meta.learningState = learningState;
    response.meta.strategy = learningState.tutorStrategy;
    response.meta.evaluation = answerEvaluation.evaluation;
    response.meta.confidence = answerEvaluation.confidence;
    response.meta.misconception =
      answerEvaluation.matchedMisconceptions[0] ?? "";
    response.meta.answerEvaluation = answerEvaluation;
    response.meta.mastery = mastery;
    response.meta.hintState = hintState;
    if (hintState.lastHintType === "worked_example") {
      if (masteryConceptId === "morpheme") {
        response.message =
          "‘학생들’을 예로 볼게: ‘학생’은 사람, ‘들’은 여럿을 뜻해; 여럿이라는 뜻을 가진 가장 작은 부분은 어느 말일까?";
        response.suggestedReplies = ["들", "학생", "잘 모르겠어"];
      } else {
        response.message =
          "예문을 나란히 볼게. ‘두 학생’, ‘세 사람’, ‘네 권’에서 수 표현은 모두 바로 뒤의 명사를 꾸며; ‘네 권’에서 ‘네’가 꾸미는 말은 무엇일까?";
        response.suggestedReplies = ["권", "네", "잘 모르겠어"];
      }
    } else if (hintState.lastHintType === "answer_reveal") {
      response.message =
        "‘두 학생’의 ‘두’는 뒤 명사 ‘학생’을 직접 꾸미므로 수 관형사야. 같은 기준으로 ‘세 사람’의 ‘세’도 수 관형사일까?";
      response.suggestedReplies = ["수 관형사", "수사", "잘 모르겠어"];
    } else if (
      hintState.lastHintType === "observation" &&
      masteryConceptId === "numeral-vs-numeral-determiner"
    ) {
      response.message =
        "‘두’ 바로 뒤의 말은 ‘학생’이야; ‘두’가 꾸미는 대상은 어느 말일까?";
      response.suggestedReplies = ["뒤의 ‘학생’", "앞의 ‘두’", "잘 모르겠어"];
    }
    if (response.meta.learningStatus === "completed" && !isMastered(mastery)) {
      response.meta.learningStatus = "in_progress";
    }
    const candidatePlan = createDialoguePlan({
      learningState,
      studentModel: evaluatedStudentModel,
      messages: request.messages,
      workedExampleState: previousWorkedExample,
      activeMisconceptionProfile,
      adaptiveStrategy,
    });
    const candidateRetrieval = retrieveKnowledge({
      dialoguePlan: candidatePlan,
      studentModel: evaluatedStudentModel,
      recentStudentMessage,
      conversationMessages: request.messages.map(({ content }) => content),
      workedExampleState: previousWorkedExample,
      misconceptionProfiles,
      currentGoal: request.studentModel?.goalState?.currentGoal,
      currentMission: request.studentModel?.goalState?.missionDescription,
    });
    const lastAssistantQuestion = [...request.messages]
      .reverse()
      .find(({ role }) => role === "assistant")?.content ?? candidatePlan.requiredFocus;
    const workedExampleState = calculateWorkedExampleState({
      conceptId: masteryConceptId,
      evaluation: answerEvaluation.evaluation,
      hintState,
      mastery,
      retrievedEvidence: toKnowledgeEvidenceBundle(candidateRetrieval),
      originQuestion: previousWorkedExample?.originQuestion ?? lastAssistantQuestion,
      returnConcept: previousWorkedExample?.returnConcept ?? candidatePlan.activeConcept,
      previous: previousWorkedExample,
      applyFailCount: request.studentModel?.consecutiveUnknownResponses,
      misconceptionCount: request.studentModel?.misconceptions?.filter(
        (item) => answerEvaluation.matchedMisconceptions.includes(item),
      ).length,
      terminationRequested: isSessionEndIntent(recentStudentMessage),
      activeMisconceptionProfile,
      adaptiveStrategy,
    });
    learningState.workedExample = workedExampleState;
    if (workedExampleState && !workedExampleState.completedExample) {
      learningState.reason.push("worked_example_active");
    }
    const adaptiveProfile = inferAdaptiveProfile({
      concept: masteryConceptId,
      responseModes: [
        ...(request.studentModel?.responseModeHistory ?? []),
        ...(request.studentModel?.lastResponseMode
          ? [request.studentModel.lastResponseMode]
          : []),
      ],
      evaluations: [
        ...(request.studentModel?.evaluationHistory ?? []),
        { evaluation: answerEvaluation.evaluation, confidence: answerEvaluation.confidence },
      ],
      hintStates: [...Object.values(request.studentModel?.hintStates ?? {}), hintState],
      workedExamples: [
        ...Object.values(request.studentModel?.workedExampleStates ?? {}),
        ...(workedExampleState ? [workedExampleState] : []),
      ],
      masteryStates: [...Object.values(request.studentModel?.masteryStates ?? {}), mastery],
      previous: request.studentModel?.adaptiveProfile,
      studentConceptState: getStudentConceptState(studentProfile, preliminaryPlan.activeConcept),
    });
    learningState.adaptive = adaptiveProfile;
    if (workedExampleState) {
      if (workedExampleState.completedExample) {
        response.message = `비슷한 예제에서 기준을 확인했어. 이제 원래 질문으로 돌아가 볼게. ${workedExampleState.originQuestion}`;
        response.suggestedReplies = [];
      } else if (workedExampleState.exampleStep === 1) {
        response.message = masteryConceptId === "morpheme"
          ? "비슷한 예제로 먼저 볼게. ‘학생들’에서 ‘학생’은 사람을, ‘들’은 여럿을 뜻해. 여럿이라는 뜻을 가진 부분은 어느 말일까?"
          : "비슷한 예제로 먼저 볼게. ‘세 사람’에서 ‘세’는 바로 뒤의 ‘사람’을 꾸며. ‘세’가 꾸미는 말은 어느 말일까?";
        response.suggestedReplies = masteryConceptId === "morpheme"
          ? ["들", "학생", "잘 모르겠어"]
          : ["사람", "세", "잘 모르겠어"];
      } else if (workedExampleState.exampleStep === 2) {
        response.message = "이 예제에서 확인한 기준은 **뒤의 명사를 직접 꾸미는지**야. ‘세’가 수 관형사인 까닭을 이 기준으로 짧게 말해 볼래?";
        response.suggestedReplies = [];
      } else if (workedExampleState.exampleStep === 3) {
        response.message = "같은 기준을 직접 적용해 보자. ‘네 권’의 ‘네’가 꾸미는 말은 무엇일까?";
        response.suggestedReplies = ["권", "네", "잘 모르겠어"];
      } else {
        response.message = "‘네’는 뒤 명사 ‘권’을 직접 꾸미므로 수 관형사야. 이 판단에 사용한 기준을 한 문장으로 말해 볼래?";
        response.suggestedReplies = [];
      }
    }
    const goalState = calculateGoalState({
      currentConcept: learningState.currentConcept,
      routeCurrentConcept: learningState.learningRouteState.currentConcept,
      routeRemainingConcepts: learningState.learningRouteState.remainingConcepts,
      routeCompletedConcepts: learningState.learningRouteState.completedConcepts,
      mastery,
      reviewRequired: learningState.review.required,
      reviewConcept: learningState.review.concept,
      evaluation: answerEvaluation.evaluation,
      hint: hintState,
      workedExample: workedExampleState,
      completionConfirmed: learningState.completionState.complete,
      previous: request.studentModel?.goalState,
    });
    learningState.goal = goalState;
    const dialoguePlan = createDialoguePlan({
      learningState,
      studentModel: evaluatedStudentModel,
      messages: request.messages,
      workedExampleState,
      goalState,
      activeMisconceptionProfile,
      adaptiveStrategy,
    });
    const shouldSummarize =
      dialoguePlan.action === "complete" || isSessionEndIntent(recentStudentMessage);
    const sessionSummary = shouldSummarize
      ? createSessionSummary({
          learningState,
          masteryStates: [
            ...Object.values(request.studentModel?.masteryStates ?? {}),
            mastery,
          ],
          evaluationHistory: [
            ...(request.studentModel?.evaluationHistory ?? []),
            {
              concept: dialoguePlan.activeConcept,
              evaluation: answerEvaluation.evaluation,
              misconception: answerEvaluation.matchedMisconceptions[0] ?? "",
              confidence: answerEvaluation.confidence,
            },
          ],
          workedExampleStates: [
            ...Object.values(request.studentModel?.workedExampleStates ?? {}),
            ...(workedExampleState ? [workedExampleState] : []),
          ],
          hintStates: [
            ...Object.values(request.studentModel?.hintStates ?? {}), hintState,
          ],
          understoodConcepts: request.studentModel?.understoodConcepts,
          needsSupportConcepts: request.studentModel?.needsSupportConcepts,
          sessionStartedAt: request.studentModel?.sessionStartedAt,
          goalState,
          misconceptionProfiles,
          adaptiveProfile,
        })
      : null;
    const tutorPersona = createTutorPersonaPlan({
      dialoguePlan,
      learningState,
      answerEvaluation,
      messages: request.messages,
    });
    response.meta.dialoguePlan = dialoguePlan;
    response.meta.workedExampleState = workedExampleState;
    response.meta.sessionSummary = sessionSummary;
    response.meta.goalState = goalState;
    response.meta.misconceptionProfiles = misconceptionProfiles;
    response.meta.adaptiveProfile = adaptiveProfile;
    response.meta.adaptiveStrategy = adaptiveStrategy;
    if (sessionSummary && isSessionEndIntent(recentStudentMessage)) {
      response.message = sessionSummary.summary.join("\n");
      response.suggestedReplies = [];
    }
    response.meta.tutorPersona = tutorPersona;
    response.meta.retrieval = toKnowledgeEvidenceBundle(retrieveKnowledge({
      dialoguePlan,
      studentModel: evaluatedStudentModel,
      recentStudentMessage,
      conversationMessages: request.messages.map(({ content }) => content),
      workedExampleState,
      misconceptionProfiles,
      currentGoal: goalState.currentGoal,
      currentMission: goalState.missionDescription,
    }));
    if (response.meta.retrieval.reason.includes("knowledge_not_found")) {
      response.message = "이 질문은 현재 품사 Knowledge에 없어 문법 학습 범위 밖이야. 등록된 품사 내용 안에서 질문해 줘.";
      response.suggestedReplies = [];
    }
    const route = request.studentModel?.learningRoute;
    const activeConceptId =
      route?.route[route.currentIndex] ??
      request.studentModel?.activePrerequisite ??
      inferDependencyConceptId(dialoguePlan.activeConcept) ??
      inferDependencyConceptId(learningState.currentConcept) ??
      (response.meta.concept || "parts-of-speech-overview");
    response.meta.concept = getDependencyConceptName(activeConceptId);
    finalizeMockResponse(
      response,
      request,
      activeConceptId,
      Boolean(route || request.studentModel?.activePrerequisite),
    );
    if (!isSessionEndIntent(recentStudentMessage)) {
      response.message = applyTutorPersona(
        response.message,
        tutorPersona,
        request.messages,
      );
    }
    applyDirectAnswerFirst(response, request);
    const plan = response.meta.dialoguePlan;
    const explanationConcept = plan?.activeConcept ?? response.meta.concept;
    const conceptState = getStudentConceptState(
      studentProfile ?? request.studentModel?.studentProfile,
      explanationConcept,
    );
    const explanationPlan = selectExplanationPlan({
      concept: explanationConcept,
      confidence: conceptState.confidence,
      understandingLevel: conceptState.understandingLevel,
      misconception: conceptState.misconceptionSummary,
      consecutiveFailures: conceptState.consecutiveFailures,
      history: (studentProfile ?? request.studentModel?.studentProfile)?.explanationHistory ?? [],
    });
    response.meta.explanationPlan = explanationPlan;
    if (plan) plan.explanationPlan = explanationPlan;
    const conceptRequests = request.messages.filter(({ role, content }) =>
      role === "user" && classifyUserIntent(content).some((intent) =>
        ["explain_request", "compare_request", "definition_request", "example_request"].includes(intent),
      ) && (inferDependencyConceptId(content) === inferDependencyConceptId(explanationConcept) ||
        (DIRECT_NOUN_PRONOUN_PATTERN.test(content) && explanationConcept === "명사와 대명사")),
    ).length;
    if (!isSessionEndIntent(recentStudentMessage) &&
      !request.studentModel?.learningRoute &&
      !request.studentModel?.activePrerequisite &&
      (response.meta.hintLevelUsed ?? 0) < 3 &&
      (conceptRequests >= 2 || (plan?.responseMode === "same_concept_reexplain" && CONFUSION_PATTERN.test(recentStudentMessage) && conceptState.consecutiveFailures >= 1))) {
      response.message = renderMockExplanation(explanationPlan);
      response.suggestedReplies = explanationPlan.strategy === "fill_blank"
        ? ["이름을 직접 나타내기", "이름을 대신하기", "잘 모르겠어"]
        : explanationPlan.depth >= 4 ? [] : response.suggestedReplies;
    }
    const previousAssistant = [...request.messages]
      .reverse()
      .find(({ role }) => role === "assistant")?.content.trim() ?? "";
    if (
      !isSessionEndIntent(recentStudentMessage) && (response.message.trim() === previousAssistant ||
      (previousAssistant.length >= 12 &&
        response.message.trim().startsWith(previousAssistant.slice(0, 12))) ||
      (previousAssistant.replace(/[‘’'"\s]/g, "").slice(-24) ===
        response.message.replace(/[‘’'"\s]/g, "").slice(-24)))
    ) {
      const alternate = activeConceptId === "word"
        ? {
            question: "‘학생이’에서 ‘학생’ 뒤에는 조사 ‘이’가 붙어 있어. 이때 ‘학생’만 한 단어로 볼 수 있을까?",
            replies: ["한 단어라고 생각해", "둘로 나뉜다고 생각해", "잘 모르겠어"],
          }
        : activeConceptId === "particle"
          ? {
              question: "‘학생이’에서 ‘학생’ 뒤에 붙어 관계를 나타내는 부분은 어느 말일까?",
              replies: ["조사 ‘이’", "앞말 ‘학생’", "잘 모르겠어"],
            }
        : getConceptQuestionAndReplies(activeConceptId, 1);
      response.message = alternate.question;
      response.suggestedReplies = alternate.replies;
    }
    const finalStudentProfile = recordExplanation({
      model: studentProfile ?? request.studentModel?.studentProfile ?? createEmptyRuntimeStudentModel(),
      concept: plan?.activeConcept ?? response.meta.concept,
      strategy: plan?.teachingStrategy ?? "DIRECT_EXPLANATION",
      explanationStrategy: explanationPlan.strategy,
      exampleIds: explanationPlan.exampleId ? [explanationPlan.exampleId] : [],
      message: response.message,
    });
    response.meta.studentModel = finalStudentProfile;
    if (plan) plan.studentModel = finalStudentProfile;
  }
  return response;
}

// 개발용 순수 회귀 검사는 I/O 없이 Runtime 단계 계약을 함께 검증합니다.
export function createMockChatResponse(request: ChatApiRequest) {
  const response = createMockChatResponseEngine(request);
  if (response.meta) {
    response.meta.runtimeEvents = RUNTIME_STEPS.map((step) => ({
      step, elapsed: 0, engine: step.toLowerCase(),
      result: step === "RESTORE" || step === "SAVE" ? "skipped" : "success",
      reason: step === "RESTORE" || step === "SAVE" ? ["repository_not_available_in_pure_test"] : [], warning: [],
    }));
    response.meta.runtimeLog = response.meta.runtimeEvents.map((item) => ({ ...item, timestamp: new Date(0).toISOString() }));
  }
  return response;
}
