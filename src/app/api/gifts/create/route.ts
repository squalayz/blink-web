// POST /api/gifts/create — sender wraps an asset into a Spirit Gift link.
// No asset is moved on-chain at creation; sender keeps custody until claim
// (see src/lib/gift-escrow.ts for the design rationale).

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, rateLimitByUser, sanitizeText } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateShortCode, GiftAssetPayload } from "@/lib/gift-utils";
import {
  validateETHGift,
  validateBlinkGift,
  validateNFTGift,
} from "@/lib/gift-escrow";

export const runtime = "nodejs";

interface CreateBody {
  asset_type: "eth" | "blink" | "nft";
  asset_payload: GiftAssetPayload;
  mode?: "direct" | "public";
  anonymous?: boolean;
  message?: string;
  recipient_username?: string;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const rl = rateLimitByUser(user!.id, "gift-create", 5, 60 * 60_000);
  if (rl) return rl;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { asset_type, asset_payload, mode = "direct", anonymous = false, message, recipient_username } = body;
  if (!asset_type || !["eth", "blink", "nft"].includes(asset_type)) {
    return NextResponse.json({ error: "Bad asset_type" }, { status: 400 });
  }
  if (!asset_payload || typeof asset_payload !== "object") {
    return NextResponse.json({ error: "Bad asset_payload" }, { status: 400 });
  }
  if (!["direct", "public"].includes(mode)) {
    return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  }

  // Validate ownership / balance per asset type.
  let valid: { ok: boolean; error?: string };
  if (asset_type === "eth") {
    const amt = Number(asset_payload.amount);
    if (!isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "amount required" }, { status: 400 });
    }
    try {
      valid = await validateETHGift(user!.id, amt);
    } catch (e) {
      console.error("validateETHGift threw", e);
      return NextResponse.json({ error: "Validation failed — RPC or network issue. Please retry." }, { status: 503 });
    }
  } else if (asset_type === "blink") {
    const amt = Number(asset_payload.amount);
    if (!isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "amount required" }, { status: 400 });
    }
    try {
      valid = await validateBlinkGift(user!.id, amt);
    } catch (e) {
      console.error("validateBlinkGift threw", e);
      return NextResponse.json({ error: "Validation failed — RPC or network issue. Please retry." }, { status: 503 });
    }
  } else {
    const { contract, token_id } = asset_payload;
    if (!contract || !token_id) {
      return NextResponse.json({ error: "contract + token_id required" }, { status: 400 });
    }
    try {
      valid = await validateNFTGift(user!.id, contract, String(token_id));
    } catch (e) {
      console.error("validateNFTGift threw", e);
      return NextResponse.json({ error: "Validation failed — RPC or network issue. Please retry." }, { status: 503 });
    }
  }
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error || "Invalid gift" }, { status: 400 });
  }

  // Generate a unique short_code (collision-retry up to 5 attempts).
  let shortCode = "";
  for (let i = 0; i < 5; i++) {
    const candidate = generateShortCode();
    const { data: existing } = await supabaseAdmin
      .from("gifts")
      .select("id")
      .eq("short_code", candidate)
      .maybeSingle();
    if (!existing) {
      shortCode = candidate;
      break;
    }
  }
  if (!shortCode) {
    return NextResponse.json({ error: "Could not generate unique code" }, { status: 500 });
  }

  // Sanitize text fields.
  const cleanMessage = message ? sanitizeText(message, 280) : null;
  let cleanRecipient: string | null = null;
  if (recipient_username) {
    const u = String(recipient_username).trim().replace(/^@/, "").toLowerCase();
    if (/^[a-z0-9_]{3,30}$/.test(u)) cleanRecipient = u;
  }

  const insertRow = {
    short_code: shortCode,
    sender_id: user!.id,
    recipient_username: cleanRecipient,
    asset_type,
    asset_payload,
    mode,
    anonymous: !!anonymous,
    message: cleanMessage,
    status: "pending",
  };

  const { data: created, error: insertErr } = await supabaseAdmin
    .from("gifts")
    .insert(insertRow)
    .select("*")
    .single();
  if (insertErr || !created) {
    console.error("gift create insert", insertErr);
    return NextResponse.json({ error: "Failed to create gift" }, { status: 500 });
  }

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "blinkworld.xyz";
  const link = `${proto}://${host}/gift/${shortCode}`;

  return NextResponse.json({
    id: created.id,
    short_code: shortCode,
    link,
    expires_at: created.expires_at,
    status: created.status,
  });
}
