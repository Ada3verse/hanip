const DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

function normalizedOrigin(value: string) {
  try { return new URL(value).origin; } catch { return null; }
}

export function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env) {
  const configured = (env.HANIP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => normalizedOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));
  const development = env.NODE_ENV === "production" ? [] : DEVELOPMENT_ORIGINS;
  return [...new Set([...configured, ...development])];
}

export function evaluateRequestOrigin(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return { allowed: true, origin: null, sameOrigin: true };
  const origin = normalizedOrigin(originHeader);
  const requestOrigin = normalizedOrigin(request.url);
  if (!origin || !requestOrigin) return { allowed: false, origin: null, sameOrigin: false };
  const sameOrigin = origin === requestOrigin;
  return { allowed: sameOrigin || getAllowedOrigins(env).includes(origin), origin, sameOrigin };
}

export function isSameOriginRequest(request: Request) {
  return evaluateRequestOrigin(request).allowed;
}

export function corsResponseHeaders(request: Request) {
  const result = evaluateRequestOrigin(request);
  const headers = new Headers({ Vary: "Origin" });
  if (result.allowed && result.origin && !result.sameOrigin) {
    headers.set("Access-Control-Allow-Origin", result.origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-Hanip-Live-Ai-Test");
  }
  return headers;
}
