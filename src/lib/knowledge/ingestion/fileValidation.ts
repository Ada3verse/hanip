import { SOURCE_LIMITS, type SourceFileInput } from "./types";
export interface SourceFileValidation { valid: boolean; errors: string[]; safeFileName: string; }
export function sanitizeUploadFileName(value: string) { return value.replace(/\\/g, "/").split("/").at(-1)!.replace(/[<>"'`]/g, "").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 160); }
export function validateSourceFile(input: SourceFileInput): SourceFileValidation {
  const errors: string[] = [], safeFileName = sanitizeUploadFileName(input.fileName); const extension = safeFileName.split(".").at(-1)?.toLowerCase();
  if (!SOURCE_LIMITS.allowedExtensions.includes(extension as "pdf")) errors.push("UNSUPPORTED_EXTENSION");
  if (!SOURCE_LIMITS.allowedMimeTypes.includes(input.mimeType as "application/pdf")) errors.push("MIME_MISMATCH");
  if (input.bytes.byteLength === 0) errors.push("EMPTY_FILE");
  if (input.bytes.byteLength > SOURCE_LIMITS.maxFileSize) errors.push("FILE_TOO_LARGE");
  if ((input.claimedPageCount ?? 0) > SOURCE_LIMITS.maxPages) errors.push("PAGE_LIMIT_EXCEEDED");
  if (input.encrypted) errors.push("ENCRYPTED_PDF"); if (input.corrupted) errors.push("CORRUPTED_PDF");
  const header = new TextDecoder().decode(input.bytes.slice(0, 8)); if (input.bytes.length && !header.startsWith("%PDF-")) errors.push("CORRUPTED_PDF");
  return { valid: errors.length === 0, errors: [...new Set(errors)], safeFileName };
}
