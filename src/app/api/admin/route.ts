// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Admin API (PIN protected)
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PIN = process.env.ADMIN_PIN || "squalay2026";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, pin } = body;

  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  if (action === "dashboard") {
    // ═══ STATS ═══
    const [
      usersRes, walletsRes, aiRes, tradingRes,
      depositsRes, depositVolRes, depositFeesRes,
      tradesRes, buysRes, sellsRes, skipsRes, tradeFeesRes,
      syndicatesRes, activeSynRes,
      referralsRes, referralPayRes,
      signupsTodayRes,
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).not("wallet_address", "is", null),
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).not("ai_api_key_encrypted", "is", null),
      supabaseAdmin.from("agent_balances").select("*", { count: "exact", head: true }).eq("trading_enabled", true),
      supabaseAdmin.from("deposits").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
      supabaseAdmin.from("deposits").select("amount_eth").eq("status", "confirmed"),
      supabaseAdmin.from("deposits").select("fee_eth").eq("status", "confirmed"),
      supabaseAdmin.from("trading_history").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("trading_history").select("*", { count: "exact", head: true }).eq("action", "buy"),
      supabaseAdmin.from("trading_history").select("*", { count: "exact", head: true }).eq("action", "sell"),
      supabaseAdmin.from("trading_history").select("*", { count: "exact", head: true }).eq("action", "skip"),
      supabaseAdmin.from("trading_history").select("fee_eth").not("fee_eth", "is", null),
      supabaseAdmin.from("syndicates").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("syndicates").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("referral_rewards").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("referral_rewards").select("amount_eth"),
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
    ]);

    const depositVolume = (depositVolRes.data || []).reduce((sum: number, d: any) => sum + (d.amount_eth || 0), 0);
    const depositFees = (depositFeesRes.data || []).reduce((sum: number, d: any) => sum + (d.fee_eth || 0), 0);
    const tradeFees = (tradeFeesRes.data || []).reduce((sum: number, t: any) => sum + (t.fee_eth || 0), 0);
    const referralPayouts = (referralPayRes.data || []).reduce((sum: number, r: any) => sum + (r.amount_eth || 0), 0);

    // ═══ RECENT USERS ═══
    const { data: recentUsers } = await supabaseAdmin.from("users")
      .select("id, wallet_address, created_at")
      .order("created_at", { ascending: false }).limit(20);

    // Join agent names
    const userIds = (recentUsers || []).map(u => u.id);
    const { data: agents } = await supabaseAdmin.from("agent_profiles")
      .select("user_id, agent_name").in("user_id", userIds);
    const agentMap: Record<string, string> = {};
    (agents || []).forEach((a: any) => { agentMap[a.user_id] = a.agent_name; });

    // ═══ ALL USERS (for users tab) ═══
    const { data: allUsers } = await supabaseAdmin.from("users")
      .select("id, wallet_address, ai_provider, created_at")
      .order("created_at", { ascending: false });

    const { data: allAgents } = await supabaseAdmin.from("agent_profiles")
      .select("user_id, agent_name");
    const allAgentMap: Record<string, string> = {};
    (allAgents || []).forEach((a: any) => { allAgentMap[a.user_id] = a.agent_name; });

    const { data: allBalances } = await supabaseAdmin.from("agent_balances")
      .select("user_id, trading_enabled, balance_eth");
    const balMap: Record<string, any> = {};
    (allBalances || []).forEach((b: any) => { balMap[b.user_id] = b; });

    // ═══ DEPOSITS ═══
    const { data: deposits } = await supabaseAdmin.from("deposits")
      .select("amount_eth, fee_eth, net_eth, created_at, user_id")
      .eq("status", "confirmed").order("created_at", { ascending: false });

    // Map user wallets
    const depUserIds = [...new Set((deposits || []).map(d => d.user_id))];
    const { data: depUsers } = await supabaseAdmin.from("users")
      .select("id, wallet_address").in("id", depUserIds);
    const walletMap: Record<string, string> = {};
    (depUsers || []).forEach((u: any) => { walletMap[u.id] = u.wallet_address; });

    // ═══ TRADES ═══
    const { data: trades } = await supabaseAdmin.from("trading_history")
      .select("action, token_symbol, amount_eth, fee_eth, pnl_eth, created_at, user_id")
      .order("created_at", { ascending: false }).limit(50);

    const tradeUserIds = [...new Set((trades || []).map(t => t.user_id))];
    const { data: tradeAgents } = await supabaseAdmin.from("agent_profiles")
      .select("user_id, agent_name").in("user_id", tradeUserIds);
    const tradeAgentMap: Record<string, string> = {};
    (tradeAgents || []).forEach((a: any) => { tradeAgentMap[a.user_id] = a.agent_name; });

    // ═══ SYNDICATES ═══
    const { data: syndicatesList } = await supabaseAdmin.from("syndicates")
      .select("*").order("created_at", { ascending: false });

    return NextResponse.json({
      stats: {
        total_users: usersRes.count || 0,
        users_with_wallets: walletsRes.count || 0,
        users_with_ai: aiRes.count || 0,
        trading_active: tradingRes.count || 0,
        total_deposits: depositsRes.count || 0,
        deposit_volume_eth: depositVolume,
        total_fees_eth: depositFees,
        trade_fees_eth: tradeFees,
        total_trades: tradesRes.count || 0,
        total_buys: buysRes.count || 0,
        total_sells: sellsRes.count || 0,
        total_skips: skipsRes.count || 0,
        total_syndicates: syndicatesRes.count || 0,
        active_syndicates: activeSynRes.count || 0,
        total_referrals: referralsRes.count || 0,
        referral_payouts_eth: referralPayouts,
        signups_today: signupsTodayRes.count || 0,
      },
      recent_users: (recentUsers || []).map(u => ({
        ...u, agent_name: agentMap[u.id],
      })),
      all_users: (allUsers || []).map(u => ({
        ...u, agent_name: allAgentMap[u.id],
        trading_enabled: balMap[u.id]?.trading_enabled || false,
        balance: balMap[u.id]?.balance_eth || 0,
      })),
      deposits: (deposits || []).map(d => ({
        ...d, wallet: walletMap[d.user_id],
      })),
      trades: (trades || []).map(t => ({
        ...t, agent_name: tradeAgentMap[t.user_id],
      })),
      syndicates_list: syndicatesList || [],
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export const runtime = "nodejs";
