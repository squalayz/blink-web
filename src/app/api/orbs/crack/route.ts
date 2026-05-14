import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser, isValidLat, isValidLng } from "@/lib/api-auth";

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  // 2. Rate limit: 10 cracks per minute per user
  const rlError = rateLimitByUser(user!.id, "crack", 10, 60_000);
  if (rlError) return rlError;

  let body: {
    orb_id: string;
    hunter_wallet: string;
    lat: number;
    lng: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orb_id, hunter_wallet, lat, lng } = body;
  const hunter_id = user!.id; // Use authenticated user, not request body

  if (!orb_id || !hunter_wallet) {
    return NextResponse.json(
      { error: "Missing required fields: orb_id, hunter_wallet" },
      { status: 400 }
    );
  }

  // Validate GPS coordinates
  if (!isValidLat(lat) || !isValidLng(lng)) {
    return NextResponse.json(
      { error: "Invalid GPS coordinates" },
      { status: 400 }
    );
  }

  // 3. Fetch orb
  const { data: orb, error: orbError } = await supabaseAdmin
    .from("orbs")
    .select("*")
    .eq("id", orb_id)
    .single();

  if (orbError || !orb) {
    return NextResponse.json({ error: "Creature not found" }, { status: 404 });
  }

  // 4. Verify status is pending
  if (orb.status !== "pending") {
    return NextResponse.json(
      { error: `Creature is not available to catch (status: ${orb.status})` },
      { status: 409 }
    );
  }

  if (orb.dropper_id === hunter_id) {
    return NextResponse.json(
      { error: "You cannot catch your own creature" },
      { status: 403 }
    );
  }

  // 5. GPS proximity check — must be within 50m
  const maxRadius = Math.min(orb.radius_meters ?? 100, 50); // Cap at 50m server-side
  const distance = distanceMeters(lat, lng, orb.latitude ?? orb.lat, orb.longitude ?? orb.lng);

  if (distance > maxRadius) {
    return NextResponse.json(
      {
        error: "Too far from creature",
        distance_meters: Math.round(distance),
        required_meters: maxRadius,
      },
      { status: 403 }
    );
  }

  // 6. Call the Supabase edge function
  const edgeFunctionUrl =
    "https://kirgpeovueddvqtjxioj.supabase.co/functions/v1/crack-orb";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  try {
    const edgeRes = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        orbId: orb_id,
        hunterUserId: hunter_id,
        hunterWallet: hunter_wallet,
        gpsLat: lat,
        gpsLng: lng,
      }),
    });

    const edgeData = await edgeRes.json();

    if (!edgeRes.ok) {
      return NextResponse.json(
        { error: edgeData.error ?? "Edge function failed" },
        { status: edgeRes.status }
      );
    }

    // 7. Insert activity for hunter
    const hunterProfile = await supabaseAdmin
      .from("profiles")
      .select("handle, avatar_url")
      .eq("id", hunter_id)
      .single();

    const { error: hunterActivityErr } = await supabaseAdmin.from("activity").insert({
      user_id: hunter_id,
      type: "crack",
      title: "Creature Caught",
      subtitle: `You caught a creature and claimed ${orb.amount} ${orb.currency}`,
      amount_text: `${orb.amount} ${orb.currency}`,
      tx_hash: edgeData.txHash ?? null,
    });

    if (hunterActivityErr) {
      console.error("Failed to insert hunter activity:", hunterActivityErr.message);
    }

    // 8. Insert activity for dropper
    if (orb.dropper_id) {
      const { error: dropperActivityErr } = await supabaseAdmin.from("activity").insert({
        user_id: orb.dropper_id,
        type: "orb_cracked",
        title: "Your Creature Was Caught",
        subtitle: `Someone found and caught your creature containing ${orb.amount} ${orb.currency}`,
        amount_text: `${orb.amount} ${orb.currency}`,
        tx_hash: edgeData.txHash ?? null,
        related_profile_id: hunter_id,
        related_profile_handle: hunterProfile.data?.handle ?? null,
        related_profile_avatar_url: hunterProfile.data?.avatar_url ?? null,
      });

      if (dropperActivityErr) {
        console.error("Failed to insert dropper activity:", dropperActivityErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      tx_hash: edgeData.txHash ?? null,
      explorer_url: edgeData.explorerUrl ?? null,
      amount: orb.amount,
      currency: orb.currency,
      chain: orb.chain,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Edge function call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
