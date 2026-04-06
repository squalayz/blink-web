import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: trail, error: trailError } = await supabaseAdmin
    .from("trails")
    .select("*, creator:profiles!trails_creator_id_fkey(id, handle, display_name, avatar_url)")
    .eq("id", id)
    .single();

  if (trailError || !trail) {
    return NextResponse.json({ error: "Trail not found" }, { status: 404 });
  }

  // Get trail orbs — only expose position 1 clue fully, rest locked
  const { data: trailOrbs } = await supabaseAdmin
    .from("trail_orbs")
    .select("id, trail_id, position, clue_text, hint_image_url, hint_audio_url, hint_unlocked_after_minutes, is_finale")
    .eq("trail_id", id)
    .order("position", { ascending: true });

  const safeOrbs = (trailOrbs ?? []).map((o) => ({
    ...o,
    clue_text: o.position === 1 ? o.clue_text : "???",
    hint_image_url: o.position === 1 ? o.hint_image_url : null,
    hint_audio_url: o.position === 1 ? o.hint_audio_url : null,
  }));

  // Top 3 completions
  const { data: topCompletions } = await supabaseAdmin
    .from("trail_progress")
    .select("*, user:profiles!trail_progress_user_id_fkey(id, handle, display_name, avatar_url)")
    .eq("trail_id", id)
    .not("completed_at", "is", null)
    .order("finish_rank", { ascending: true })
    .limit(3);

  return NextResponse.json({
    trail,
    orbs: safeOrbs,
    topCompletions: topCompletions ?? [],
  });
}
