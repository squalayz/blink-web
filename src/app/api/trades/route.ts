// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Trade Logs API
// GET: fetch trade logs for current user
// POST: record a new trade log entry
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

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const action = url.searchParams.get("action"); // filter by buy/sell/signal

  let query = supabaseAdmin.from("trade_logs")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq("action", action);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ trades: data || [] });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, token_symbol, token_address, amount, price, pnl, grade, trade_score, gas_cost, tx_hash, reasoning, confidence, agent_id } = body;

  if (!action || !token_symbol) {
    return NextResponse.json({ error: "action and token_symbol required" }, { status: 400 });
  }

  if (!["buy", "sell", "signal"].includes(action)) {
    return NextResponse.json({ error: "action must be buy, sell, or signal" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("trade_logs").insert({
    user_id: userId,
    agent_id: agent_id || null,
    action,
    token_symbol,
    token_address: token_address || null,
    amount: amount || 0,
    price: price || 0,
    pnl: pnl || 0,
    grade: grade || null,
    trade_score: trade_score || 0,
    gas_cost: gas_cost || 0,
    tx_hash: tx_hash || null,
    reasoning: reasoning || null,
    confidence: confidence || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update aggregated performance after each trade
  if (action === "sell" && pnl != null) {
    const { data: perf } = await supabaseAdmin.from("agent_performance")
      .select("*").eq("user_id", userId).single();

    const totalTrades = (perf?.total_trades || 0) + 1;
    const winningTrades = (perf?.winning_trades || 0) + (pnl > 0 ? 1 : 0);
    const totalPnl = (perf?.total_pnl || 0) + pnl;
    const bestPnl = Math.max(perf?.best_trade_pnl || 0, pnl);
    const worstPnl = Math.min(perf?.worst_trade_pnl || 0, pnl);

    await supabaseAdmin.from("agent_performance").upsert({
      user_id: userId,
      total_trades: totalTrades,
      winning_trades: winningTrades,
      total_pnl: totalPnl,
      best_trade_pnl: bestPnl,
      worst_trade_pnl: worstPnl,
      current_grade: grade || perf?.current_grade || "C",
      last_updated: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  return NextResponse.json({ ok: true, trade: data });
}
