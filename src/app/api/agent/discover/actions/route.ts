import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "30", 10);

  const { data: actions, error } = await supabaseAdmin
    .from("agent_actions")
    .select("*, target:users!agent_actions_target_user_id_fkey(id, name, avatar_url, industry, building)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten target user info into each action
  const formatted = (actions || []).map((a: any) => ({
    id: a.id,
    action_type: a.action_type,
    target_user_id: a.target_user_id,
    target_name: a.target?.name,
    target_avatar: a.target?.avatar_url,
    target_industry: a.target?.industry,
    target_building: a.target?.building,
    score: a.metadata?.score,
    reasoning: a.reasoning,
    message_sent: a.message_sent,
    opener: a.message_sent,
    match_id: a.metadata?.match_id,
    created_at: a.created_at,
  }));

  return NextResponse.json({ actions: formatted });
}
