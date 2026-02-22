// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Syndicates API
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkSyndicateFormation } from "@/lib/syndicate-engine";

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

async function getAgent(userId: string) {
  const { data } = await supabaseAdmin.from("agent_profiles")
    .select("id, agent_name, soul, mood").eq("user_id", userId).single();
  return data;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // Public actions (no auth)
  if (action === "leaderboard") {
    const { data } = await supabaseAdmin.from("syndicates")
      .select("*").in("status", ["active", "full"])
      .order("weekly_pnl_pct", { ascending: false }).limit(20);

    // Get members for each
    const syndicates = await Promise.all((data || []).map(async (s: any) => {
      const { data: members } = await supabaseAdmin.from("syndicate_members")
        .select("agent_id, trading_strategy, contribution_score, role, agent_profiles(agent_name, mood)")
        .eq("syndicate_id", s.id).eq("active", true);
      return { ...s, members: (members || []).map((m: any) => ({
        ...m, agent_name: m.agent_profiles?.agent_name, mood: m.agent_profiles?.mood,
      })) };
    }));

    return NextResponse.json({ syndicates });
  }

  if (action === "list") {
    const { data } = await supabaseAdmin.from("syndicates")
      .select("*").in("status", ["forming", "active"])
      .eq("invite_only", false).order("created_at", { ascending: false }).limit(30);
    return NextResponse.json({ syndicates: data || [] });
  }

  // Auth required for everything else
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile" }, { status: 404 });

  // ═══ CREATE ═══
  if (action === "create") {
    // Check not already in a syndicate
    const { data: existing } = await supabaseAdmin.from("syndicate_members")
      .select("id").eq("agent_id", agent.id).eq("active", true).limit(1);
    if (existing?.length) return NextResponse.json({ error: "Already in a syndicate. Leave first." }, { status: 400 });

    const { name, description, avatar_emoji, invite_only, min_win_rate, required_strategies } = body;
    if (!name || name.length > 24) return NextResponse.json({ error: "Name required (max 24 chars)" }, { status: 400 });

    // Get user's trading strategy
    const { data: ab } = await supabaseAdmin.from("agent_balances")
      .select("trading_mode").eq("user_id", userId).single();

    const { data: syndicate, error } = await supabaseAdmin.from("syndicates").insert({
      name, description: description || "", founder_agent_id: agent.id,
      avatar_emoji: avatar_emoji || "⚔️", invite_only: invite_only || false,
      min_win_rate: min_win_rate || 0, required_strategies: required_strategies || [],
      member_count: 1, status: "forming",
    }).select().single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Name already taken" }, { status: 400 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add founder as member
    await supabaseAdmin.from("syndicate_members").insert({
      syndicate_id: syndicate.id, agent_id: agent.id, user_id: userId,
      role: "founder", trading_strategy: ab?.trading_mode || "meme_scout",
    });

    // System chat
    await supabaseAdmin.from("syndicate_chat").insert({
      syndicate_id: syndicate.id, agent_id: agent.id, agent_name: agent.agent_name,
      content: `${agent.agent_name} founded ${name}. Recruiting members — need ${2} more to activate.`,
      message_type: "system",
    });

    return NextResponse.json({ ok: true, syndicate });
  }

  // ═══ JOIN ═══
  if (action === "join") {
    const { syndicate_id } = body;

    // Check not already in one
    const { data: existing } = await supabaseAdmin.from("syndicate_members")
      .select("id").eq("agent_id", agent.id).eq("active", true).limit(1);
    if (existing?.length) return NextResponse.json({ error: "Already in a syndicate" }, { status: 400 });

    const { data: s } = await supabaseAdmin.from("syndicates")
      .select("*").eq("id", syndicate_id).single();
    if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (s.status === "full") return NextResponse.json({ error: "Syndicate is full" }, { status: 400 });
    if (s.status === "disbanded") return NextResponse.json({ error: "Syndicate disbanded" }, { status: 400 });
    if (s.invite_only) return NextResponse.json({ error: "Invite only" }, { status: 403 });

    const { data: ab } = await supabaseAdmin.from("agent_balances")
      .select("trading_mode, total_trading_pnl, total_trades, winning_trades")
      .eq("user_id", userId).single();

    // Check requirements
    if (s.min_win_rate > 0 && ab) {
      const wr = ab.total_trades > 0 ? ab.winning_trades / ab.total_trades : 0;
      if (wr < s.min_win_rate) return NextResponse.json({ error: `Min win rate: ${(s.min_win_rate * 100).toFixed(0)}%` }, { status: 400 });
    }

    await supabaseAdmin.from("syndicate_members").insert({
      syndicate_id, agent_id: agent.id, user_id: userId,
      role: "member", trading_strategy: ab?.trading_mode || "meme_scout",
    });

    await supabaseAdmin.from("syndicates").update({
      member_count: (s.member_count || 0) + 1,
    }).eq("id", syndicate_id);

    // Chat
    await supabaseAdmin.from("syndicate_chat").insert({
      syndicate_id, agent_id: agent.id, agent_name: agent.agent_name,
      content: `${agent.agent_name} joined the syndicate.`,
      message_type: "system",
    });

    await checkSyndicateFormation(syndicate_id);
    return NextResponse.json({ ok: true });
  }

  // ═══ LEAVE ═══
  if (action === "leave") {
    const { data: membership } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id, role").eq("agent_id", agent.id).eq("active", true).single();
    if (!membership) return NextResponse.json({ error: "Not in a syndicate" }, { status: 400 });

    if (membership.role === "founder") {
      return NextResponse.json({ error: "Founders must disband. Use disband action." }, { status: 400 });
    }

    await supabaseAdmin.from("syndicate_members").update({
      active: false, left_at: new Date().toISOString(),
    }).eq("agent_id", agent.id).eq("syndicate_id", membership.syndicate_id);

    const { data: s } = await supabaseAdmin.from("syndicates")
      .select("member_count, status").eq("id", membership.syndicate_id).single();
    const newCount = Math.max(0, (s?.member_count || 1) - 1);
    await supabaseAdmin.from("syndicates").update({
      member_count: newCount,
      status: newCount < 3 ? "forming" : s?.status,
    }).eq("id", membership.syndicate_id);

    await supabaseAdmin.from("syndicate_chat").insert({
      syndicate_id: membership.syndicate_id, agent_id: agent.id, agent_name: agent.agent_name,
      content: `${agent.agent_name} left the syndicate.`, message_type: "system",
    });

    return NextResponse.json({ ok: true });
  }

  // ═══ DISBAND ═══
  if (action === "disband") {
    const { data: membership } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id, role").eq("agent_id", agent.id).eq("active", true).single();
    if (!membership || membership.role !== "founder") {
      return NextResponse.json({ error: "Only founders can disband" }, { status: 403 });
    }

    await supabaseAdmin.from("syndicates").update({
      status: "disbanded", disbanded_at: new Date().toISOString(),
    }).eq("id", membership.syndicate_id);

    await supabaseAdmin.from("syndicate_members").update({
      active: false, left_at: new Date().toISOString(),
    }).eq("syndicate_id", membership.syndicate_id);

    return NextResponse.json({ ok: true });
  }

  // ═══ INVITE ═══
  if (action === "invite") {
    const { target_agent_id, message: invMsg } = body;
    const { data: membership } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id").eq("agent_id", agent.id).eq("active", true).single();
    if (!membership) return NextResponse.json({ error: "Not in a syndicate" }, { status: 400 });

    await supabaseAdmin.from("syndicate_invites").insert({
      syndicate_id: membership.syndicate_id,
      invited_agent_id: target_agent_id,
      invited_by_agent_id: agent.id,
      message: invMsg || "",
    });

    return NextResponse.json({ ok: true });
  }

  // ═══ RESPOND INVITE ═══
  if (action === "respond_invite") {
    const { invite_id, accept } = body;
    const { data: invite } = await supabaseAdmin.from("syndicate_invites")
      .select("*").eq("id", invite_id).eq("invited_agent_id", agent.id).eq("status", "pending").single();
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    await supabaseAdmin.from("syndicate_invites").update({
      status: accept ? "accepted" : "declined", responded_at: new Date().toISOString(),
    }).eq("id", invite_id);

    if (accept) {
      // Trigger join logic
      const joinBody = { action: "join", syndicate_id: invite.syndicate_id };
      // Re-use join logic inline
      const { data: existing } = await supabaseAdmin.from("syndicate_members")
        .select("id").eq("agent_id", agent.id).eq("active", true).limit(1);
      if (existing?.length) return NextResponse.json({ error: "Already in a syndicate" }, { status: 400 });

      const { data: ab } = await supabaseAdmin.from("agent_balances")
        .select("trading_mode").eq("user_id", userId).single();

      const { data: s } = await supabaseAdmin.from("syndicates")
        .select("member_count").eq("id", invite.syndicate_id).single();

      await supabaseAdmin.from("syndicate_members").insert({
        syndicate_id: invite.syndicate_id, agent_id: agent.id, user_id: userId,
        role: "member", trading_strategy: ab?.trading_mode || "meme_scout",
      });

      await supabaseAdmin.from("syndicates").update({
        member_count: (s?.member_count || 0) + 1,
      }).eq("id", invite.syndicate_id);

      await supabaseAdmin.from("syndicate_chat").insert({
        syndicate_id: invite.syndicate_id, agent_id: agent.id, agent_name: agent.agent_name,
        content: `${agent.agent_name} accepted the invite and joined!`, message_type: "system",
      });

      await checkSyndicateFormation(invite.syndicate_id);
    }

    return NextResponse.json({ ok: true });
  }

  // ═══ KICK ═══
  if (action === "kick") {
    const { target_agent_id } = body;
    const { data: founderMembership } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id, role, contribution_score").eq("agent_id", agent.id).eq("active", true).single();
    if (!founderMembership || founderMembership.role !== "founder") {
      return NextResponse.json({ error: "Only founders can kick" }, { status: 403 });
    }

    const { data: target } = await supabaseAdmin.from("syndicate_members")
      .select("contribution_score, agent_profiles(agent_name)")
      .eq("syndicate_id", founderMembership.syndicate_id).eq("agent_id", target_agent_id).eq("active", true).single();
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if ((target.contribution_score || 0) > (founderMembership.contribution_score || 0)) {
      return NextResponse.json({ error: "Cannot kick members with higher contribution" }, { status: 403 });
    }

    await supabaseAdmin.from("syndicate_members").update({
      active: false, left_at: new Date().toISOString(),
    }).eq("syndicate_id", founderMembership.syndicate_id).eq("agent_id", target_agent_id);

    const { data: s } = await supabaseAdmin.from("syndicates")
      .select("member_count").eq("id", founderMembership.syndicate_id).single();
    await supabaseAdmin.from("syndicates").update({
      member_count: Math.max(0, (s?.member_count || 1) - 1),
    }).eq("id", founderMembership.syndicate_id);

    return NextResponse.json({ ok: true });
  }

  // ═══ MY SYNDICATE ═══
  if (action === "my_syndicate") {
    const { data: membership } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id, role, trading_strategy, contribution_score")
      .eq("agent_id", agent.id).eq("active", true).single();
    if (!membership) return NextResponse.json({ syndicate: null });

    const { data: syndicate } = await supabaseAdmin.from("syndicates")
      .select("*").eq("id", membership.syndicate_id).single();

    const { data: members } = await supabaseAdmin.from("syndicate_members")
      .select("*, agent_profiles(agent_name, mood)")
      .eq("syndicate_id", membership.syndicate_id).eq("active", true);

    // Pending invites
    const { data: invites } = await supabaseAdmin.from("syndicate_invites")
      .select("*, agent_profiles!invited_agent_id(agent_name)")
      .eq("syndicate_id", membership.syndicate_id).eq("status", "pending");

    return NextResponse.json({
      syndicate, membership,
      members: (members || []).map((m: any) => ({
        ...m, agent_name: m.agent_profiles?.agent_name, mood: m.agent_profiles?.mood,
      })),
      invites: invites || [],
    });
  }

  // ═══ DETAIL ═══
  if (action === "detail") {
    const { syndicate_id } = body;
    const { data: syndicate } = await supabaseAdmin.from("syndicates").select("*").eq("id", syndicate_id).single();
    if (!syndicate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: members } = await supabaseAdmin.from("syndicate_members")
      .select("*, agent_profiles(agent_name, mood, soul)")
      .eq("syndicate_id", syndicate_id).eq("active", true);

    return NextResponse.json({
      syndicate,
      members: (members || []).map((m: any) => ({
        ...m, agent_name: m.agent_profiles?.agent_name, mood: m.agent_profiles?.mood,
      })),
    });
  }

  // ═══ SIGNALS ═══
  if (action === "signals") {
    const { syndicate_id, limit: lim } = body;
    const { data } = await supabaseAdmin.from("syndicate_signals")
      .select("*, agent_profiles!proposer_agent_id(agent_name)")
      .eq("syndicate_id", syndicate_id)
      .order("created_at", { ascending: false }).limit(lim || 20);

    return NextResponse.json({
      signals: (data || []).map((s: any) => ({
        ...s, proposer_name: s.agent_profiles?.agent_name,
      })),
    });
  }

  // ═══ CHAT ═══
  if (action === "chat") {
    const { syndicate_id, before, limit: lim } = body;
    let query = supabaseAdmin.from("syndicate_chat")
      .select("*").eq("syndicate_id", syndicate_id)
      .order("created_at", { ascending: false }).limit(lim || 50);
    if (before) query = query.lt("created_at", before);

    const { data } = await query;
    return NextResponse.json({ messages: (data || []).reverse() });
  }

  // ═══ UPDATE SETTINGS ═══
  if (action === "update_settings") {
    const { data: membership } = await supabaseAdmin.from("syndicate_members")
      .select("syndicate_id, role").eq("agent_id", agent.id).eq("active", true).single();
    if (!membership || membership.role !== "founder") {
      return NextResponse.json({ error: "Only founders" }, { status: 403 });
    }
    const { description, invite_only, min_win_rate, required_strategies } = body;
    const updates: any = {};
    if (description !== undefined) updates.description = description;
    if (invite_only !== undefined) updates.invite_only = invite_only;
    if (min_win_rate !== undefined) updates.min_win_rate = min_win_rate;
    if (required_strategies !== undefined) updates.required_strategies = required_strategies;

    await supabaseAdmin.from("syndicates").update(updates).eq("id", membership.syndicate_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export const runtime = "nodejs";
export const maxDuration = 30;
