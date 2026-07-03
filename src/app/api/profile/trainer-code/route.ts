// Buddy Code — the app's permanent, shareable trainer code
// (BattleSystems.swift: "Permanent 6-char public code — shareable to add
// friends. Format: BL-XXXX"). The iOS app derives it on-device; on web we
// generate once and persist it on the profile row so it's stable across
// devices.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// No 0/O or 1/I — the code gets read aloud between friends.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function genCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `BL-${s}`;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const { data: prof, error } = await supabaseAdmin
    .from("profiles")
    .select("trainer_code")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (prof?.trainer_code) {
    return NextResponse.json({ trainer_code: prof.trainer_code });
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = genCode();
    const { data: taken } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("trainer_code", code)
      .maybeSingle();
    if (taken) continue;
    const { error: saveErr } = await supabaseAdmin
      .from("profiles")
      .update({ trainer_code: code })
      .eq("user_id", user!.id);
    if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });
    return NextResponse.json({ trainer_code: code });
  }

  return NextResponse.json({ error: "Couldn't generate a code. Try again." }, { status: 500 });
}
