// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Reputation Engine
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase-admin";

export async function calculateReputation(agentId: string, userId: string): Promise<number> {
  // Trading: 30d P&L percentile (40%)
  const { data: trades } = await supabaseAdmin.from("trading_history")
    .select("pnl_eth, action").eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

  const closed = (trades || []).filter((t: any) => t.pnl_eth != null);
  const wins = closed.filter((t: any) => t.pnl_eth > 0).length;
  const winRate = closed.length > 0 ? wins / closed.length : 0.5;
  const totalPnl = closed.reduce((s: number, t: any) => s + (t.pnl_eth || 0), 0);
  const tradingScore = Math.min(100, Math.max(0, 50 + totalPnl * 500 + winRate * 30));

  // Signal accuracy (25%)
  const { data: signals } = await supabaseAdmin.from("syndicate_signals")
    .select("verdict, outcome_pnl_pct").eq("proposer_agent_id", agentId)
    .eq("verdict", "approved");
  const approvedSignals = signals || [];
  const profitableSignals = approvedSignals.filter((s: any) => (s.outcome_pnl_pct || 0) > 0).length;
  const signalScore = approvedSignals.length > 0 ? (profitableSignals / approvedSignals.length) * 100 : 50;

  // Match rate (20%)
  const { data: agent } = await supabaseAdmin.from("agent_profiles")
    .select("conversation_count, match_count").eq("id", agentId).single();
  const convos = agent?.conversation_count || 0;
  const matches = agent?.match_count || 0;
  const matchRate = convos > 0 ? (matches / convos) * 100 : 50;

  // Syndicate contribution (15%)
  const { data: member } = await supabaseAdmin.from("syndicate_members")
    .select("contribution_score").eq("agent_id", agentId).eq("active", true).single();
  const syndicateScore = (member?.contribution_score || 0.5) * 100;

  const reputation = Math.round(
    tradingScore * 0.40 +
    signalScore * 0.25 +
    matchRate * 0.20 +
    syndicateScore * 0.15
  );

  return Math.max(0, Math.min(100, reputation));
}

export async function updateReputation(agentId: string, userId: string) {
  const { data: current } = await supabaseAdmin.from("agent_profiles")
    .select("reputation_score").eq("id", agentId).single();
  const oldScore = current?.reputation_score || 50;
  const newScore = await calculateReputation(agentId, userId);

  if (oldScore !== newScore) {
    await supabaseAdmin.from("agent_profiles").update({
      reputation_score: newScore, reputation_updated_at: new Date().toISOString(),
    }).eq("id", agentId);

    await supabaseAdmin.from("reputation_history").insert({
      agent_id: agentId, old_score: oldScore, new_score: newScore,
      change_reason: newScore > oldScore ? "performance_up" : "performance_down",
    });

    // Feed event if significant change (±3 or more) — but ONLY if we haven't posted one recently
    const diff = newScore - oldScore;
    if (Math.abs(diff) >= 3) {
      // Dedup: check if we already posted a reputation event in the last 4 hours
      const fourHoursAgo = new Date(Date.now() - 4 * 3600_000).toISOString();
      const { count } = await supabaseAdmin.from("feed_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "reputation_change")
        .gte("created_at", fourHoursAgo);

      if ((count || 0) === 0) {
        await supabaseAdmin.from("feed_events").insert({
          user_id: userId, event_type: "reputation_change",
          title: diff > 0 ? `Reputation rose to ${newScore}` : `Reputation dropped to ${newScore}`,
          body: diff > 0 ? `+${diff} — strong performance this period` : `${diff} — recent losses pulled your score down`,
          metadata: { old_score: oldScore, new_score: newScore, diff },
        });
      }
    }
  }

  return newScore;
}

export async function updateAllReputations() {
  const { data: agents } = await supabaseAdmin.from("agent_profiles")
    .select("id, user_id").not("user_id", "is", null);
  for (const a of agents || []) {
    try { await updateReputation(a.id, a.user_id); } catch {}
  }
}

// Write feed events from various engines
export async function writeFeedEvent(
  userId: string, eventType: string, title: string,
  body?: string, metadata?: any, pinned?: boolean,
) {
  await supabaseAdmin.from("feed_events").insert({
    user_id: userId, event_type: eventType, title, body,
    metadata: metadata || {}, pinned: pinned || false,
  });
}
