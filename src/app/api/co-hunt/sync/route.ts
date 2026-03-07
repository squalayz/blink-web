import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage, coHuntSharedTokenMessage } from "@/lib/telegram";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mishmesh.ai";

export async function POST(req: NextRequest) {
  try {
    const { userId, tokenSymbol, tokenAddress, chainId, action } = await req.json();

    if (!userId || !tokenSymbol) {
      return NextResponse.json({ error: "Missing userId or tokenSymbol" }, { status: 400 });
    }

    // Find active co-hunts for this user
    const { data: coHunts } = await supabaseAdmin
      .from("co_hunts")
      .select("*")
      .eq("status", "active")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    if (!coHunts?.length) {
      return NextResponse.json({ synced: false, sharedWithPartner: false, reason: "no_active_cohunt" });
    }

    let sharedWithPartner = false;

    for (const ch of coHunts) {
      const isA = ch.user_a === userId;
      const myTokensField = isA ? "user_a_tokens" : "user_b_tokens";
      const partnerTokensField = isA ? "user_b_tokens" : "user_a_tokens";
      const partnerId = isA ? ch.user_b : ch.user_a;

      // Update my token list
      const myTokens: string[] = (ch as any)[myTokensField] || [];
      if (!myTokens.includes(tokenSymbol)) {
        myTokens.push(tokenSymbol);
      }

      // Check if partner is also watching this token
      const partnerTokens: string[] = (ch as any)[partnerTokensField] || [];
      const isShared = partnerTokens.includes(tokenSymbol);

      // Update shared tokens list
      let sharedTokens: string[] = ch.shared_tokens || [];
      if (isShared && !sharedTokens.includes(tokenSymbol)) {
        sharedTokens.push(tokenSymbol);
      }

      // Save updates
      await supabaseAdmin
        .from("co_hunts")
        .update({
          [myTokensField]: myTokens,
          shared_tokens: sharedTokens,
        })
        .eq("id", ch.id);

      // If shared, notify both users via Telegram
      if (isShared) {
        sharedWithPartner = true;

        try {
          const { data: partner } = await supabaseAdmin.from("users").select("name").eq("id", partnerId).single();
          const { data: me } = await supabaseAdmin.from("users").select("name").eq("id", userId).single();

          // Notify me
          const { data: mySettings } = await supabaseAdmin
            .from("notification_settings")
            .select("telegram_chat_id")
            .eq("user_id", userId)
            .single();

          if (mySettings?.telegram_chat_id) {
            const msg = coHuntSharedTokenMessage(partner?.name || "Your partner", tokenSymbol, chainId || "base", APP_URL);
            await sendTelegramMessage(mySettings.telegram_chat_id, msg.text, msg.keyboard);
          }

          // Notify partner
          const { data: partnerSettings } = await supabaseAdmin
            .from("notification_settings")
            .select("telegram_chat_id")
            .eq("user_id", partnerId)
            .single();

          if (partnerSettings?.telegram_chat_id) {
            const msg = coHuntSharedTokenMessage(me?.name || "Your partner", tokenSymbol, chainId || "base", APP_URL);
            await sendTelegramMessage(partnerSettings.telegram_chat_id, msg.text, msg.keyboard);
          }
        } catch {} // Don't fail if notifications fail
      }
    }

    return NextResponse.json({ synced: true, sharedWithPartner });
  } catch (err: any) {
    console.error("[Co-Hunt Sync]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
