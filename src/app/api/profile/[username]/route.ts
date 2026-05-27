import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeText } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: { username: string } }) {
  const handle = sanitizeText(decodeURIComponent(ctx.params.username), 40).replace(/^@/, "");
  if (!handle) return NextResponse.json({ error: "username required" }, { status: 400 });

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, handle, display_name, avatar_url, bio, joined_at, created_at")
    .ilike("handle", handle)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Bestiary / catch count, best-effort. Some installs use orbs.claimed_by,
  // others blink_catches.user_id — fall back gracefully.
  let bestiaryCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from("orbs")
      .select("id", { count: "exact", head: true })
      .eq("claimed_by", profile.user_id);
    if (typeof count === "number") bestiaryCount = count;
  } catch {
    /* ignore */
  }
  if (bestiaryCount === 0) {
    try {
      const { count } = await supabaseAdmin
        .from("blink_catches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id);
      if (typeof count === "number") bestiaryCount = count;
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    profile: {
      user_id: profile.user_id,
      handle: profile.handle ?? profile.display_name ?? null,
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      bio: profile.bio ?? null,
      joined_at: profile.joined_at ?? profile.created_at ?? null,
      bestiary_count: bestiaryCount,
    },
  });
}
