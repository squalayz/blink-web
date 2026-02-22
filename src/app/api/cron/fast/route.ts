// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Fast Cron (every 3 min)
// Only runs for degen strategies: meme_scout, momentum, sniper
// Also runs SL/TP engine for all users
// vercel.json: { "crons": [{ "path": "/api/cron/fast", "schedule": "*/3 * * * *" }] }
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { runAutonomousTradingV2, runSLTPEngine } from "@/lib/trading-v2";

const DEGEN_MODES = ["meme_scout", "momentum", "sniper"];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron-auth") === process.env.CRON_SECRET;
  const isBearerAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isBearerAuth && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // 1. Run SL/TP engine for ALL users (fast checks)
    await runSLTPEngine();
    results.push("SL/TP engine completed");

    // 2. Run trading ONLY for degen strategies
    // The V2 engine already filters by trading_enabled
    // We pass a mode filter to only process fast strategies
    await runAutonomousTradingV2(DEGEN_MODES);
    results.push(`Fast trading completed for modes: ${DEGEN_MODES.join(", ")}`);

    return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("Fast cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 120;
