import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ═══ CREATE VENTURE ═══
  if (action === "create_venture") {
    const { name, description } = body;
    if (!description || description.length < 10) {
      return NextResponse.json({ error: "Describe your idea in at least a sentence" }, { status: 400 });
    }

    // Generate venture wallet
    const { generateWallet } = await import("@/lib/wallet");
    const wallet = generateWallet();

    const { data, error } = await supabase.from("ventures").insert({
      name: name || description.slice(0, 60) + "...",
      description,
      founder_id: user.id,
      status: "drafting",
      wallet_address: wallet.address,
      wallet_encrypted_key: wallet.encryptedKey,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add founder as first team member
    await supabase.from("venture_members").insert({
      venture_id: data.id,
      user_id: user.id,
      role: "Founder",
      role_index: 0,
      fit_score: 100,
      status: "accepted",
      plan_section: "vision",
      accepted_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, venture: data });
  }

  // ═══ AI: ANALYZE IDEA → DETERMINE ROLES ═══
  if (action === "analyze_idea") {
    const { venture_id, description } = body;

    // Verify ownership
    const { data: venture } = await supabase.from("ventures")
      .select("*").eq("id", venture_id).eq("founder_id", user.id).single();
    if (!venture) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get user's AI key for analysis
    const { data: profile } = await supabase.from("users")
      .select("ai_provider, ai_api_key_encrypted, ai_model")
      .eq("id", user.id).single();

    // AI analysis (stubbed — real implementation calls user's AI provider)
    const roles = [
      { role: "Technical Lead", skills: ["Backend", "AI/ML", "APIs"], filled: false, locked_user_id: null },
      { role: "Design Lead", skills: ["UI/UX", "Product Design", "Figma"], filled: false, locked_user_id: null },
      { role: "Growth Lead", skills: ["Marketing", "SEO", "Social Media"], filled: false, locked_user_id: null },
      { role: "Domain Expert", skills: ["Industry Knowledge", "Customer Research"], filled: false, locked_user_id: null },
    ];

    // TODO: Call actual AI API to analyze description and determine roles
    // const analysis = await callUserAI(profile, `Analyze this startup idea and determine what 3-5 roles are needed: ${description}`);

    await supabase.from("ventures").update({
      roles_needed: roles,
      status: "drafting",
    }).eq("id", venture_id);

    return NextResponse.json({ ok: true, roles });
  }

  // ═══ START ASSEMBLY ═══
  if (action === "start_assembly") {
    const { venture_id, roles } = body;

    const { data: venture } = await supabase.from("ventures")
      .select("*").eq("id", venture_id).eq("founder_id", user.id).single();
    if (!venture) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase.from("ventures").update({
      roles_needed: roles || venture.roles_needed,
      status: "assembling",
    }).eq("id", venture_id);

    // Notify agent voice
    await supabase.from("agent_voice").insert({
      user_id: user.id,
      message_type: "insight",
      message: `Your venture "${venture.name}" is now in Assembly Mode. I'm searching the mesh for the perfect team. This may take 2-4 hours.`,
    });

    return NextResponse.json({ ok: true });
  }

  // ═══ GET VENTURE DETAILS ═══
  if (action === "get_venture") {
    const { venture_id } = body;

    const { data: venture } = await supabase.from("ventures")
      .select("*, venture_members(*, users:user_id(id, name, avatar_url, industry, bio, wallet_address))")
      .eq("id", venture_id).single();
    if (!venture) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get investments
    const { data: investmentData } = await supabase.from("venture_investments")
      .select("*, users:investor_id(name, avatar_url)")
      .eq("venture_id", venture_id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    // Get candidates (if founder)
    let candidates = null;
    if (venture.founder_id === user.id) {
      const { data: c } = await supabase.from("venture_candidates")
        .select("*, users:user_id(id, name, avatar_url, industry, bio)")
        .eq("venture_id", venture_id)
        .in("status", ["proposed", "evaluating"]);
      candidates = c;
    }

    return NextResponse.json({
      venture,
      investments: investmentData || [],
      candidates,
      isMember: venture.venture_members?.some((m: any) => m.user_id === user.id),
      isFounder: venture.founder_id === user.id,
    });
  }

  // ═══ LIST VENTURES (user's + explore) ═══
  if (action === "list_ventures") {
    const { filter } = body; // "mine" | "explore" | "invested"

    let query;
    if (filter === "mine") {
      // Ventures user is part of
      const { data: memberOf } = await supabase.from("venture_members")
        .select("venture_id").eq("user_id", user.id).in("status", ["accepted", "locked"]);
      const ids = (memberOf || []).map((m: any) => m.venture_id);

      const { data: founded } = await supabase.from("ventures")
        .select("*").eq("founder_id", user.id);

      const { data: joined } = ids.length > 0
        ? await supabase.from("ventures").select("*").in("id", ids)
        : { data: [] };

      // Merge and deduplicate
      const all = [...(founded || []), ...(joined || [])];
      const unique = Array.from(new Map(all.map(v => [v.id, v])).values());
      return NextResponse.json({ ventures: unique });
    }

    if (filter === "invested") {
      const { data: inv } = await supabase.from("venture_investments")
        .select("venture_id").eq("investor_id", user.id).eq("status", "confirmed");
      const ids = (inv || []).map((i: any) => i.venture_id);
      const { data } = ids.length > 0
        ? await supabase.from("ventures").select("*").in("id", ids).order("created_at", { ascending: false })
        : { data: [] };
      return NextResponse.json({ ventures: data || [] });
    }

    // Explore: public, active ventures
    const { data } = await supabase.from("ventures")
      .select("*")
      .eq("is_public", true)
      .in("status", ["active", "funded", "building"])
      .order("team_synergy_score", { ascending: false })
      .limit(50);

    return NextResponse.json({ ventures: data || [] });
  }

  // ═══ LOCK IN CANDIDATE ═══
  if (action === "lock_candidate") {
    const { venture_id, candidate_id, user_id: target_id, role_index } = body;

    const { data: venture } = await supabase.from("ventures")
      .select("roles_needed").eq("id", venture_id).eq("founder_id", user.id).single();
    if (!venture) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    // Update candidate status
    await supabase.from("venture_candidates")
      .update({ status: "locked" })
      .eq("id", candidate_id);

    // Add as venture member
    const roles = venture.roles_needed as any[];
    const role = roles[role_index];

    await supabase.from("venture_members").insert({
      venture_id, user_id: target_id,
      role: role?.role || "Team Member",
      role_index,
      fit_score: body.fit_score || 85,
      status: "locked",
    });

    // Update role as filled
    roles[role_index] = { ...role, filled: true, locked_user_id: target_id };
    await supabase.from("ventures").update({ roles_needed: roles }).eq("id", venture_id);

    // Check if all roles filled → transition to reviewing
    if (roles.every((r: any) => r.filled)) {
      await supabase.from("ventures").update({
        status: "reviewing",
        assembled_at: new Date().toISOString(),
      }).eq("id", venture_id);

      await supabase.from("agent_voice").insert({
        user_id: user.id,
        message_type: "milestone",
        message: `All roles filled for your venture! Team assembled with ${roles.length} members. Business plan generation starting now.`,
      });
    }

    return NextResponse.json({ ok: true, allFilled: roles.every((r: any) => r.filled) });
  }

  // ═══ INVEST IN VENTURE ═══
  if (action === "invest") {
    const { venture_id, amount_eth, tx_hash } = body;

    if (!amount_eth || amount_eth < 0.001) {
      return NextResponse.json({ error: "Minimum investment: 0.001 ETH" }, { status: 400 });
    }

    const platformFee = amount_eth * 0.1;

    const { data, error } = await supabase.from("venture_investments").insert({
      venture_id,
      investor_id: user.id,
      amount_eth: amount_eth - platformFee,
      platform_fee_eth: platformFee,
      tx_hash,
      status: tx_hash ? "confirmed" : "pending",
      confirmed_at: tx_hash ? new Date().toISOString() : null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // System message in venture chat
    await supabase.from("venture_messages").insert({
      venture_id,
      sender_id: user.id,
      message: `New investment: ${amount_eth} ETH`,
      message_type: "investment",
    });

    return NextResponse.json({ ok: true, investment: data });
  }

  // ═══ TEAM CHAT ═══
  if (action === "venture_chat_send") {
    const { venture_id, message } = body;

    // Verify membership
    const { data: member } = await supabase.from("venture_members")
      .select("id").eq("venture_id", venture_id).eq("user_id", user.id)
      .in("status", ["accepted", "locked"]).single();

    const { data: founder } = await supabase.from("ventures")
      .select("id").eq("id", venture_id).eq("founder_id", user.id).single();

    if (!member && !founder) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const { data, error } = await supabase.from("venture_messages").insert({
      venture_id,
      sender_id: user.id,
      message,
      message_type: "text",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, msg: data });
  }

  if (action === "venture_chat_history") {
    const { venture_id, limit = 50 } = body;

    const { data } = await supabase.from("venture_messages")
      .select("*, users:sender_id(name, avatar_url)")
      .eq("venture_id", venture_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({ messages: (data || []).reverse() });
  }

  // ═══ ACCEPT/DECLINE VENTURE INVITE ═══
  if (action === "respond_invite") {
    const { venture_id, accept } = body;

    await supabase.from("venture_members").update({
      status: accept ? "accepted" : "declined",
      accepted_at: accept ? new Date().toISOString() : null,
    }).eq("venture_id", venture_id).eq("user_id", user.id);

    if (accept) {
      await supabase.from("venture_messages").insert({
        venture_id,
        sender_id: user.id,
        message: "Joined the venture team!",
        message_type: "system",
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ═══ UPDATE BUSINESS PLAN ═══
  if (action === "update_plan") {
    const { venture_id, business_plan } = body;

    const { data: venture } = await supabase.from("ventures")
      .select("founder_id").eq("id", venture_id).single();
    if (!venture || venture.founder_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await supabase.from("ventures").update({
      business_plan,
      status: "active", // Plan complete → active
    }).eq("id", venture_id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export const runtime = "nodejs";
