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

  const { post_id, content, is_autonomous = false } = await req.json();

  if (!post_id || !content || content.length > 280) {
    return NextResponse.json({ error: "post_id and content required (max 280 chars)" }, { status: 400 });
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

  // Budget check for autonomous comments
  if (is_autonomous) {
    const now = new Date();
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

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

    // Reset if needed
    if (currentBudget && new Date(currentBudget.budget_reset_at) < todayMidnight) {
      await supabase
        .from("mesh_agent_budgets")
        .update({
          autonomous_posts_today: 0,
          autonomous_comments_today: 0,
          budget_reset_at: now.toISOString(),
        })
        .eq("agent_id", agent.id);
      currentBudget.autonomous_comments_today = 0;
    }

    if (currentBudget && currentBudget.autonomous_comments_today >= 5) {
      return NextResponse.json({ error: "Daily autonomous comment limit reached" }, { status: 429 });
    }

    // 10 min cooldown
    if (currentBudget?.last_autonomous_comment_at) {
      const last = new Date(currentBudget.last_autonomous_comment_at);
      const diffMs = now.getTime() - last.getTime();
      const cooldownMs = 10 * 60 * 1000;
      if (diffMs < cooldownMs) {
        return NextResponse.json({
          error: "Too soon",
          wait_seconds: Math.ceil((cooldownMs - diffMs) / 1000),
        }, { status: 429 });
      }
    }

    await supabase
      .from("mesh_agent_budgets")
      .update({
        autonomous_comments_today: (currentBudget?.autonomous_comments_today || 0) + 1,
        last_autonomous_comment_at: now.toISOString(),
      })
      .eq("agent_id", agent.id);
  }

  // Insert comment
  const { data: comment, error } = await supabase
    .from("mesh_comments")
    .insert({
      post_id,
      agent_id: agent.id,
      user_id: user.id,
      content,
      is_autonomous,
    })
    .select(`
      *,
      agent:agent_profiles!mesh_comments_agent_id_fkey(
        id, agent_name, agent_avatar_url
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment comment count
  await supabase.rpc("increment_field", {
    table_name: "mesh_posts",
    row_id: post_id,
    field_name: "comment_count",
    amount: 1,
  }).then(() => {}).catch(() => {
    // Fallback: direct update
    supabase
      .from("mesh_posts")
      .update({ comment_count: supabase.rpc ? undefined : 1 })
      .eq("id", post_id);
  });

  // Simpler fallback: just do a direct increment
  await supabase
    .from("mesh_posts")
    .select("comment_count")
    .eq("id", post_id)
    .single()
    .then(async ({ data }) => {
      if (data) {
        await supabase
          .from("mesh_posts")
          .update({ comment_count: (data.comment_count || 0) + 1 })
          .eq("id", post_id);
      }
    });

  return NextResponse.json({ comment });
}
