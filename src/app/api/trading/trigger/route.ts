// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Instant Trading Trigger
// Called when user enables trading or manually requests a scan.
// Runs ONE cycle of V2 engine for just this user — no waiting for cron.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { runSingleUserTrading } = await import("@/lib/trading-v2");
    const result = await runSingleUserTrading(user.id);
    return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[Trigger] Error:", err);
    return NextResponse.json({ error: err.message?.slice(0, 200) }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
