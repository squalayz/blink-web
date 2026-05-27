// POST /api/gifts/[short_code]/avatar — recipient avatar heartbeat.
// Enforces 2 m/s speed cap and 1500m soft fence. Server is the source of
// truth — client can't cheat by reporting impossible jumps.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isValidLat, isValidLng, rateLimitByUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { haversineM } from "@/lib/geo-fuzz";

export const runtime = "nodejs";

const MAX_SPEED_MPS = 2.0; // brisk walk
const MAX_FENCE_M = 1500;
const SPEED_TOLERANCE = 1.4; // allow short bursts (e.g. GPS jitter)

export async function POST(req: NextRequest, { params }: { params: { short_code: string } }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const rl = rateLimitByUser(user!.id, "gift-avatar", 120, 60_000);
  if (rl) return rl;

  const code = (params.short_code || "").trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  let body: { avatar_lat: number; avatar_lng: number; dt_ms?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isValidLat(body.avatar_lat) || !isValidLng(body.avatar_lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const { data: gift } = await supabaseAdmin
    .from("gifts")
    .select("id, status, recipient_id, expires_at")
    .eq("short_code", code)
    .maybeSingle();
  if (!gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  if (gift.recipient_id !== user!.id) {
    return NextResponse.json({ error: "Not your gift" }, { status: 403 });
  }
  if (gift.status !== "spawned") {
    return NextResponse.json({ error: `Gift status: ${gift.status}` }, { status: 410 });
  }
  if (new Date(gift.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Gift expired" }, { status: 410 });
  }

  const { data: prev } = await supabaseAdmin
    .from("gift_avatars")
    .select("*")
    .eq("gift_id", gift.id)
    .maybeSingle();
  if (!prev) return NextResponse.json({ error: "Avatar not found" }, { status: 404 });

  // Fence check.
  const distFromAnchor = haversineM(prev.anchor_lat, prev.anchor_lng, body.avatar_lat, body.avatar_lng);
  if (distFromAnchor > MAX_FENCE_M) {
    return NextResponse.json(
      { error: "Out of bounds (max 1.5km from start)", fence: MAX_FENCE_M },
      { status: 400 }
    );
  }

  // Speed check (vs last update). If the client supplied a sane dt_ms, use it;
  // otherwise derive from wall clock.
  const lastT = new Date(prev.last_update).getTime();
  const nowMs = Date.now();
  const dtMs = Math.max(50, Math.min(60_000, body.dt_ms || nowMs - lastT));
  const movedM = haversineM(prev.avatar_lat, prev.avatar_lng, body.avatar_lat, body.avatar_lng);
  const speedMps = movedM / (dtMs / 1000);
  if (speedMps > MAX_SPEED_MPS * SPEED_TOLERANCE) {
    return NextResponse.json(
      {
        error: "Moving too fast",
        max_mps: MAX_SPEED_MPS,
        observed_mps: Number(speedMps.toFixed(2)),
      },
      { status: 400 }
    );
  }

  await supabaseAdmin
    .from("gift_avatars")
    .update({
      avatar_lat: body.avatar_lat,
      avatar_lng: body.avatar_lng,
      last_update: new Date(nowMs).toISOString(),
    })
    .eq("gift_id", gift.id);

  return NextResponse.json({ ok: true, avatar: { lat: body.avatar_lat, lng: body.avatar_lng } });
}
