// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Admin API (PIN protected, comprehensive)
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PIN = "squalay2026";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, pin } = body;

  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  if (action === "dashboard") {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    // ═══ PARALLEL STAT COUNTS ═══
    const [
      usersRes, walletsRes, aiRes, tradingRes,
      depositsRes, depositVolRes, depositFeesRes,
      tradesRes, buysRes, sellsRes, skipsRes, tradeFeesRes,
      syndicatesRes, activeSynRes,
      referralsRes, referralPayRes,
      signupsTodayRes, signupsWeekRes,
      // Social counts
      postsCountRes, commentsCountRes, reactionsCountRes, matchesCountRes, messagesCountRes,
      // Platform counts
      signalsCountRes, memoriesCountRes, tokenLaunchesCountRes,
      waitlistCountRes, apiKeysCountRes, invitesCountRes,
      socialVerifCountRes, connectedAcctsCountRes,
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
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      // Social
      supabaseAdmin.from("mesh_posts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("mesh_comments").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("mesh_reactions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("matches").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("messages").select("*", { count: "exact", head: true }),
      // Platform
      supabaseAdmin.from("agent_signals").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("agent_memories").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("token_launches").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("waitlist").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("developer_api_keys").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("invites").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("social_verifications").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("connected_accounts").select("*", { count: "exact", head: true }),
    ]);

    const depositVolume = (depositVolRes.data || []).reduce((sum: number, d: any) => sum + (d.amount_eth || 0), 0);
    const depositFees = (depositFeesRes.data || []).reduce((sum: number, d: any) => sum + (d.fee_eth || 0), 0);
    const tradeFees = (tradeFeesRes.data || []).reduce((sum: number, t: any) => sum + (t.fee_eth || 0), 0);
    const referralPayouts = (referralPayRes.data || []).reduce((sum: number, r: any) => sum + (r.amount_eth || 0), 0);

    // ═══ ALL USERS + AGENTS + BALANCES ═══
    const { data: allUsers } = await supabaseAdmin.from("users")
      .select("id, name, email, wallet_address, ai_provider, ai_model, onboarded, tier, referral_code, referred_by, created_at")
      .order("created_at", { ascending: false });

    const { data: allAgents } = await supabaseAdmin.from("agent_profiles")
      .select("user_id, agent_name, mood");
    const allAgentMap: Record<string, any> = {};
    (allAgents || []).forEach((a: any) => { allAgentMap[a.user_id] = { name: a.agent_name, mood: a.mood }; });

    const { data: allBalances } = await supabaseAdmin.from("agent_balances")
      .select("user_id, trading_enabled, trading_mode, balance_eth, total_trading_pnl, risk_level");
    const balMap: Record<string, any> = {};
    (allBalances || []).forEach((b: any) => { balMap[b.user_id] = b; });

    // Live on-chain balances
    let liveBalances: Record<string, number> = {};
    try {
      const { getProvider } = await import("@/lib/wallet");
      const provider = getProvider();
      const { ethers } = await import("ethers");
      const wallets = (allUsers || []).filter(u => u.wallet_address).slice(0, 50);
      const balResults = await Promise.allSettled(
        wallets.map(async u => {
          const bal = await provider.getBalance(u.wallet_address);
          return { id: u.id, bal: parseFloat(ethers.formatEther(bal)) };
        })
      );
      balResults.forEach(r => {
        if (r.status === "fulfilled") liveBalances[r.value.id] = r.value.bal;
      });
    } catch (e) { console.error("Live balance fetch error:", e); }

    // ═══ DEPOSITS + WITHDRAWALS ═══
    const { data: deposits } = await supabaseAdmin.from("deposits")
      .select("amount_eth, fee_eth, net_eth, created_at, user_id")
      .eq("status", "confirmed").order("created_at", { ascending: false });

    const depUserIds = [...new Set((deposits || []).map(d => d.user_id))];
    const { data: depUsers } = depUserIds.length > 0
      ? await supabaseAdmin.from("users").select("id, wallet_address").in("id", depUserIds)
      : { data: [] };
    const walletMap: Record<string, string> = {};
    (depUsers || []).forEach((u: any) => { walletMap[u.id] = u.wallet_address; });

    const { data: withdrawals } = await supabaseAdmin.from("withdrawals")
      .select("amount_eth, to_address, tx_hash, status, created_at, user_id")
      .order("created_at", { ascending: false });

    // ═══ TRADES (last 100) + token frequency ═══
    const { data: trades } = await supabaseAdmin.from("trading_history")
      .select("action, token_symbol, amount_eth, fee_eth, pnl_eth, created_at, user_id")
      .order("created_at", { ascending: false }).limit(100);

    const tradeUserIds = [...new Set((trades || []).map(t => t.user_id))];
    const { data: tradeAgents } = tradeUserIds.length > 0
      ? await supabaseAdmin.from("agent_profiles").select("user_id, agent_name").in("user_id", tradeUserIds)
      : { data: [] };
    const tradeAgentMap: Record<string, string> = {};
    (tradeAgents || []).forEach((a: any) => { tradeAgentMap[a.user_id] = a.agent_name; });

    // Token frequency for leaderboard (from all trades, not just last 100)
    const { data: allTradeTokens } = await supabaseAdmin.from("trading_history")
      .select("token_symbol").not("token_symbol", "is", null);
    const tokenFreq: Record<string, number> = {};
    (allTradeTokens || []).forEach((t: any) => {
      if (t.token_symbol) tokenFreq[t.token_symbol] = (tokenFreq[t.token_symbol] || 0) + 1;
    });
    const tokenLeaderboard = Object.entries(tokenFreq)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([symbol, count]) => ({ symbol, count }));

    // ═══ MESHTRADE LOG ═══
    const { data: meshtradeLog } = await supabaseAdmin.from("meshtrade_log")
      .select("type, message, token_symbol, pnl, created_at, user_id")
      .order("created_at", { ascending: false }).limit(50);

    // ═══ ACTIVITY: feed_events + notification_log ═══
    const { data: feedEvents } = await supabaseAdmin.from("feed_events")
      .select("event_type, title, body, metadata, created_at, user_id")
      .order("created_at", { ascending: false }).limit(50);

    const { data: notifLog } = await supabaseAdmin.from("notification_log")
      .select("event, channel, status, created_at, user_id")
      .order("created_at", { ascending: false }).limit(50);

    // ═══ SOCIAL: posts, top posters ═══
    const { data: recentPosts } = await supabaseAdmin.from("mesh_posts")
      .select("id, agent_name, content, post_type, event_type, upvotes, comment_count, created_at, user_id")
      .order("created_at", { ascending: false }).limit(50);

    // Top 5 posters by count
    const posterCounts: Record<string, { name: string; count: number }> = {};
    (recentPosts || []).forEach((p: any) => {
      const name = p.agent_name || "Unknown";
      if (!posterCounts[name]) posterCounts[name] = { name, count: 0 };
      posterCounts[name].count++;
    });
    // For a proper top-5, also query all posts
    const { data: allPostAgents } = await supabaseAdmin.from("mesh_posts").select("agent_name");
    const fullPosterCounts: Record<string, { name: string; count: number }> = {};
    (allPostAgents || []).forEach((p: any) => {
      const name = p.agent_name || "Unknown";
      if (!fullPosterCounts[name]) fullPosterCounts[name] = { name, count: 0 };
      fullPosterCounts[name].count++;
    });
    const topPosters = Object.values(fullPosterCounts)
      .sort((a, b) => b.count - a.count).slice(0, 5);

    // ═══ SYNDICATES ═══
    const { data: syndicatesList } = await supabaseAdmin.from("syndicates")
      .select("id, name, status, member_count, total_pnl_eth, win_rate, avatar_emoji, created_at, created_by")
      .order("created_at", { ascending: false });

    // Syndicate member counts
    const { data: synMembers } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id").eq("active", true);
    const synMemberCounts: Record<string, number> = {};
    (synMembers || []).forEach((m: any) => {
      synMemberCounts[m.syndicate_id] = (synMemberCounts[m.syndicate_id] || 0) + 1;
    });

    // Syndicate chat counts
    const { data: synChats } = await supabaseAdmin.from("syndicate_chat")
      .select("syndicate_id");
    const synChatCounts: Record<string, number> = {};
    (synChats || []).forEach((c: any) => {
      synChatCounts[c.syndicate_id] = (synChatCounts[c.syndicate_id] || 0) + 1;
    });

    // Syndicate creator names
    const creatorIds = [...new Set((syndicatesList || []).map(s => s.created_by).filter(Boolean))];
    const { data: creatorAgents } = creatorIds.length > 0
      ? await supabaseAdmin.from("agent_profiles").select("user_id, agent_name").in("user_id", creatorIds)
      : { data: [] };
    const creatorMap: Record<string, string> = {};
    (creatorAgents || []).forEach((a: any) => { creatorMap[a.user_id] = a.agent_name; });

    // ═══ PLATFORM STATS VIEW ═══
    const { data: platformStats } = await supabaseAdmin.from("platform_stats").select("*").limit(1);

    // ═══ SIGNUPS LAST 7 DAYS (for chart) ═══
    const { data: recentSignups } = await supabaseAdmin.from("users")
      .select("created_at").gte("created_at", sevenDaysAgo);

    // ═══ RECENT ACTIVITY FEED (mixed) ═══
    // Combine recent signups, deposits, trades into one feed
    const activityFeed: any[] = [];
    // Recent signups
    const recentNewUsers = (allUsers || []).slice(0, 30);
    recentNewUsers.forEach(u => {
      activityFeed.push({
        type: "signup",
        agent_name: allAgentMap[u.id]?.name || u.name || "Anonymous",
        amount: null,
        created_at: u.created_at,
      });
    });
    // Recent deposits
    (deposits || []).slice(0, 30).forEach(d => {
      const uid = d.user_id;
      activityFeed.push({
        type: "deposit",
        agent_name: allAgentMap[uid]?.name || "Unknown",
        amount: d.amount_eth,
        created_at: d.created_at,
      });
    });
    // Recent trades
    (trades || []).slice(0, 30).forEach(t => {
      activityFeed.push({
        type: t.action || "trade",
        agent_name: tradeAgentMap[t.user_id] || "Unknown",
        amount: t.amount_eth,
        created_at: t.created_at,
      });
    });
    activityFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
        signups_week: signupsWeekRes.count || 0,
        // Social
        total_posts: postsCountRes.count || 0,
        total_comments: commentsCountRes.count || 0,
        total_reactions: reactionsCountRes.count || 0,
        total_matches: matchesCountRes.count || 0,
        total_messages: messagesCountRes.count || 0,
        // Platform
        total_signals: signalsCountRes.count || 0,
        total_memories: memoriesCountRes.count || 0,
        total_token_launches: tokenLaunchesCountRes.count || 0,
        total_waitlist: waitlistCountRes.count || 0,
        total_api_keys: apiKeysCountRes.count || 0,
        total_invites: invitesCountRes.count || 0,
        total_social_verifs: socialVerifCountRes.count || 0,
        total_connected_accts: connectedAcctsCountRes.count || 0,
      },
      all_users: (allUsers || []).map(u => ({
        ...u,
        agent_name: allAgentMap[u.id]?.name || "",
        agent_mood: allAgentMap[u.id]?.mood || "",
        trading_enabled: balMap[u.id]?.trading_enabled || false,
        trading_mode: balMap[u.id]?.trading_mode || "",
        balance_db: balMap[u.id]?.balance_eth || 0,
        balance_live: liveBalances[u.id] || 0,
        total_pnl: balMap[u.id]?.total_trading_pnl || 0,
        risk_level: balMap[u.id]?.risk_level || "",
        has_wallet: !!u.wallet_address,
        has_ai: !!u.ai_provider,
      })),
      deposits: (deposits || []).map(d => ({
        ...d, wallet: walletMap[d.user_id],
      })),
      withdrawals: (withdrawals || []).map(w => ({ ...w })),
      trades: (trades || []).map(t => ({
        ...t, agent_name: tradeAgentMap[t.user_id],
      })),
      token_leaderboard: tokenLeaderboard,
      meshtrade_log: meshtradeLog || [],
      feed_events: feedEvents || [],
      notification_log: notifLog || [],
      recent_posts: (recentPosts || []).map(p => ({ ...p })),
      top_posters: topPosters,
      syndicates_list: (syndicatesList || []).map(s => ({
        ...s,
        live_member_count: synMemberCounts[s.id] || s.member_count || 0,
        chat_count: synChatCounts[s.id] || 0,
        created_by_name: creatorMap[s.created_by] || "Unknown",
      })),
      platform_stats: platformStats?.[0] || null,
      recent_signups: (recentSignups || []).map(u => u.created_at),
      activity_feed: activityFeed.slice(0, 20),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export const runtime = "nodejs";
