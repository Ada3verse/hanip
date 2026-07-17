export type PersonalDataKind = "email" | "phone" | "resident_registration_number";
export interface PrivacyFilterResult { safeText: string; detected: PersonalDataKind[]; blocked: boolean; }

const FILTERS: Array<{ kind: PersonalDataKind; pattern: RegExp; replacement: string }> = [
  { kind: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[이메일 가림]" },
  { kind: "phone", pattern: /(?<!\d)01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g, replacement: "[전화번호 가림]" },
  { kind: "resident_registration_number", pattern: /(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)/g, replacement: "[민감정보 가림]" },
];

export function filterPersonalData(input: string): PrivacyFilterResult {
  let safeText = input.slice(0, 5_000);
  const detected: PersonalDataKind[] = [];
  for (const filter of FILTERS) {
    filter.pattern.lastIndex = 0;
    if (filter.pattern.test(safeText)) detected.push(filter.kind);
    filter.pattern.lastIndex = 0;
    safeText = safeText.replace(filter.pattern, filter.replacement);
  }
  return { safeText, detected, blocked: detected.includes("resident_registration_number") };
}
