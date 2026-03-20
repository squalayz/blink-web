// GET /api/trading/history — all trade history for current user
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500);

  const { data: trades, error } = await supabaseAdmin
    .from("trading_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = trades || [];

  // Build cumulative P&L series from closed trades
  const closed = all
    .filter((t: any) => t.closed_at && t.pnl_eth != null)
    .sort((a: any, b: any) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());

  let cumulative = 0;
  const dailyMap: Record<string, number> = {};
  for (const t of closed) {
    const day = new Date(t.closed_at).toISOString().split("T")[0];
    dailyMap[day] = (dailyMap[day] || 0) + (t.pnl_eth || 0);
  }
  const pnl_series = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl, cumulative };
    });

  // Stats
  const closedTrades = all.filter((t: any) => t.closed_at && t.pnl_eth != null);
  const wins = closedTrades.filter((t: any) => t.pnl_eth > 0);
  const totalPnl = closedTrades.reduce((s: number, t: any) => s + (t.pnl_eth || 0), 0);
  const openPositions = all.filter((t: any) => t.action === "buy" && !t.closed_at);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayPnl = closedTrades
    .filter((t: any) => t.closed_at && t.closed_at.startsWith(todayStr))
    .reduce((s: number, t: any) => s + (t.pnl_eth || 0), 0);

  return NextResponse.json({
    trades: all,
    open_positions: openPositions,
    pnl_series,
    stats: {
      total_trades: closedTrades.length,
      wins: wins.length,
      losses: closedTrades.length - wins.length,
      win_rate: closedTrades.length > 0 ? Math.round((wins.length / closedTrades.length) * 100) : 0,
      total_pnl: totalPnl,
      today_pnl: todayPnl,
      open_count: openPositions.length,
    },
  });
}
