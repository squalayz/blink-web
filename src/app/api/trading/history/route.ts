// GET /api/trading/history — full trade history + agent stats for current user
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "300"), 500);

  const [tradesRes, agentRes, ethPriceRes] = await Promise.all([
    supabaseAdmin
      .from("trading_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("agent_balances")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
      next: { revalidate: 60 },
    }).then(r => r.json()).catch(() => ({ ethereum: { usd: 2000 } })),
  ]);

  const all = tradesRes.data || [];
  const agent = agentRes.data;
  const ethUsd: number = ethPriceRes?.ethereum?.usd || 2000;

  // ── Open positions (buys without closed_at)
  const openPositions = all.filter((t: any) => t.action === "buy" && !t.closed_at);

  // ── Closed trades
  const closedTrades = all.filter((t: any) => t.closed_at && t.pnl_eth != null);
  const wins = closedTrades.filter((t: any) => (t.pnl_eth || 0) > 0);
  const losses = closedTrades.filter((t: any) => (t.pnl_eth || 0) < 0);
  const totalPnl = closedTrades.reduce((s: number, t: any) => s + (t.pnl_eth || 0), 0);
  const avgWin = wins.length ? wins.reduce((s: number, t: any) => s + (t.pnl_eth || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s: number, t: any) => s + (t.pnl_eth || 0), 0) / losses.length : 0;
  const bestTrade = closedTrades.length ? closedTrades.reduce((a: any, b: any) => (a.pnl_eth || 0) > (b.pnl_eth || 0) ? a : b, closedTrades[0]) : null;
  const worstTrade = closedTrades.length ? closedTrades.reduce((a: any, b: any) => (a.pnl_eth || 0) < (b.pnl_eth || 0) ? a : b, closedTrades[0]) : null;

  // ── Today
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTrades = closedTrades.filter((t: any) => t.closed_at?.startsWith(todayStr));
  const todayPnl = todayTrades.reduce((s: number, t: any) => s + (t.pnl_eth || 0), 0);

  // ── Equity curve (daily cumulative)
  const sorted = [...closedTrades].sort((a: any, b: any) =>
    new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime()
  );
  const dailyMap: Record<string, number> = {};
  for (const t of sorted) {
    const day = new Date(t.closed_at).toISOString().split("T")[0];
    dailyMap[day] = (dailyMap[day] || 0) + (t.pnl_eth || 0);
  }
  let cumulative = 0;
  const pnl_series = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => { cumulative += pnl; return { date, pnl, cumulative }; });

  // ── Streak
  let streak = 0;
  const recentClosed = [...closedTrades].sort((a: any, b: any) =>
    new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime()
  );
  if (recentClosed.length) {
    const dir = (recentClosed[0].pnl_eth || 0) >= 0 ? 1 : -1;
    for (const t of recentClosed) {
      if (((t.pnl_eth || 0) >= 0 ? 1 : -1) === dir) streak++;
      else break;
    }
    streak = streak * dir;
  }

  // ── All activity feed (buys + sells + skips, newest first)
  const activityFeed = all
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  return NextResponse.json({
    eth_usd: ethUsd,
    agent: agent || null,
    trades: all,
    open_positions: openPositions,
    activity_feed: activityFeed,
    pnl_series,
    stats: {
      total_closed: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      skips: all.filter((t: any) => t.action === "skip").length,
      win_rate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
      total_pnl: totalPnl,
      total_pnl_usd: totalPnl * ethUsd,
      today_pnl: todayPnl,
      today_pnl_usd: todayPnl * ethUsd,
      today_trades: todayTrades.length,
      avg_win: avgWin,
      avg_loss: avgLoss,
      best_trade: bestTrade,
      worst_trade: worstTrade,
      streak,
      open_count: openPositions.length,
      total_fees: agent?.total_fees || 0,
      total_pnl_all_time: agent?.total_trading_pnl || totalPnl,
    },
  });
}
