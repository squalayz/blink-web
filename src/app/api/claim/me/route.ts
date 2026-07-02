// ════════════════════════════════════════════════════════════════════════════
// BLINK claim — authenticated balance view
//
// GET /api/claim/me returns the logged-in player's claimable points, token
// conversion, custodial ETH address (prefill for the claim form) and their
// recent claim_ledger history. Powers the /claim "Orb Bank" screen; the
// legacy claim-code + password lookup stays at /api/claim/lookup for players
// coming from the iOS app without a web session.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, username, display_name, claimable_points, total_claimed_tokens, last_claim_at, eth_address",
    )
    .eq("id", user!.id)
    .maybeSingle();

  if (profErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: ledger } = await supabaseAdmin
    .from("claim_ledger")
    .select("points_redeemed, tokens_sent, eth_address, tx_hash, status, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const claimable_points = Number(profile.claimable_points || 0);

  return NextResponse.json({
    username: profile.username,
    display_name: profile.display_name,
    claimable_points,
    tokens_available: Math.floor(claimable_points / 1000),
    total_claimed_tokens: Number(profile.total_claimed_tokens || 0),
    last_claim_at: profile.last_claim_at,
    eth_address: profile.eth_address || null,
    history: ledger ?? [],
  });
}
