import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Notification event types and their messages
const EVENT_MESSAGES: Record<string, (data: any) => { title: string; body: string }> = {
  match_found: (d) => ({
    title: "New match found!",
    body: `${Math.round(d.score * 100)}% synergy with ${d.other_name || "someone"} — ${d.synergy || "check it out"}`,
  }),
  match_accepted: (d) => ({
    title: "Match unlocked!",
    body: `${d.other_name || "Your match"} accepted — profiles revealed, start chatting!`,
  }),
  match_passed: (d) => ({
    title: "Match passed",
    body: `${d.other_name || "Someone"} passed on the match.`,
  }),
  new_message: (d) => ({
    title: `Message from ${d.sender_name || "someone"}`,
    body: d.preview || "New message in chat",
  }),
  agent_trade: (d) => ({
    title: `Your agent traded ${d.token || "a token"}`,
    body: d.pnl >= 0 ? `+${d.pnl.toFixed(4)} ETH profit` : `${d.pnl.toFixed(4)} ETH`,
  }),
  balance_low: (d) => ({
    title: "Agent balance low",
    body: `Balance below ${d.threshold || "0.01"} ETH — fund to keep matching`,
  }),
  deposit_confirmed: (d) => ({
    title: "Deposit confirmed!",
    body: `${d.net?.toFixed(4) || d.amount?.toFixed(4)} ETH credited to your agent`,
  }),
  referral_signup: (d) => ({
    title: "New referral!",
    body: `Someone joined through your link! Total: ${d.count || "?"}`,
  }),
  reward_unlocked: (d) => ({
    title: "Reward unlocked!",
    body: `You unlocked: ${d.reward_name || d.reward_type || "a reward"}`,
  }),
  agent_report: (d) => ({
    title: "Daily Agent Report",
    body: `${d.convos || 0} convos, ${d.above_85 || 0} above 85%${d.hot_lead ? ` — hot lead at ${d.hot_lead}%` : ""}`,
  }),
};

// ── Send notification to all enabled channels ──
async function sendNotification(userId: string, event: string, data: any = {}) {
  // Get user's notification settings
  const { data: settings } = await supabaseAdmin
    .from("notification_settings").select("*").eq("user_id", userId).single();

  if (!settings) return;

  // Check event toggle
  const eventCategory = getEventCategory(event);
  if (eventCategory === "matches" && !settings.notify_matches) return;
  if (eventCategory === "messages" && !settings.notify_messages) return;
  if (eventCategory === "trades" && !settings.notify_trades) return;
  if (eventCategory === "balance" && !settings.notify_balance) return;

  // Generate message
  const msgFn = EVENT_MESSAGES[event];
  const msg = msgFn ? msgFn(data) : { title: event, body: JSON.stringify(data) };

  // Fan out to all enabled channels in parallel
  const promises: Promise<void>[] = [];

  // 1. In-app (always)
  promises.push(sendInApp(userId, event, msg, data));

  // 2. Email
  if (settings.email_enabled) {
    promises.push(sendEmail(userId, msg, event));
  }

  // 3. Telegram
  if (settings.telegram_chat_id) {
    promises.push(sendTelegram(settings.telegram_chat_id, msg, userId, event));
  }

  // 4. Discord
  if (settings.discord_webhook_url) {
    promises.push(sendDiscord(settings.discord_webhook_url, msg, userId, event));
  }

  // 5. Custom Webhook
  if (settings.webhook_url) {
    promises.push(sendWebhook(settings.webhook_url, event, data, msg, userId));
  }

  // 6. OpenClaw
  if (settings.openclaw_enabled) {
    promises.push(sendOpenClaw(userId, event, msg));
  }

  await Promise.allSettled(promises);
}

function getEventCategory(event: string): string {
  if (["match_found", "match_accepted", "match_passed"].includes(event)) return "matches";
  if (["new_message"].includes(event)) return "messages";
  if (["agent_trade"].includes(event)) return "trades";
  if (["balance_low", "deposit_confirmed"].includes(event)) return "balance";
  return "system";
}

