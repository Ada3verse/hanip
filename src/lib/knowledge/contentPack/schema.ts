export const CONTENT_PACK_CURRICULUM = { curriculumYear: "2022", schoolLevel: "middle", subject: "국어", domain: "문법" } as const;
export const CONTENT_PACK_VERIFICATION_STATUSES = ["draft", "reviewed", "verified"] as const;
export const OFFICIAL_CONTENT_PACK_SOURCE_TYPES = ["curriculum", "textbook", "teacher_guide", "official_reference"] as const;
export const CONTENT_PACK_STUDENT_FORBIDDEN_PATTERN = /(?:source[_ -]?id|documentId|reviewedBy|verificationStatus|\bdraft\b|\bverified\b|미검증|내부 상태)/i;
export function normalizeContentPackKey(value: string) { return value.toLowerCase().replace(/[\s_-]+/g, ""); }
