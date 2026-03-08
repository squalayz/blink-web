import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/signals — fetch public or network signals
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.id;
    const chain = req.nextUrl.searchParams.get("chain");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const network = req.nextUrl.searchParams.get("network") === "true";

    if (network) {
      // --- Network signals: from matches + co-hunt partners ---

      // Get matches (both directions)
      const { data: matchesA } = await supabaseAdmin.from("matches")
        .select("user_b").eq("user_a", userId).eq("status", "active");
      const { data: matchesB } = await supabaseAdmin.from("matches")
        .select("user_a").eq("user_b", userId).eq("status", "active");

      const matchIds = [
        ...(matchesA || []).map(m => m.user_b),
        ...(matchesB || []).map(m => m.user_a),
      ];

      // Get co-hunt partners
      const { data: coHunts } = await supabaseAdmin.from("co_hunts")
        .select("initiator_id, partner_id")
        .or(`initiator_id.eq.${userId},partner_id.eq.${userId}`)
        .eq("status", "active");

      const coHuntPartners = (coHunts || []).map(ch =>
        ch.initiator_id === userId ? ch.partner_id : ch.initiator_id
      );

      // Combine unique network IDs
      const allNetworkIds = [...new Set([...matchIds, ...coHuntPartners])];
      const coHuntSet = new Set(coHuntPartners);

      if (allNetworkIds.length === 0) {
        return NextResponse.json({ signals: [] });
      }

      // Fetch signals from network agents
      const { data: agentProfiles } = await supabaseAdmin
        .from("agent_profiles")
        .select("id, user_id, agent_name")
        .in("user_id", allNetworkIds);

      if (!agentProfiles?.length) {
        return NextResponse.json({ signals: [] });
      }

      const agentIds = agentProfiles.map(a => a.id);
      const agentMap = new Map(agentProfiles.map(a => [a.id, a]));

      let query = supabaseAdmin
        .from("agent_signals")
        .select("*")
        .in("agent_id", agentIds)
        .order("broadcast_at", { ascending: false })
        .limit(limit);

      if (chain) query = query.eq("chain_id", chain);

      const { data: signals } = await query;

      // Get trust scores
      const { data: trustData } = await supabaseAdmin
        .from("agent_signal_trust")
        .select("agent_id, trust_score")
        .in("agent_id", agentIds);

      const trustMap = new Map((trustData || []).map(t => [t.agent_id, t.trust_score]));

      // Weight and enrich signals
      const enriched = (signals || []).map(s => {
        const agent = agentMap.get(s.agent_id);
        const agentUserId = agent?.user_id;
        const isCoHunt = agentUserId ? coHuntSet.has(agentUserId) : false;
        const multiplier = isCoHunt ? 1.5 : 1.2;
        const trustScore = trustMap.get(s.agent_id) || 0;

        return {
          ...s,
          agent_name: agent?.agent_name || "Unknown Agent",
          trust_score: trustScore,
          weighted_confidence: (s.confidence || 0) * multiplier,
          source: isCoHunt ? "co_hunt" : "match",
        };
      });

      // Sort by weighted confidence descending
      enriched.sort((a, b) => b.weighted_confidence - a.weighted_confidence);

      return NextResponse.json({ signals: enriched });
    }

    // --- Public signals ---
    let query = supabaseAdmin
      .from("agent_signals")
      .select("*")
      .eq("is_public", true)
      .order("broadcast_at", { ascending: false })
      .limit(limit);

    if (chain) query = query.eq("chain_id", chain);

    const { data: signals } = await query;

    if (!signals?.length) {
      return NextResponse.json({ signals: [] });
    }

    // Enrich with agent names and trust scores
    const agentIds = [...new Set(signals.map(s => s.agent_id))];

    const [{ data: agents }, { data: trustData }] = await Promise.all([
      supabaseAdmin.from("agent_profiles").select("id, agent_name").in("id", agentIds),
      supabaseAdmin.from("agent_signal_trust").select("agent_id, trust_score").in("agent_id", agentIds),
    ]);

    const agentNameMap = new Map((agents || []).map(a => [a.id, a.agent_name]));
    const trustMap = new Map((trustData || []).map(t => [t.agent_id, t.trust_score]));

    const enriched = signals.map(s => ({
      ...s,
      agent_name: agentNameMap.get(s.agent_id) || "Unknown Agent",
      trust_score: trustMap.get(s.agent_id) || 0,
    }));

    return NextResponse.json({ signals: enriched });
  } catch (err: any) {
    console.error("[Signals GET]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/signals — broadcast a new signal
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tokenSymbol, tokenAddress, chainId, signalType, confidence, score } = await req.json();

    if (!tokenSymbol || !signalType) {
      return NextResponse.json({ error: "Missing tokenSymbol or signalType" }, { status: 400 });
    }

    // Get user's agent profile
    const { data: agent } = await supabaseAdmin
      .from("agent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "No agent profile found" }, { status: 404 });
    }

    // Insert signal
    const { data: signal, error } = await supabaseAdmin
      .from("agent_signals")
      .insert({
        agent_id: agent.id,
        token_symbol: tokenSymbol,
        token_address: tokenAddress || null,
        chain_id: chainId || "base",
        signal_type: signalType,
        confidence: confidence || 0.5,
        score: score || null,
        broadcast_at: new Date().toISOString(),
        is_public: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Update agent_signal_trust — increment total_signals
    const { data: existingTrust } = await supabaseAdmin
      .from("agent_signal_trust")
      .select("*")
      .eq("agent_id", agent.id)
      .single();

    if (existingTrust) {
      await supabaseAdmin
        .from("agent_signal_trust")
        .update({ total_signals: (existingTrust.total_signals || 0) + 1 })
        .eq("agent_id", agent.id);
    } else {
      await supabaseAdmin
        .from("agent_signal_trust")
        .insert({ agent_id: agent.id, total_signals: 1, correct_signals: 0, accuracy: 0, trust_score: 0.5 });
    }

    return NextResponse.json({ signal });
  } catch (err: any) {
    console.error("[Signals POST]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/signals — resolve a signal outcome
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { signalId, outcome, pnlResult } = await req.json();

    if (!signalId || !outcome) {
      return NextResponse.json({ error: "Missing signalId or outcome" }, { status: 400 });
    }

    // Update signal with outcome
    const { data: updatedSignal, error } = await supabaseAdmin
      .from("agent_signals")
      .update({
        outcome,
        pnl_result: pnlResult || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", signalId)
      .select("agent_id")
      .single();

    if (error) throw error;

    // Recalculate trust for this agent
    const agentId = updatedSignal.agent_id;

    const { data: allSignals } = await supabaseAdmin
      .from("agent_signals")
      .select("outcome")
      .eq("agent_id", agentId)
      .not("outcome", "is", null);

    const total = allSignals?.length || 0;
    const correct = (allSignals || []).filter(s => s.outcome === "correct").length;
    const accuracy = total > 0 ? correct / total : 0;
    const trustScore = Math.min(1, 0.3 + accuracy * 0.7);

    await supabaseAdmin
      .from("agent_signal_trust")
      .upsert({
        agent_id: agentId,
        total_signals: total,
        correct_signals: correct,
        accuracy,
        trust_score: trustScore,
      }, { onConflict: "agent_id" });

    return NextResponse.json({ updated: true });
  } catch (err: any) {
    console.error("[Signals PATCH]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
