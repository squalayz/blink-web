// ══════════════════════════════════════════════════════════════
// MishMesh.ai — MeshTrade Agent Settings
// POST: update agent trading parameters (aggression, limits,
//       stop-loss, take-profit, unleashed toggle).
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

interface SettingsBody {
  aggression?: number;
  maxTrade?: number;
  stopLoss?: number;
  takeProfit?: number;
  unleashed?: boolean;
}

function validateRange(value: number | undefined, min: number, max: number, name: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return `${name} must be a number`;
  if (value < min || value > max) return `${name} must be between ${min} and ${max}`;
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: SettingsBody = await req.json();
  const { aggression, maxTrade, stopLoss, takeProfit, unleashed } = body;

  // Validate ranges
  const checks = [
    validateRange(aggression, 0, 100, "aggression"),
    validateRange(maxTrade, 5, 500, "maxTrade"),
    validateRange(stopLoss, 5, 30, "stopLoss"),
    validateRange(takeProfit, 10, 300, "takeProfit"),
  ];
  const firstError = checks.find((e) => e !== null);
  if (firstError) return NextResponse.json({ error: firstError }, { status: 400 });

  if (unleashed !== undefined && typeof unleashed !== "boolean") {
    return NextResponse.json({ error: "unleashed must be a boolean" }, { status: 400 });
  }

  // Build update payload — only include fields that were provided
  const update: Record<string, any> = {};
  if (aggression !== undefined) update.mt_aggression = aggression;
  if (maxTrade !== undefined) update.mt_max_trade = maxTrade;
  if (stopLoss !== undefined) update.mt_stop_loss = stopLoss;
  if (takeProfit !== undefined) update.mt_take_profit = takeProfit;
  if (unleashed !== undefined) update.mt_unleashed = unleashed;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update(update)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log unleashed state changes
  if (unleashed === true) {
    await supabaseAdmin.from("meshtrade_log").insert({
      user_id: user.id,
      type: "scan",
      message: "Agent unleashed — beginning autonomous hunt",
    });
  } else if (unleashed === false) {
    await supabaseAdmin.from("meshtrade_log").insert({
      user_id: user.id,
      type: "scan",
      message: "Agent paused — standing down",
    });
  }

  return NextResponse.json({ ok: true });
}
