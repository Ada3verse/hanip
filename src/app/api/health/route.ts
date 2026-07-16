import { NextResponse } from "next/server";
import { runFirebaseHealthCheck } from "@/lib/firebase/health";

export async function GET() {
  const health = await runFirebaseHealthCheck();
  return NextResponse.json(health, { status: health.status === "FAIL" ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
