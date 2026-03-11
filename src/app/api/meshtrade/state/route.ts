// ══════════════════════════════════════════════════════════════
// MishMesh.ai — MeshTrade Agent State
// GET: returns agent settings, mood, open positions, log, and
//      session stats for the authenticated user.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;

  // Run all queries in parallel
  const [settingsRes, positionsRes, logRes, todayTradesRes] = await Promise.all([
    // 1. User settings
    supabaseAdmin
      .from("users")
      .select("mt_aggression, mt_max_trade, mt_stop_loss, mt_take_profit, mt_unleashed, mt_priority_queue, mt_watchlist, wallet_address")
      .eq("id", userId)
      .single(),

    // 2. Recent buy positions (to derive open positions client-side)
    supabaseAdmin
      .from("trade_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("action", "buy")
      .order("timestamp", { ascending: false })
      .limit(20),

    // 3. Agent log entries
    supabaseAdmin
      .from("meshtrade_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),

    // 4. Today's trades for session stats
    supabaseAdmin
      .from("trade_logs")
      .select("action, pnl")
      .eq("user_id", userId)
      .gte("timestamp", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  if (settingsRes.error) {
    return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  }

  const s = settingsRes.data;

  // Filter for open positions: buys that don't have a corresponding sell
  // (simple heuristic — positions without a matching sell after the buy)
  const buyPositions = positionsRes.data || [];

  // Compute session stats from today's trades
  const todayTrades = todayTradesRes.data || [];
  const sessionStats = {
    trades: todayTrades.length,
    pnl: todayTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0),
  };

  // Determine agent mood
  let mood: string;
  if (!s.mt_unleashed) {
    mood = "DORMANT";
  } else if (buyPositions.length > 0) {
    mood = "LOCKED IN";
  } else {
    mood = "SCANNING";
  }

  return NextResponse.json({
    settings: {
      aggression: s.mt_aggression,
      maxTrade: s.mt_max_trade,
      stopLoss: s.mt_stop_loss,
      takeProfit: s.mt_take_profit,
      unleashed: s.mt_unleashed,
    },
    mood,
    positions: buyPositions,
    logEntries: logRes.data || [],
    sessionStats,
    priorityQueue: s.mt_priority_queue || [],
    watchlist: s.mt_watchlist || [],
  });
}
