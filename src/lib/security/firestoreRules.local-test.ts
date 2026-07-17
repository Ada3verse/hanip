import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function runFirestoreSecurityRulesLocalTests() {
  const rules = await readFile(join(process.cwd(), "firestore.rules"), "utf8");
  const checks = [
    /request\.auth\.uid == uid/.test(rules),
    /studentCredentials\/\{uid\}[\s\S]*allow read, write: if false/.test(rules),
    /securityLogs\/\{logId\}[\s\S]*allow read, write: if false/.test(rules),
    /adminSessions\/\{sessionId\}[\s\S]*allow read, write: if false/.test(rules),
    /adminAuditLogs\/\{logId\}[\s\S]*allow read, write: if false/.test(rules),
    /retentionAuditLogs\/\{logId\}[\s\S]*allow read, write: if false/.test(rules),
    /match \/users\/\{uid\}[\s\S]*allow read, create, update, delete: if false/.test(rules),
    /match \/sessions\/\{sessionId\}[\s\S]*allow read, write: if false/.test(rules),
    /match \/learningState\/\{documentId\}[\s\S]*allow read: if signedInAs\(uid\)[\s\S]*allow write: if false/.test(rules),
    /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/.test(rules),
  ];
  if (checks.some((value) => !value)) throw new Error("Firestore security rules local test failed");
  return checks.length;
}
