import { sampleDraftPack } from "./sampleDraftPack";
import { validateKnowledgeContentPack } from "./validator";

const clone = () => structuredClone(sampleDraftPack);
function check(condition: boolean, message: string) { if (!condition) throw new Error(`Content Pack validator test failed: ${message}`); }
export function runContentPackValidatorLocalTests() {
  check(validateKnowledgeContentPack(sampleDraftPack).valid, "normal pack valid");
  const duplicate = clone(); duplicate.sources.push({ ...duplicate.sources[0] });
  check(validateKnowledgeContentPack(duplicate).errors.some(({ code }) => code === "SOURCE_ID_DUPLICATE"), "duplicate source rejected");
  const missingSource = clone(); missingSource.concepts[0].definition!.sourceIds = ["missing"];
  check(validateKnowledgeContentPack(missingSource).errors.some(({ code }) => code === "SOURCE_REFERENCE_MISSING"), "missing source rejected");
  const missingPrerequisite = clone(); missingPrerequisite.concepts[1].prerequisiteConceptIds = ["missing"];
  check(validateKnowledgeContentPack(missingPrerequisite).errors.some(({ code }) => code === "PREREQUISITE_MISSING"), "missing prerequisite rejected");
  const cycle = clone(); cycle.concepts[0].prerequisiteConceptIds = ["word"];
  check(validateKnowledgeContentPack(cycle).errors.some(({ code }) => code === "PREREQUISITE_CYCLE"), "cycle detected");
  const unofficial = clone(); unofficial.concepts[0].definition!.verificationStatus = "verified";
  check(validateKnowledgeContentPack(unofficial).errors.some(({ code }) => code === "VERIFIED_OFFICIAL_SOURCE_REQUIRED"), "verified requires official source");
  const location = clone(); location.sources.push({ id: "virtual-official", type: "curriculum", title: "검증 우선순위 테스트용 가상 자료", note: "테스트 fixture" }); location.concepts[0].definition!.verificationStatus = "verified"; location.concepts[0].definition!.sourceIds = ["virtual-official"];
  check(validateKnowledgeContentPack(location).warnings.some(({ code }) => code === "VERIFIED_LOCATION_MISSING"), "verified location warning");
}
