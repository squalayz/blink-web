import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser, sanitizeText, isPositiveFinite } from "@/lib/api-auth";
import { FEE_WALLETS, type OrbCurrency } from "@/lib/theme";

const VALID_CURRENCIES: OrbCurrency[] = ["SOL", "ETH", "BTC"];

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rlError = rateLimitByUser(user!.id, "fund", 10, 60_000);
  if (rlError) return rlError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orb_id, currency, amount } = body;

  if (!orb_id || typeof orb_id !== "string") {
    return NextResponse.json({ error: "Missing orb_id" }, { status: 400 });
  }

  if (!currency || !VALID_CURRENCIES.includes(currency as OrbCurrency)) {
    return NextResponse.json({ error: "Invalid currency. Must be SOL, ETH, or BTC" }, { status: 400 });
  }

  if (!isPositiveFinite(amount)) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  // Fetch the orb
  const { data: orb, error: fetchError } = await supabaseAdmin
    .from("orbs")
    .select("*")
    .eq("id", orb_id)
    .single();

  if (fetchError || !orb) {
    return NextResponse.json({ error: "Orb not found" }, { status: 404 });
  }

  // Validate ownership
  if (orb.dropper_id !== user!.id) {
    return NextResponse.json({ error: "Not your orb" }, { status: 403 });
  }

  // Validate status
  if (orb.status !== "unfunded") {
    return NextResponse.json({ error: "Orb is not in unfunded status" }, { status: 400 });
  }

  // Check deadline
  const now = new Date();
  if (orb.fund_deadline && new Date(orb.fund_deadline) < now) {
    // Expired — update status and return error
    await supabaseAdmin
      .from("orbs")
      .update({ status: "expired", expired_at: now.toISOString() })
      .eq("id", orb_id);

    return NextResponse.json({ error: "Fund deadline has passed. Orb expired." }, { status: 410 });
  }

  const fundedAt = now.toISOString();
  const message = sanitizeText(body.message, 500);
  const typedCurrency = currency as OrbCurrency;

  // Update orb: unfunded → pending, set currency/amount/message
  const { data: updatedOrb, error: updateError } = await supabaseAdmin
    .from("orbs")
    .update({
      status: "pending",
      funded_at: fundedAt,
      currency: typedCurrency,
      amount,
      message: message || null,
      fee_wallet: FEE_WALLETS[typedCurrency],
      fee_percent: 0.1,
      chain: typedCurrency === "BTC" ? "bitcoin" : typedCurrency === "ETH" ? "ethereum" : "solana",
    })
    .eq("id", orb_id)
    .select()
    .single();

  if (updateError || !updatedOrb) {
    return NextResponse.json(
      { error: "Failed to fund orb", details: updateError?.message },
      { status: 500 }
    );
  }

  // Create wallet_lock
  await supabaseAdmin.from("wallet_locks").insert({
    user_id: user!.id,
    orb_id: orb_id,
    amount,
    currency: typedCurrency,
    status: "locked",
    created_at: fundedAt,
  });

  // Insert activity
  await supabaseAdmin.from("activity").insert({
    user_id: user!.id,
    type: "fund",
    title: "Orb Funded",
    subtitle: `You funded an orb with ${amount} ${typedCurrency}`,
    amount_text: `${amount} ${typedCurrency}`,
    orb_id: orb_id,
    amount,
    currency: typedCurrency,
    chain: typedCurrency === "BTC" ? "bitcoin" : typedCurrency === "ETH" ? "ethereum" : "solana",
    created_at: fundedAt,
  });

  return NextResponse.json({ success: true, orb: updatedOrb });
}
