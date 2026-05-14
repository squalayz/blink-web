import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  // Auth check
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  let body: { orb_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orb_id } = body;
  if (!orb_id) {
    return NextResponse.json(
      { error: "Missing required field: orb_id" },
      { status: 400 }
    );
  }

  // Fetch orb
  const { data: orb, error: orbError } = await supabaseAdmin
    .from("orbs")
    .select("*")
    .eq("id", orb_id)
    .single();

  if (orbError || !orb) {
    return NextResponse.json({ error: "Orb not found" }, { status: 404 });
  }

  // Verify ownership using authenticated user
  if (orb.dropper_id !== user!.id) {
    return NextResponse.json(
      { error: "Forbidden: you did not drop this orb" },
      { status: 403 }
    );
  }

  if (orb.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot cancel orb with status: ${orb.status}` },
      { status: 409 }
    );
  }

  const cancelledAt = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("orbs")
    .update({
      status: "cancelled",
      cancel_reason: "User cancelled",
      presigned_tx: null,
    })
    .eq("id", orb_id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to cancel orb", details: updateError.message },
      { status: 500 }
    );
  }

  await supabaseAdmin
    .from("wallet_locks")
    .update({ status: "released" })
    .eq("orb_id", orb_id);

  await supabaseAdmin.from("activity").insert({
    user_id: user!.id,
    type: "orb_cancelled",
    title: "Orb Cancelled",
    subtitle: `You cancelled your orb containing ${orb.amount} ${orb.currency}`,
    amount_text: `${orb.amount} ${orb.currency}`,
    orb_id,
    amount: orb.amount,
    currency: orb.currency,
    chain: orb.chain,
    created_at: cancelledAt,
  });

  return NextResponse.json({ success: true });
}
