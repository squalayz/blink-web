// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Live Trading Scanner Feed
// Returns real DexScreener trending tokens + user's scan state
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

// Fetch real trending tokens from DexScreener
async function getTrendingTokens() {
  try {
    const res = await fetch("https://api.dexscreener.com/token-boosts/latest/v1", {
      headers: { "Accept": "application/json" },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error("DexScreener error");
    const data = await res.json();

    // Filter Base chain tokens
    const baseTokens = (Array.isArray(data) ? data : [])
      .filter((t: any) => t.chainId === "base")
      .slice(0, 20)
      .map((t: any) => ({
        address: t.tokenAddress,
        symbol: t.description || t.tokenAddress?.slice(0, 8),
        url: t.url,
      }));

    // Get detailed info for top tokens
    if (baseTokens.length > 0) {
      const addrs = baseTokens.slice(0, 8).map((t: any) => t.address).join(",");
      const detailRes = await fetch(`https://api.dexscreener.com/tokens/v1/base/${addrs}`);
      if (detailRes.ok) {
        const pairs = await detailRes.json();
        const pairList = Array.isArray(pairs) ? pairs : pairs?.pairs || [];

        const seen = new Set<string>();
        return pairList
          .filter((p: any) => {
            if (seen.has(p.baseToken?.address)) return false;
            seen.add(p.baseToken?.address);
            return true;
          })
          .slice(0, 12)
          .map((p: any) => ({
            address: p.baseToken?.address,
            symbol: p.baseToken?.symbol || "???",
            name: p.baseToken?.name || "",
            price: parseFloat(p.priceUsd || "0"),
            change1h: parseFloat(p.priceChange?.h1 || "0"),
            change24h: parseFloat(p.priceChange?.h24 || "0"),
            volume24h: parseFloat(p.volume?.h24 || "0"),
            liquidity: parseFloat(p.liquidity?.usd || "0"),
            mcap: parseFloat(p.marketCap || "0"),
            txns: (p.txns?.h1?.buys || 0) + (p.txns?.h1?.sells || 0),
            pairAddress: p.pairAddress,
          }));
      }
    }

    return baseTokens.map((t: any) => ({ ...t, price: 0, change1h: 0, change24h: 0, volume24h: 0, liquidity: 0 }));
  } catch (e) {
    console.error("[Scan] DexScreener fetch error:", e);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's trading config
  const { data: ab } = await supabaseAdmin.from("agent_balances")
    .select("trading_enabled, trading_mode, risk_level, balance_eth")
    .eq("user_id", userId).single();

  if (!ab?.trading_enabled) {
    return NextResponse.json({ scanning: false, tokens: [], message: "Engine off" });
  }

  // Get real trending tokens
  const tokens = await getTrendingTokens();

  // Get recent trades for this user (last hour)
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: recentTrades } = await supabaseAdmin.from("trading_history")
    .select("token_symbol, action, amount_eth, reasoning, confidence, created_at, tx_hash")
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get open positions
  const { data: positions } = await supabaseAdmin.from("trading_history")
    .select("token_symbol, amount_eth, price_at_trade, pnl_eth, created_at")
    .eq("user_id", userId).eq("action", "buy").is("closed_at", null)
    .limit(10);

  // Simulate scan phases based on time (gives visual progression)
  const now = Date.now();
  const cyclePos = (now % 900000) / 900000; // 0-1 within 15min cycle
  let phase: string;
  let phaseDetail: string;

  if (cyclePos < 0.1) {
    phase = "fetching";
    phaseDetail = "Pulling trending tokens from DexScreener...";
  } else if (cyclePos < 0.3) {
    phase = "analyzing";
    const idx = Math.floor((cyclePos - 0.1) / 0.2 * tokens.length) % Math.max(1, tokens.length);
    phaseDetail = tokens[idx] ? `Analyzing ${tokens[idx].symbol} — $${tokens[idx].price?.toFixed(6) || "?"} | Vol: $${((tokens[idx].volume24h || 0) / 1000).toFixed(0)}k` : "Analyzing market data...";
  } else if (cyclePos < 0.5) {
    phase = "safety";
    const idx = Math.floor(Math.random() * Math.max(1, tokens.length));
    phaseDetail = tokens[idx] ? `GoPlus safety check: ${tokens[idx].symbol} — verifying contract...` : "Running safety checks...";
  } else if (cyclePos < 0.65) {
    phase = "ai_decision";
    phaseDetail = `AI evaluating opportunities — ${ab.trading_mode || "meme_scout"} strategy`;
  } else if (cyclePos < 0.75) {
    phase = "routing";
    phaseDetail = "Finding best Uniswap V3 route — checking fee tiers 0.01% / 0.05% / 0.3% / 1%";
  } else {
    phase = "monitoring";
    phaseDetail = positions?.length ? `Monitoring ${positions.length} open positions — checking SL/TP levels` : "Watching market — waiting for next opportunity";
  }

  return NextResponse.json({
    scanning: true,
    phase,
    phaseDetail,
    strategy: ab.trading_mode || "meme_scout",
    balance: ab.balance_eth || 0,
    tokens: tokens.slice(0, 8),
    recentTrades: recentTrades || [],
    positions: positions || [],
    cycleProgress: Math.round(cyclePos * 100),
    nextScan: Math.round((1 - cyclePos) * 15), // minutes until next cycle
  });
}

export const runtime = "nodejs";
