// GET /api/gifts/[short_code] — public preview, no auth required.
// Does NOT spawn. Just returns enough metadata for the landing page.
//
// If the caller passes a Bearer token we compute `you_are_sender` server-side
// from the token's user.id vs gift.sender_id. We never echo sender_id itself.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { short_code: string } }) {
  const code = (params.short_code || "").trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { data: gift } = await supabaseAdmin
    .from("gifts")
    .select(
      "id, short_code, sender_id, recipient_username, asset_type, asset_payload, mode, anonymous, message, status, expires_at, claimed_at"
    )
    .eq("short_code", code)
    .maybeSingle();

  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  // Expired? Surface it cleanly.
  const expired = new Date(gift.expires_at).getTime() < Date.now();
  const status = expired && gift.status === "pending" ? "expired" : gift.status;

  // Look up sender display unless anonymous.
  let sender: { handle: string | null; display_name: string | null } | null = null;
  if (!gift.anonymous) {
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("handle, display_name")
      .eq("id", gift.sender_id)
      .maybeSingle();
    if (senderProfile) sender = senderProfile;
  }

  // If claimed, also look up the winner's handle.
  let winnerHandle: string | null = null;
  if (status === "claimed") {
    const { data: claimed } = await supabaseAdmin
      .from("gifts")
      .select("recipient_id")
      .eq("id", gift.id)
      .maybeSingle();
    if (claimed?.recipient_id) {
      const { data: winnerProfile } = await supabaseAdmin
        .from("profiles")
        .select("handle")
        .eq("id", claimed.recipient_id)
        .maybeSingle();
      winnerHandle = winnerProfile?.handle ?? null;
    }
  }

  // Sender preflight — only computed when the caller is authenticated.
  // The field is omitted on anon requests so the client defaults to false.
  const authedUser = await getAuthUser(req);
  const youAreSender = authedUser?.id === gift.sender_id ? true : undefined;

  // Public-facing payload only — never leak sender_id.
  return NextResponse.json({
    short_code: gift.short_code,
    asset_type: gift.asset_type,
    asset_payload: gift.asset_payload,
    mode: gift.mode,
    anonymous: gift.anonymous,
    message: gift.message,
    status,
    expires_at: gift.expires_at,
    claimed_at: gift.claimed_at,
    recipient_username: gift.recipient_username,
    sender,
    winner_handle: winnerHandle,
    ...(youAreSender ? { you_are_sender: true } : {}),
  });
}
