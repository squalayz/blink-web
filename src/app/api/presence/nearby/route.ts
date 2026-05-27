import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, isValidLat, isValidLng } from "@/lib/api-auth";
import { bboxFor, haversineM } from "@/lib/geo-fuzz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusM = Math.min(20000, Math.max(200, Number(searchParams.get("radius_m") || 5000)));
  if (!isValidLat(lat) || !isValidLng(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const box = bboxFor(lat, lng, radiusM);
  const since = new Date(Date.now() - STALE_AFTER_MS).toISOString();

  // Pull who I've blocked and who's blocked me — exclude both directions.
  const [{ data: blockedRows }, { data: blockedMeRows }, { data: friendsRows }] = await Promise.all([
    supabaseAdmin
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", user!.id),
    supabaseAdmin
      .from("user_blocks")
      .select("blocker_id")
      .eq("blocked_id", user!.id),
    supabaseAdmin
      .from("friendships")
      .select("requester_id, recipient_id, status")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user!.id},recipient_id.eq.${user!.id}`),
  ]);

  const blocked = new Set<string>([
    ...(blockedRows ?? []).map((r) => r.blocked_id as string),
    ...(blockedMeRows ?? []).map((r) => r.blocker_id as string),
  ]);
  const friends = new Set<string>(
    (friendsRows ?? []).map((r) =>
      (r.requester_id as string) === user!.id
        ? (r.recipient_id as string)
        : (r.requester_id as string),
    ),
  );

  const { data, error } = await supabaseAdmin
    .from("presence")
    .select("user_id, fuzzy_lat, fuzzy_lng, fuzzy_radius_m, last_seen, is_ghost")
    .gte("last_seen", since)
    .eq("is_ghost", false)
    .gte("fuzzy_lat", box.minLat)
    .lte("fuzzy_lat", box.maxLat)
    .gte("fuzzy_lng", box.minLng)
    .lte("fuzzy_lng", box.maxLng)
    .limit(200);

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ players: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data ?? [])
    .filter((row) => row.user_id !== user!.id && !blocked.has(row.user_id as string))
    .map((row) => ({
      user_id: row.user_id as string,
      fuzzy_lat: row.fuzzy_lat as number,
      fuzzy_lng: row.fuzzy_lng as number,
      fuzzy_radius_m: row.fuzzy_radius_m as number,
      last_seen: row.last_seen as string,
      is_friend: friends.has(row.user_id as string),
      distance_m: haversineM(lat, lng, row.fuzzy_lat as number, row.fuzzy_lng as number),
    }))
    .filter((row) => row.distance_m <= radiusM);

  // Hydrate display info from profiles (handle + avatar only — no real location).
  const userIds = filtered.map((r) => r.user_id);
  let profileMap = new Map<string, { handle: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("user_id, handle, avatar_url, display_name")
      .in("user_id", userIds);
    profileMap = new Map(
      (profs ?? []).map((p: Record<string, unknown>) => [
        p.user_id as string,
        {
          handle: (p.handle as string) ?? (p.display_name as string) ?? null,
          avatar_url: (p.avatar_url as string) ?? null,
        },
      ]),
    );
  }

  const players = filtered.map((r) => ({
    ...r,
    handle: profileMap.get(r.user_id)?.handle ?? null,
    avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
  }));

  return NextResponse.json({ players });
}
