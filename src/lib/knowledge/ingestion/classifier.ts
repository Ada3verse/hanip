import type { CandidateType, IngestionSourceChunk } from "./types";
export function classifyChunkText(text: string): { candidateTypes: CandidateType[]; reason: string[] } {
  const types: CandidateType[] = [], reason: string[] = [];
  const add = (type: CandidateType, why: string) => { if (!types.includes(type)) types.push(type); reason.push(why); };
  if (/(?:개념|단원|품사|형태소)/.test(text)) add("concept_candidate", "concept_keyword");
  if (/(?:이란|란 |는 .*이다|뜻한다)/.test(text)) add("definition_candidate", "definition_pattern");
  if (/(?:기준|구분|확인해야|규칙)/.test(text)) add("rule_candidate", "rule_pattern");
  if (/(?:예를 들어|예문|보기)/.test(text)) add("example_candidate", "example_pattern");
  if (/(?:반례|그러나 .*아니다)/.test(text)) add("counterexample_candidate", "counterexample_pattern");
  if (/(?:헷갈|잘못 생각|오개념)/.test(text)) add("misconception_candidate", "misconception_pattern");
  if (/[?？]|확인 문제/.test(text)) add("check_question_candidate", "question_pattern");
  if (/(?:풀이 단계|먼저.*다음|해설)/.test(text)) add("worked_example_candidate", "worked_example_pattern");
  if (/(?:할 수 있다|완료 기준|학습 목표)/.test(text)) add("completion_criteria_candidate", "completion_pattern");
  if (/(?:교사|지도상의 유의점)/.test(text)) add("teacher_note_candidate", "teacher_note_pattern");
  if (text.length < 10) add("needs_manual_review", "too_short"); if (!types.length) add("irrelevant", "no_candidate_pattern");
  return { candidateTypes: types, reason };
}
export function classifyChunks(chunks: IngestionSourceChunk[]) { return chunks.map((chunk) => { const result = classifyChunkText(chunk.normalizedText); return { ...chunk, ...result, status: "classified" as const }; }); }
