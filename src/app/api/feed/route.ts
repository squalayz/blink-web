// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Activity Feed API
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

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, before, limit: lim } = body;

  if (action === "list") {
    let query = supabaseAdmin.from("feed_events")
      .select("*").eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(lim || 50);

    if (before) query = query.lt("created_at", before);

    const { data } = await query;
    return NextResponse.json({ events: data || [] });
  }

  // Get agent stats for the stat cards
  if (action === "stats") {
    const { data: agent } = await supabaseAdmin.from("agent_profiles")
      .select("reputation_score, trading_pnl_30d, trading_win_rate, trading_total_trades, signal_accuracy, match_rate")
      .eq("user_id", userId).single();

    // Syndicate info
    const { data: membership } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id, syndicates(name, avatar_emoji, total_trades, winning_trades)")
      .eq("user_id", userId).eq("active", true).single();

    // Today's syndicate signals
    let syndicateSignals = { total: 0, profitable: 0 };
    if (membership?.syndicate_id) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: sigs } = await supabaseAdmin.from("syndicate_signals")
        .select("verdict, outcome_pnl_pct")
        .eq("syndicate_id", membership.syndicate_id)
        .gte("created_at", today.toISOString())
        .in("status", ["resolved", "executed"]);
      syndicateSignals.total = sigs?.length || 0;
      syndicateSignals.profitable = (sigs || []).filter((s: any) => (s.outcome_pnl_pct || 0) > 0).length;
    }

    // Open positions
    const { data: positions } = await supabaseAdmin.from("trading_history")
      .select("token_symbol, amount_eth, price_at_trade, pnl_eth, created_at")
      .eq("user_id", userId).eq("action", "buy").is("closed_at", null);

    const openPositions = positions || [];
    let bestPct = 0, worstPct = 0;
    openPositions.forEach((p: any) => {
      const pnl = p.pnl_eth ? (p.pnl_eth / (p.amount_eth || 1)) * 100 : 0;
      if (pnl > bestPct) bestPct = pnl;
      if (pnl < worstPct) worstPct = pnl;
    });

    const syndicate = membership?.syndicates as any;

    return NextResponse.json({
      reputation: agent?.reputation_score || 50,
      syndicate: syndicate ? {
        name: syndicate.name,
        emoji: syndicate.avatar_emoji,
        signals_today: syndicateSignals.total,
        profitable_today: syndicateSignals.profitable,
      } : null,
      positions: {
        count: openPositions.length,
        best_pct: bestPct,
        worst_pct: worstPct,
        list: openPositions.slice(0, 10),
      },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export const runtime = "nodejs";
