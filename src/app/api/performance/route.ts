// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Agent Performance API
// GET: fetch aggregated performance stats for current user
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getUserId(req: NextRequest): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/mm-session=([^;]+)/);
  if (!sessionMatch) return null;
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(sessionMatch[1], secret);
    return (payload as any).sub || (payload as any).userId || null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get aggregated performance
  const { data: perf } = await supabaseAdmin.from("agent_performance")
    .select("*").eq("user_id", userId).single();

  // Get recent trade summary for PnL chart data
  const { data: recentTrades } = await supabaseAdmin.from("trade_logs")
    .select("action, pnl, amount, token_symbol, grade, timestamp")
    .eq("user_id", userId)
    .order("timestamp", { ascending: true })
    .limit(100);

  // Build daily PnL series for chart
  const dailyPnl: Record<string, number> = {};
  (recentTrades || []).forEach(t => {
    if (t.pnl && t.action === "sell") {
      const day = new Date(t.timestamp).toISOString().split("T")[0];
      dailyPnl[day] = (dailyPnl[day] || 0) + t.pnl;
    }
  });

  const pnlSeries = Object.entries(dailyPnl)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl }));

  // Cumulative PnL series
  let cumulative = 0;
  const cumulativeSeries = pnlSeries.map(p => {
    cumulative += p.pnl;
    return { date: p.date, pnl: p.pnl, cumulative };
  });

  const winRate = perf && perf.total_trades > 0
    ? Math.round((perf.winning_trades / perf.total_trades) * 100)
    : 0;

  return NextResponse.json({
    performance: perf || {
      total_trades: 0,
      winning_trades: 0,
      total_pnl: 0,
      best_trade_pnl: 0,
      worst_trade_pnl: 0,
      sharpe_ratio: 0,
      current_grade: "C",
      api_costs_total: 0,
    },
    win_rate: winRate,
    pnl_series: cumulativeSeries,
    recent_trades: recentTrades || [],
  });
}
