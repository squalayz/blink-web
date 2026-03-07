import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage, huntAlertMessage } from "@/lib/telegram";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mishmesh.ai";

export async function POST(req: NextRequest) {
  try {
    const { userId, token } = await req.json();

    if (!userId || !token?.symbol) {
      return NextResponse.json({ error: "Missing userId or token" }, { status: 400 });
    }

    // Look up user's telegram settings
    const { data: settings } = await supabaseAdmin
      .from("notification_settings")
      .select("telegram_chat_id, notify_trades, hunt_alerts_enabled, hunt_alert_min_score")
      .eq("user_id", userId)
      .single();

    if (!settings?.telegram_chat_id) {
      return NextResponse.json({ sent: false, reason: "no_telegram" });
    }

    if (!settings.notify_trades) {
      return NextResponse.json({ sent: false, reason: "trades_disabled" });
    }

    if (settings.hunt_alerts_enabled === false) {
      return NextResponse.json({ sent: false, reason: "hunt_alerts_disabled" });
    }

    // Check minimum score threshold
    const minScore = settings.hunt_alert_min_score ?? 75;
    if (token.score < minScore) {
      return NextResponse.json({ sent: false, reason: "below_threshold" });
    }

    const msg = huntAlertMessage(token, APP_URL);

    try {
      await sendTelegramMessage(settings.telegram_chat_id, msg.text, msg.keyboard);
      return NextResponse.json({ sent: true });
    } catch (err: any) {
      console.error("[Hunt Alert] Telegram send failed:", err.message);
      return NextResponse.json({ sent: false, reason: "send_failed" });
    }
  } catch (err: any) {
    console.error("[Hunt Alert] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
