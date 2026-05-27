// POST /api/genesis-drops/create — owner-only.
//
// Auth: requires a valid Bearer session AND `x-admin-pin: <ADMIN_PIN>` header.
// If OWNER_USER_ID is set in env, the authenticated user must also match it.
//
// Body:
//   {
//     slug: string,
//     name: string,
//     description?: string,
//     tier?: BurnTier (default 'mythic'),
//     image_cid: string,
//     metadata_cid?: string,
//     blink_reward?: number,
//     expires_hours?: number (default 168),
//     proximity_radius_m?: number (default 250),
//     waive_fee?: boolean (default true)
//   }
//
// Returns: { id, slug, share_url }

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  rateLimitByUser,
  sanitizeText,
} from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isOwnerRequest, sanitizeDropAnnouncement } from "@/lib/genesis-drops";
import { isBurnTier } from "@/lib/spawn-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARE_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL || "https://blinkworld.xyz"
).replace(/\/+$/, "");

interface CreateBody {
  slug?: unknown;
  name?: unknown;
  description?: unknown;
  tier?: unknown;
  image_cid?: unknown;
  metadata_cid?: unknown;
  blink_reward?: unknown;
  expires_hours?: unknown;
  proximity_radius_m?: unknown;
  waive_fee?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rl = rateLimitByUser(user!.id, "genesis-drops-create", 20, 60_000);
    if (rl) return rl;

    const headerPin = req.headers.get("x-admin-pin");
    if (!isOwnerRequest({ headerPin, userId: user!.id })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: CreateBody;
    try {
      body = (await req.json()) as CreateBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const slug =
      typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const name = sanitizeText(body.name, 120);
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const tier =
      typeof body.tier === "string" && isBurnTier(body.tier)
        ? body.tier
        : "mythic";

    const image_cid =
      typeof body.image_cid === "string" ? body.image_cid.trim() : "";
    if (!image_cid) {
      return NextResponse.json({ error: "image_cid required" }, { status: 400 });
    }

    const metadata_cid =
      typeof body.metadata_cid === "string" ? body.metadata_cid.trim() : null;

    const rawDescription = sanitizeText(body.description, 600);
    const description = sanitizeDropAnnouncement(rawDescription);

    const blink_reward =
      typeof body.blink_reward === "number" &&
      isFinite(body.blink_reward) &&
      body.blink_reward >= 0
        ? Math.floor(body.blink_reward)
        : null;

    const expiresHours =
      typeof body.expires_hours === "number" &&
      isFinite(body.expires_hours) &&
      body.expires_hours > 0 &&
      body.expires_hours <= 24 * 60
        ? Math.floor(body.expires_hours)
        : 168;

    const proximity_radius_m =
      typeof body.proximity_radius_m === "number" &&
      isFinite(body.proximity_radius_m) &&
      body.proximity_radius_m >= 50 &&
      body.proximity_radius_m <= 2000
        ? Math.floor(body.proximity_radius_m)
        : 250;

    const waive_fee = body.waive_fee !== false;

    const expires_at = new Date(Date.now() + expiresHours * 3600_000).toISOString();

    const { data: created, error: insertErr } = await supabaseAdmin
      .from("genesis_drops")
      .insert({
        slug,
        name,
        description: description || null,
        tier,
        image_cid,
        metadata_cid,
        blink_reward,
        expires_at,
        proximity_radius_m,
        waive_fee,
      })
      .select("id, slug")
      .single();

    if (insertErr || !created) {
      if (insertErr?.code === "23505") {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: "Failed to create drop",
          details: insertErr?.message ?? "no row returned",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: created.id,
      slug: created.slug,
      share_url: `${SHARE_ORIGIN}/drop/${created.slug}`,
    });
  } catch (err: unknown) {
    console.error("genesis-drops create unhandled", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Unexpected error: ${err.message}`
            : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
