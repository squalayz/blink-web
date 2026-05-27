import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set(["public", "friends", "ghost"]);

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("presence_mode, privacy_intro_seen")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    presence_mode: (data?.presence_mode as string) ?? "public",
    privacy_intro_seen: Boolean(data?.privacy_intro_seen),
  });
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;
  let body: { mode?: unknown; intro_seen?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.mode === "string") {
    if (!MODES.has(body.mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    update.presence_mode = body.mode;
    // Going ghost: wipe presence row immediately.
    if (body.mode === "ghost") {
      await supabaseAdmin.from("presence").delete().eq("user_id", user!.id);
    }
  }
  if (typeof body.intro_seen === "boolean") {
    update.privacy_intro_seen = body.intro_seen;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error: upErr } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("user_id", user!.id);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
