// POST /api/gifts/sweep — cron sweep for expired gifts.
// Marks expired gifts as 'refunded' and clears any orphan spawns.
// Auth: shared secret header X-Cron-Secret (CRON_SECRET env var) or service
// role authorisation header.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const { data: expired, error } = await supabaseAdmin
    .from("gifts")
    .update({ status: "refunded", refunded_at: nowIso })
    .lt("expires_at", nowIso)
    .in("status", ["pending", "spawned"])
    .select("id, spawn_id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const spawnIds = (expired || []).map((g) => g.spawn_id).filter(Boolean);
  if (spawnIds.length > 0) {
    await supabaseAdmin
      .from("creature_spawns")
      .update({ expires_at: nowIso })
      .in("id", spawnIds as string[]);
  }

  return NextResponse.json({ swept: expired?.length || 0 });
}
