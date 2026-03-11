// ══════════════════════════════════════════════════════════════
// MishMesh.ai — MeshTrade Point / Watch / Buy-Now
// POST: point the agent at a specific token, add to watchlist,
//       or request an immediate buy evaluation.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

type ActionType = "point" | "buy_now" | "watch";

const VALID_ACTIONS: ActionType[] = ["point", "buy_now", "watch"];

interface PointBody {
  tokenAddress: string;
  tokenSymbol: string;
  hint?: string;
  action: ActionType;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: PointBody = await req.json();
  const { tokenAddress, tokenSymbol, hint, action } = body;

  if (!tokenAddress || typeof tokenAddress !== "string") {
    return NextResponse.json({ error: "tokenAddress is required" }, { status: 400 });
  }
  if (!tokenSymbol || typeof tokenSymbol !== "string") {
    return NextResponse.json({ error: "tokenSymbol is required" }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "action must be point, buy_now, or watch" }, { status: 400 });
  }

  const userId = user.id;

  if (action === "point") {
    // Fetch current priority queue and append
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("mt_priority_queue")
      .eq("id", userId)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    const queue: any[] = userData?.mt_priority_queue || [];
    queue.push({
      address: tokenAddress,
      symbol: tokenSymbol,
      hint: hint || null,
      addedAt: new Date().toISOString(),
    });

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ mt_priority_queue: queue })
      .eq("id", userId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await supabaseAdmin.from("meshtrade_log").insert({
      user_id: userId,
      type: "point",
      message: `User pointed agent at ${tokenSymbol} — analyzing...`,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "watch") {
    // Fetch current watchlist and append
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("mt_watchlist")
      .eq("id", userId)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    const watchlist: any[] = userData?.mt_watchlist || [];
    watchlist.push({
      address: tokenAddress,
      symbol: tokenSymbol,
      hint: hint || null,
      addedAt: new Date().toISOString(),
    });

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ mt_watchlist: watchlist })
      .eq("id", userId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await supabaseAdmin.from("meshtrade_log").insert({
      user_id: userId,
      type: "scan",
      message: `Added ${tokenSymbol} to watchlist`,
    });

    return NextResponse.json({ ok: true });
  }

  // action === "buy_now"
  await supabaseAdmin.from("meshtrade_log").insert({
    user_id: userId,
    type: "signal",
    message: `User requested immediate buy on ${tokenSymbol} — evaluating...`,
  });

  return NextResponse.json({ ok: true, message: "Buy signal queued" });
}
