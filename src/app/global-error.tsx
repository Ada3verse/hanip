"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="ko"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "sans-serif" }}><section role="alert" style={{ maxWidth: 480, textAlign: "center" }}><h1>한잎을 불러오지 못했어요.</h1><p>잠시 후 다시 시도하거나 홈으로 돌아가 주세요.</p><button type="button" onClick={reset} style={{ minHeight: 44, marginTop: 16, padding: "10px 18px", border: 0, borderRadius: 8, background: "black", color: "white", fontWeight: 700 }}>다시 시도</button></section></main></body></html>;
}
