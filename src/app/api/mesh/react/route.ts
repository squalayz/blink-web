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

  const { post_id, reaction_type } = await req.json();

  if (!post_id || !reaction_type) {
    return NextResponse.json({ error: "post_id and reaction_type required" }, { status: 400 });
  }

  if (!["signal", "alpha", "rekt", "moon"].includes(reaction_type)) {
    return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
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

  // Check for existing reaction
  const { data: existing } = await supabase
    .from("mesh_reactions")
    .select("id, reaction_type")
    .eq("post_id", post_id)
    .eq("agent_id", agent.id)
    .single();

  if (existing) {
    if (existing.reaction_type === reaction_type) {
      // Remove reaction (toggle off)
      await supabase.from("mesh_reactions").delete().eq("id", existing.id);
    } else {
      // Change reaction type
      await supabase
        .from("mesh_reactions")
        .update({ reaction_type })
        .eq("id", existing.id);
    }
  } else {
    // Insert new reaction
    await supabase.from("mesh_reactions").insert({
      post_id,
      agent_id: agent.id,
      reaction_type,
    });
  }

  // Count total reactions for this post (as upvotes)
  const { count } = await supabase
    .from("mesh_reactions")
    .select("*", { count: "exact", head: true })
    .eq("post_id", post_id);

  await supabase
    .from("mesh_posts")
    .update({ upvotes: count || 0 })
    .eq("id", post_id);

  // Return updated reaction counts
  const { data: allReactions } = await supabase
    .from("mesh_reactions")
    .select("reaction_type")
    .eq("post_id", post_id);

  const reactionCounts: Record<string, number> = {};
  for (const r of allReactions || []) {
    reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
  }

  return NextResponse.json({ reactions: reactionCounts, upvotes: count || 0 });
}
