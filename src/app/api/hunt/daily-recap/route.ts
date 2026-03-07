import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage, dailyRecapMessage } from "@/lib/telegram";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mishmesh.ai";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const isAuthed = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isCron = req.headers.get("x-vercel-cron-auth") === process.env.CRON_SECRET;
    // Also allow internal calls without auth (called from cron route)
    const isInternal = req.headers.get("x-internal") === "true";

    if (!isAuthed && !isCron && !isInternal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with Telegram linked
    const { data: users } = await supabaseAdmin
      .from("notification_settings")
      .select("user_id, telegram_chat_id, notify_trades")
      .not("telegram_chat_id", "is", null);

    if (!users?.length) {
      return NextResponse.json({ sent: 0, message: "No users with Telegram" });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let sentCount = 0;

    for (const user of users) {
      if (!user.telegram_chat_id || !user.notify_trades) continue;

      try {
        // Fetch last 24h trade logs
        const { data: trades } = await supabaseAdmin
          .from("trade_logs")
          .select("action, token_symbol, pnl, price")
          .eq("user_id", user.user_id)
          .gte("timestamp", since)
          .order("timestamp", { ascending: false });

        const tradeList = trades || [];

        // Calculate stats
        const totalTrades = tradeList.length;
        let wins = 0, losses = 0, netPnl = 0;
        let bestToken = "", bestPnl = -Infinity;
        let worstToken = "", worstPnl = Infinity;

        for (const t of tradeList) {
          const pnl = t.pnl || 0;
          netPnl += pnl;
          if (pnl >= 0) wins++;
          else losses++;

          if (pnl > bestPnl) { bestPnl = pnl; bestToken = t.token_symbol || "???"; }
          if (pnl < worstPnl) { worstPnl = pnl; worstToken = t.token_symbol || "???"; }
        }

        // If no trades, use defaults for best/worst
        if (totalTrades === 0) {
          bestPnl = 0; worstPnl = 0;
          bestToken = "-"; worstToken = "-";
        }

        const msg = dailyRecapMessage({
          totalTrades, wins, losses, netPnl,
          bestToken, bestPnl, worstToken, worstPnl,
        }, APP_URL);

        await sendTelegramMessage(user.telegram_chat_id, msg.text, msg.keyboard);
        sentCount++;
      } catch (err: any) {
        console.error(`[Daily Recap] Failed for user ${user.user_id}:`, err.message);
      }
    }

    return NextResponse.json({ sent: sentCount, total: users.length });
  } catch (err: any) {
    console.error("[Daily Recap] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
