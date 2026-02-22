import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  sendTelegramMessage, answerCallbackQuery, editMessage,
  welcomeMessage, welcomeLinkedMessage, helpMessage,
  statusMessage, balanceMessage, pendingMatchMessage, settingsMessage,
} from "@/lib/telegram";

// POST /api/telegram/webhook — receives updates from Telegram
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    console.log("[TG] Webhook received:", JSON.stringify(update).slice(0, 200));

    // Handle commands (text messages)
    if (update.message?.text) {
      console.log("[TG] Processing message:", update.message.text, "from:", update.message.chat?.id);
      await handleMessage(update.message);
      console.log("[TG] Message handled successfully");
    }

    // Handle inline button presses
    if (update.callback_query) {
      console.log("[TG] Processing callback:", update.callback_query.data);
      await handleCallback(update.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[TG] Webhook CRASH:", err.message, err.stack?.slice(0, 500));
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

// ═══ Message Handler ═══

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const fromName = message.from?.first_name || "there";

  // /start — with optional user_id for account linking
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const userId = parts[1]; // /start {user_id}

    if (userId) {
      // Link Telegram to MishMesh account
      const { data: user } = await supabaseAdmin
        .from("users").select("name").eq("id", userId).single();

      if (user) {
        // Store chat_id in notification settings
        await supabaseAdmin.from("notification_settings").upsert({
          user_id: userId,
          telegram_chat_id: String(chatId),
        }, { onConflict: "user_id" });

        const msg = welcomeLinkedMessage(user.name || fromName);
        await sendTelegramMessage(chatId, msg.text, msg.keyboard);
        return;
      }
    }

    // Generic welcome (not linked yet)
    const msg = welcomeMessage();
    await sendTelegramMessage(chatId, msg.text, msg.keyboard);
    return;
  }

  // All other commands require a linked account
  const user = await getUserByChatId(chatId);
  if (!user) {
    await sendTelegramMessage(chatId,
      "⚠️ *Account not connected*\n\nGo to mishmesh.ai → Settings → Notifications → Connect Telegram to link your account.",
      [[{ text: "🌐 Connect Account", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://mishmesh.ai"}/dashboard?view=settings` }]]
    );
    return;
  }

  // /help
  if (text === "/help") {
    await sendTelegramMessage(chatId, helpMessage());
    return;
  }

  // /status
  if (text === "/status") {
    const { data: agent } = await supabaseAdmin
      .from("agent_profiles").select("agent_name, match_count, conversation_count")
      .eq("user_id", user.id).single();
    const { data: bal } = await supabaseAdmin
      .from("agent_balances").select("total_trading_pnl")
      .eq("user_id", user.id).single();

    // Get real on-chain balance
    let onChainBalance = 0;
    if (user.wallet_address) {
      const { getWalletBalance } = await import("@/lib/wallet");
      onChainBalance = await getWalletBalance(user.wallet_address);
    }

    await sendTelegramMessage(chatId, statusMessage(
      agent?.agent_name || "Your Agent",
      agent?.match_count || 0,
      agent?.conversation_count || 0,
      onChainBalance,
      onChainBalance > 0.001,
      bal?.total_trading_pnl || 0
    ));
    return;
  }

  // /balance
  if (text === "/balance") {
    const { data: bal } = await supabaseAdmin
      .from("agent_balances").select("total_trading_pnl").eq("user_id", user.id).single();

    let onChainBalance = 0;
    if (user.wallet_address) {
      const { getWalletBalance } = await import("@/lib/wallet");
      onChainBalance = await getWalletBalance(user.wallet_address);
    }
    const estDays = onChainBalance > 0 ? Math.floor(onChainBalance / 0.0003) : 0;

    const msg = balanceMessage(onChainBalance, estDays, bal?.total_trading_pnl || 0, onChainBalance > 0.001);
    await sendTelegramMessage(chatId, msg.text, msg.keyboard);
    return;
  }

  // /matches
  if (text === "/matches") {
    const { data: matches } = await supabaseAdmin
      .from("matches").select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("created_at", { ascending: false });

    // Filter to pending for this user
    const pending = (matches || []).filter(m => {
      const isA = m.user_a === user.id;
      return isA ? m.status_a === "pending" : m.status_b === "pending";
    });

    const msg = pendingMatchMessage(pending);
    await sendTelegramMessage(chatId, msg.text, msg.keyboard.length ? msg.keyboard : undefined);
    return;
  }

  // /settings
  if (text === "/settings") {
    const { data: settings } = await supabaseAdmin
      .from("notification_settings").select("*").eq("user_id", user.id).single();

    if (settings) {
      const msg = settingsMessage(settings);
      await sendTelegramMessage(chatId, msg.text, msg.keyboard);
    }
    return;
  }

  // /accept {match_id}
  if (text.startsWith("/accept")) {
    const matchId = text.split(" ")[1];
    if (!matchId) {
      await sendTelegramMessage(chatId, "Usage: /accept {match\\_id}\n\nOr use /matches to see pending matches with buttons.");
      return;
    }
    await processMatchAction(chatId, user.id, matchId, "accepted");
    return;
  }

  // /pass {match_id}
  if (text.startsWith("/pass")) {
    const matchId = text.split(" ")[1];
    if (!matchId) {
      await sendTelegramMessage(chatId, "Usage: /pass {match\\_id}\n\nOr use /matches to see pending matches with buttons.");
      return;
    }
    await processMatchAction(chatId, user.id, matchId, "passed");
    return;
  }

  // Unknown command
  await sendTelegramMessage(chatId,
    `I didn't catch that. Type /help to see what I can do.`
  );
}

// ═══ Callback Query Handler (inline button presses) ═══

async function handleCallback(callback: any) {
  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;
  const data = callback.data || "";

  const user = await getUserByChatId(chatId);
  if (!user) {
    await answerCallbackQuery(callback.id, "Account not linked");
    return;
  }

  // accept:{matchId}
  if (data.startsWith("accept:")) {
    const matchId = data.split(":")[1];
    await processMatchAction(chatId, user.id, matchId, "accepted", callback.id, messageId);
    return;
  }

  // pass:{matchId}
  if (data.startsWith("pass:")) {
    const matchId = data.split(":")[1];
    await processMatchAction(chatId, user.id, matchId, "passed", callback.id, messageId);
    return;
  }

  // toggle:{setting}
  if (data.startsWith("toggle:")) {
    const field = data.split(":")[1];
    const validFields = ["notify_matches", "notify_messages", "notify_trades", "notify_balance"];
    if (!validFields.includes(field)) {
      await answerCallbackQuery(callback.id, "Invalid setting");
      return;
    }

    // Get current value and toggle
    const { data: settings } = await supabaseAdmin
      .from("notification_settings").select("*").eq("user_id", user.id).single();
    if (!settings) return;

    const newVal = !(settings as any)[field];
    await supabaseAdmin.from("notification_settings")
      .update({ [field]: newVal }).eq("user_id", user.id);

    const updated = { ...settings, [field]: newVal };
    const msg = settingsMessage(updated);

    await answerCallbackQuery(callback.id, `${field.replace("notify_", "")} ${newVal ? "enabled" : "disabled"}`);
    if (messageId) {
      await editMessage(chatId, messageId, msg.text, msg.keyboard);
    }
    return;
  }

  await answerCallbackQuery(callback.id);
}

// ═══ Process match accept/pass ═══

async function processMatchAction(
  chatId: number, userId: string, matchId: string,
  action: "accepted" | "passed",
  callbackId?: string, messageId?: number
) {
  const { data: match } = await supabaseAdmin
    .from("matches").select("*").eq("id", matchId).single();

  if (!match) {
    const msg = "⚠️ Match not found.";
    if (callbackId) await answerCallbackQuery(callbackId, msg);
    else await sendTelegramMessage(chatId, msg);
    return;
  }

  const isA = match.user_a === userId;
  const isB = match.user_b === userId;
  if (!isA && !isB) {
    const msg = "⚠️ Not your match.";
    if (callbackId) await answerCallbackQuery(callbackId, msg);
    else await sendTelegramMessage(chatId, msg);
    return;
  }

  const statusField = isA ? "status_a" : "status_b";
  const { data: updated } = await supabaseAdmin.from("matches")
    .update({ [statusField]: action })
    .eq("id", matchId).select().single();

  if (callbackId) {
    await answerCallbackQuery(callbackId, action === "accepted" ? "✅ Accepted!" : "❌ Passed");
  }

  if (action === "accepted") {
    // Check if both accepted
    if (updated?.revealed) {
      // Get other user's info
      const otherId = isA ? match.user_b : match.user_a;
      const { data: other } = await supabaseAdmin
        .from("users").select("name, bio, socials, avatar_url").eq("id", otherId).single();

      const otherName = other?.name || "Your match";
      const otherBio = other?.bio || "A builder in the mesh";
      const otherX = other?.socials?.x;
      const otherWebsite = other?.socials?.website;

      const APP = process.env.NEXT_PUBLIC_APP_URL || "https://mishmesh.ai";

      // Notify this user
      const revealText = `🎉 *Match Unlocked!*

You and ${otherName} are now connected.

*${otherName}*
_"${otherBio}"_${otherX ? `\n🐦 @${otherX}` : ""}${otherWebsite ? `\n🔗 ${otherWebsite}` : ""}

Send them a message — your agents already agreed you'd be a great fit.`;

      if (messageId) {
        await editMessage(chatId, messageId, revealText, [[{ text: "💬 Send Message", url: `${APP}/dashboard?view=matches` }]]);
      } else {
        await sendTelegramMessage(chatId, revealText, [[{ text: "💬 Send Message", url: `${APP}/dashboard?view=matches` }]]);
      }

      // Notify the other user via Telegram too
      const { data: otherSettings } = await supabaseAdmin
        .from("notification_settings").select("telegram_chat_id")
        .eq("user_id", otherId).single();

      if (otherSettings?.telegram_chat_id) {
        const { data: thisUser } = await supabaseAdmin
          .from("users").select("name, bio, socials").eq("id", userId).single();

        const thisName = thisUser?.name || "Your match";
        const thisBio = thisUser?.bio || "A builder in the mesh";

        await sendTelegramMessage(otherSettings.telegram_chat_id,
          `🎉 *Match Unlocked!*

You and ${thisName} are now connected.

*${thisName}*
_"${thisBio}"_${thisUser?.socials?.x ? `\n🐦 @${thisUser.socials.x}` : ""}

Send them a message — your agents already agreed you'd be a great fit.`,
          [[{ text: "💬 Send Message", url: `${APP}/dashboard?view=matches` }]]
        );
      }

      // DB notifications for both
      await supabaseAdmin.from("notifications").insert([
        { user_id: userId, type: "match_accepted", title: "Match unlocked!", body: `You and ${otherName} are connected`, metadata: { match_id: matchId } },
        { user_id: otherId, type: "match_accepted", title: "Match unlocked!", body: `You and ${(await supabaseAdmin.from("users").select("name").eq("id", userId).single()).data?.name || "someone"} are connected`, metadata: { match_id: matchId } },
      ]);
    } else {
      // Only this side accepted, waiting for other
      const msg = "✅ *Accepted!*\n\nWaiting for the other person to accept. I'll let you know.";
      if (messageId) {
        await editMessage(chatId, messageId, msg);
      } else {
        await sendTelegramMessage(chatId, msg);
      }
    }
  } else {
    // Passed
    const msg = "❌ *Passed.* I'll keep looking for better matches.";
    if (messageId) {
      await editMessage(chatId, messageId, msg);
    } else {
      await sendTelegramMessage(chatId, msg);
    }

    // Agent evolution — learn from pass
    try {
      const { evolveAgent } = await import("@/lib/matching");
      evolveAgent(userId, matchId, "passed").catch(() => {});
    } catch {}
  }
}

// ═══ Helpers ═══

async function getUserByChatId(chatId: number) {
  const { data } = await supabaseAdmin
    .from("notification_settings")
    .select("user_id")
    .eq("telegram_chat_id", String(chatId))
    .single();

  if (!data) return null;

  const { data: user } = await supabaseAdmin
    .from("users").select("*").eq("id", data.user_id).single();
  return user;
}
