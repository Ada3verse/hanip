import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

/**
 * Loads the developer-local environment when it exists. Node's loadEnvFile
 * preserves values that are already present in process.env, so Vercel and
 * other system-provided configuration always wins.
 */
export function loadRuntimeEnvironment(cwd = process.cwd()) {
  const path = resolve(cwd, ".env.local");
  if (!existsSync(path)) return false;
  loadEnvFile(path);
  return true;
}

