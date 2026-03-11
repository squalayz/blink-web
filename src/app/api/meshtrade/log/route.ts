// ══════════════════════════════════════════════════════════════
// MishMesh.ai — MeshTrade Agent Log
// POST: record a log entry (called by the trading engine)
// GET:  fetch recent log entries for the authenticated user
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_LOG_TYPES = [
  "scan", "signal", "entry", "hold",
  "exit_win", "exit_loss", "point", "reject", "error",
] as const;

type LogType = (typeof VALID_LOG_TYPES)[number];

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, message, tokenSymbol, pnl } = body;

  if (!type || !VALID_LOG_TYPES.includes(type as LogType)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_LOG_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("meshtrade_log").insert({
    user_id: user.id,
    type,
    message,
    token_symbol: tokenSymbol || null,
    pnl: pnl ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100); // clamp 1-100

  const { data, error } = await supabaseAdmin
    .from("meshtrade_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data || [] });
}
