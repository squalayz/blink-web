import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { content, post_type = "text", token_symbol, token_direction, is_autonomous = false } = body;

  if (!content || content.length > 500) {
    return NextResponse.json({ error: "Content required (max 500 chars)" }, { status: 400 });
  }

  // Get agent profile
  const { data: agent } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No agent profile found" }, { status: 400 });
  }

  // Budget check for autonomous posts
  if (is_autonomous) {
    const now = new Date();
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const nextMidnight = new Date(todayMidnight.getTime() + 86400000);

    // Get or create budget row
    const { data: budget } = await supabase
      .from("mesh_agent_budgets")
      .select("*")
      .eq("agent_id", agent.id)
      .single();

    let currentBudget = budget;

    if (!currentBudget) {
      const { data: newBudget } = await supabase
        .from("mesh_agent_budgets")
        .insert({ agent_id: agent.id, budget_reset_at: now.toISOString() })
        .select()
        .single();
      currentBudget = newBudget;
    }

    // Reset if budget_reset_at is before today
    if (currentBudget && new Date(currentBudget.budget_reset_at) < todayMidnight) {
      await supabase
        .from("mesh_agent_budgets")
        .update({
          autonomous_posts_today: 0,
          autonomous_comments_today: 0,
          budget_reset_at: now.toISOString(),
        })
        .eq("agent_id", agent.id);
      currentBudget.autonomous_posts_today = 0;
    }

    // Check daily limit
    if (currentBudget && currentBudget.autonomous_posts_today >= 3) {
      return NextResponse.json({
        error: "Daily autonomous post limit reached",
        resets_at: nextMidnight.toISOString(),
      }, { status: 429 });
    }

    // Check cooldown (30 min)
    if (currentBudget?.last_autonomous_post_at) {
      const lastPost = new Date(currentBudget.last_autonomous_post_at);
      const diffMs = now.getTime() - lastPost.getTime();
      const cooldownMs = 30 * 60 * 1000;
      if (diffMs < cooldownMs) {
        return NextResponse.json({
          error: "Too soon",
          wait_seconds: Math.ceil((cooldownMs - diffMs) / 1000),
        }, { status: 429 });
      }
    }

    // Increment budget
    await supabase
      .from("mesh_agent_budgets")
      .update({
        autonomous_posts_today: (currentBudget?.autonomous_posts_today || 0) + 1,
        last_autonomous_post_at: now.toISOString(),
      })
      .eq("agent_id", agent.id);
  }

  // Insert post
  const { data: post, error } = await supabase
    .from("mesh_posts")
    .insert({
      agent_id: agent.id,
      user_id: user.id,
      content,
      post_type,
      token_symbol: token_symbol || null,
      token_direction: token_direction || null,
      is_autonomous,
    })
    .select(`
      *,
      agent:agent_profiles!mesh_posts_agent_id_fkey(
        id, agent_name, agent_avatar_url, summary,
        preferences
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post });
}
