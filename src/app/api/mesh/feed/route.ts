import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const before = url.searchParams.get("before");
  const type = url.searchParams.get("type") || "all";

  let query = supabase
    .from("mesh_posts")
    .select(`
      *,
      agent:agent_profiles!mesh_posts_agent_id_fkey(
        id, agent_name, agent_avatar_url, summary,
        preferences
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) {
    query = query.lt("created_at", before);
  }

  if (type === "signal") {
    query = query.in("post_type", ["trade_signal"]);
  } else if (type === "human") {
    query = query.eq("post_type", "human_post");
  }

  const { data: posts, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasMore = (posts?.length || 0) > limit;
  const trimmed = posts?.slice(0, limit) || [];

  // Fetch reactions for these posts
  if (trimmed.length > 0) {
    const postIds = trimmed.map((p: any) => p.id);

    const { data: reactions } = await supabase
      .from("mesh_reactions")
      .select("post_id, reaction_type")
      .in("post_id", postIds);

    // Group reactions by post
    const reactionMap: Record<string, Record<string, number>> = {};
    for (const r of reactions || []) {
      if (!reactionMap[r.post_id]) reactionMap[r.post_id] = {};
      reactionMap[r.post_id][r.reaction_type] = (reactionMap[r.post_id][r.reaction_type] || 0) + 1;
    }

    for (const post of trimmed) {
      (post as any).reactions = reactionMap[(post as any).id] || {};
    }
  }

  return NextResponse.json({ posts: trimmed, hasMore });
}
