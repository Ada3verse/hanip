export interface RetentionPolicy {
  version: 1;
  effectiveDate: string;
  annualDeletionMonthDay: "12-31";
  contact: string;
  termsVersion: string;
  privacyVersion: string;
  reviewed: boolean;
}

export const privacyRetentionPolicy: RetentionPolicy = {
  version: 1,
  effectiveDate: "2026-07-01",
  annualDeletionMonthDay: "12-31",
  contact: "동신중학교 정보교육 담당(정경원)",
  termsVersion: "2026-07-01-v1",
  privacyVersion: "2026-07-01-v1",
  reviewed: true,
};

export function isRetentionReadyForProduction(policy: RetentionPolicy) {
  return policy.reviewed && Boolean(policy.effectiveDate && policy.contact && policy.termsVersion && policy.privacyVersion);
}

export function calculateRetentionDeadline(date = new Date()) {
  const year = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(date));
  return new Date(`${year}-12-31T23:59:59+09:00`).toISOString();
}
