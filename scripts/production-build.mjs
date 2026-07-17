import { access, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const devPages = ["prompt-test", "conversation-qa", "firebase", "knowledge", "readiness", "sources", "releases", "import", "security"].map((name) => ({
  route: path.join(root, "src", "app", "dev", name, "page.tsx"),
  isolated: path.join(root, "src", "app", "dev", name, "page.development-only.tsx"),
}));
const exists = async (target) => access(target).then(() => true, () => false);
const isolatedPages = [];

try {
  for (const page of devPages) {
    if (await exists(page.isolated)) throw new Error(`이전 production build의 임시 파일이 남아 있습니다: ${page.isolated}`);
    if (await exists(page.route)) { await rename(page.route, page.isolated); isolatedPages.push(page); }
  }
  const command = path.join(root, "node_modules", ".bin", "next");
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(command, ["build"], { cwd: root, stdio: "inherit", env: { ...process.env, HANIP_PRODUCTION_BUILD: "true" } });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) process.exitCode = exitCode;
} finally {
  for (const page of isolatedPages.reverse()) await rename(page.isolated, page.route);
}