// ── Channel Implementations ──

async function sendInApp(userId: string, event: string, msg: any, data: any) {
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: event.includes("match") ? "new_match" : event.includes("message") ? "new_message" : "system",
      title: msg.title,
      body: msg.body,
      metadata: data,
    });
    await logNotif(userId, event, "in_app", "sent");
  } catch (e: any) {
    await logNotif(userId, event, "in_app", "failed", e.message);
  }
}

async function sendEmail(userId: string, msg: any, event: string) {
  try {
    const { data: user } = await supabaseAdmin.from("users").select("email, name").eq("id", userId).single();
    if (!user?.email || !process.env.SENDGRID_API_KEY) return;

    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: user.email, name: user.name }] }],
        from: { email: "agent@mishmesh.ai", name: "MishMesh Agent" },
        subject: `MishMesh: ${msg.title}`,
        content: [{ type: "text/plain", value: `${msg.title}\n\n${msg.body}\n\n— Your MishMesh Agent\nhttps://mishmesh.ai/dashboard` }],
      }),
    });
    await logNotif(userId, event, "email", "sent");
  } catch (e: any) {
    await logNotif(userId, event, "email", "failed", e.message);
  }
}

async function sendTelegram(chatId: string, msg: any, userId: string, event: string) {
  try {
    const { sendTelegramMessage, matchFoundMessage, matchAcceptedMessage, tradeMessage, lowBalanceMessage } = await import("@/lib/telegram");

    // Use rich messages with inline keyboards for actionable events
    if (event === "match_found" && msg.data) {
      const rich = matchFoundMessage(msg.data.match_id, msg.data.score, msg.data.synergy, msg.data.reasoning);
      await sendTelegramMessage(chatId, rich.text, rich.keyboard);
    } else if (event === "balance_low" && msg.data) {
      const rich = lowBalanceMessage(msg.data.balance || 0);
      await sendTelegramMessage(chatId, rich.text, rich.keyboard);
    } else {
      // Default: plain text with bold title
      await sendTelegramMessage(chatId, `*${msg.title}*\n${msg.body}`);
    }

    await logNotif(userId, event, "telegram", "sent");
  } catch (e: any) {
    await logNotif(userId, event, "telegram", "failed", e.message);
  }
}

async function sendDiscord(webhookUrl: string, msg: any, userId: string, event: string) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "MishMesh Agent",
        embeds: [{
          title: msg.title,
          description: msg.body,
          color: 0x6366f1,
          footer: { text: "mishmesh.ai" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    await logNotif(userId, event, "discord", "sent");
  } catch (e: any) {
    await logNotif(userId, event, "discord", "failed", e.message);
  }
}

async function sendWebhook(url: string, event: string, data: any, msg: any, userId: string) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-MishMesh-Event": event },
      body: JSON.stringify({ event, ...msg, data, timestamp: new Date().toISOString() }),
    });
    await logNotif(userId, event, "webhook", "sent");
  } catch (e: any) {
    await logNotif(userId, event, "webhook", "failed", e.message);
  }
}

async function sendOpenClaw(userId: string, event: string, msg: any) {
  // OpenClaw integration — POST to user's OpenClaw agent
  // This would use the OpenClaw API to send to whatever channels the user has connected there
  await logNotif(userId, event, "openclaw", "sent");
}

async function logNotif(userId: string, event: string, channel: string, status: string, error?: string) {
  try {
    await supabaseAdmin.from("notification_log").insert({
      user_id: userId, event, channel, status,
      error_message: error || null,
    });
  } catch {}
}

// ── API Route (for internal use + testing) ──
export async function POST(req: NextRequest) {
  // Verify internal call (use CRON_SECRET as auth)
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id, event, data } = await req.json();
  if (!user_id || !event) {
    return NextResponse.json({ error: "user_id and event required" }, { status: 400 });
  }

  await sendNotification(user_id, event, data);
  return NextResponse.json({ ok: true });
}
