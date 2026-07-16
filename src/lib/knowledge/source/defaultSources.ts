import type { KnowledgeProvenance, KnowledgeSource } from "./types";
import { KnowledgeSourceRegistry } from "./registry";

export const hanipInternalDraftSource: KnowledgeSource = {
  id: "hanip-internal-draft",
  type: "internal",
  title: "한잎 개발용 임시 지식",
  note: "2022 개정 교육과정, 교과서, 교사용 지도서 대조 검증 필요",
};

export const draftGrammarProvenance: KnowledgeProvenance = {
  verificationStatus: "draft",
  sources: [hanipInternalDraftSource],
  scope: {
    curriculumYear: "2022",
    schoolLevel: "middle",
    subject: "국어",
    domain: "문법",
  },
};

export const defaultKnowledgeSourceRegistry = new KnowledgeSourceRegistry();
defaultKnowledgeSourceRegistry.register(hanipInternalDraftSource, draftGrammarProvenance);
