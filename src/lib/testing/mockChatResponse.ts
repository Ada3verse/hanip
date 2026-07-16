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
    const previousMastery = request.learningProgress?.concepts.find(
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
    }));
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
    const previousAssistant = [...request.messages]
      .reverse()
      .find(({ role }) => role === "assistant")?.content.trim() ?? "";
    if (
      !isSessionEndIntent(recentStudentMessage) && (response.message.trim() === previousAssistant ||
      (previousAssistant.length >= 12 &&
        response.message.trim().startsWith(previousAssistant.slice(0, 12))))
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
