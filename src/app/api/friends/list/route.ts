import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FriendshipRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("friendships")
    .select("id, requester_id, recipient_id, status, created_at")
    .or(`requester_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
    .neq("status", "blocked");

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ friends: [], incoming: [], outgoing: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as FriendshipRow[];
  const otherIds = new Set<string>();
  rows.forEach((r) => {
    otherIds.add(r.requester_id === user!.id ? r.recipient_id : r.requester_id);
  });

  let profileMap = new Map<string, Record<string, unknown>>();
  if (otherIds.size > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("user_id, handle, display_name, avatar_url")
      .in("user_id", Array.from(otherIds));
    profileMap = new Map(
      (profs ?? []).map((p: Record<string, unknown>) => [p.user_id as string, p]),
    );
  }

  const enrich = (r: FriendshipRow) => {
    const otherId = r.requester_id === user!.id ? r.recipient_id : r.requester_id;
    const p = profileMap.get(otherId);
    return {
      friendship_id: r.id,
      user_id: otherId,
      handle: (p?.handle as string) ?? (p?.display_name as string) ?? null,
      avatar_url: (p?.avatar_url as string) ?? null,
      created_at: r.created_at,
    };
  };

  return NextResponse.json({
    friends: rows.filter((r) => r.status === "accepted").map(enrich),
    incoming: rows
      .filter((r) => r.status === "pending" && r.recipient_id === user!.id)
      .map(enrich),
    outgoing: rows
      .filter((r) => r.status === "pending" && r.requester_id === user!.id)
      .map(enrich),
  });
}
