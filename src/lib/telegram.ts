// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Telegram Bot Helpers
// Bot: @MishMeshAiBot
// ══════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mishmesh.ai";

export type InlineButton = { text: string; url?: string; callback_data?: string };

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  inlineKeyboard?: InlineButton[][],
  parseMode: "Markdown" | "HTML" = "Markdown"
) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  };
  if (inlineKeyboard?.length) {
    body.reply_markup = JSON.stringify({ inline_keyboard: inlineKeyboard });
  }

  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram send error:", err);
  }
  return res.ok;
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || "Done" }),
  });
}

export async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  inlineKeyboard?: InlineButton[][],
) {
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  if (inlineKeyboard?.length) {
    body.reply_markup = JSON.stringify({ inline_keyboard: inlineKeyboard });
  }

  await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ═══ Rich Message Templates ═══

export function welcomeMessage() {
  return {
    text: `⚡ *Welcome to MishMesh*

Your AI agent lives here.

I'll find you business partners, collaborators, and co-founders — while you sleep. Fund me with ETH on Base, and I'll:

🔗 Match you with the right people
📈 Trade to grow my own balance
💬 Notify you the second something hits

Get started at mishmesh.ai and connect your account.

Once connected, I'll handle the rest. You just show up when it matters.`,
    keyboard: [
      [
        { text: "🌐 Open MishMesh", url: APP_URL },
        { text: "📖 How It Works", url: `${APP_URL}/#how-it-works` },
      ],
    ] as InlineButton[][],
  };
}

export function welcomeLinkedMessage(userName: string) {
  return {
    text: `⚡ *Account Connected!*

Hey ${userName} — your Telegram is now linked to MishMesh.

I'll send you notifications right here when:
🔗 A new match is found
✅ Someone accepts your match
💬 You get a new message
📈 I make a trade
⚡ Your balance gets low

You don't need to do anything. I'll message you when something needs your attention. Just live your life — I'm working 24/7.

Type /help to see what I can do.`,
    keyboard: [
      [{ text: "🌐 Open Dashboard", url: `${APP_URL}/dashboard` }],
    ] as InlineButton[][],
  };
}

export function helpMessage() {
  return `⚡ *MishMesh Commands*

/status — What your agent is up to right now
/balance — Your agent's ETH balance
/matches — Pending matches waiting for you
/accept — Accept a match
/pass — Pass on a match
/settings — Notification preferences
/help — This message

💡 *Tip:* You don't need to do anything. I'll message you when something needs your attention. Just live your life — I'm working 24/7.`;
}

export function matchFoundMessage(matchId: string, score: number, synergy: string, reasoning: string) {
  return {
    text: `🔗 *New Match Found!*

*${score}% synergy* with a builder in your space.

Your agent says: _"${reasoning}"_

What do you want to do?`,
    keyboard: [
      [
        { text: "✅ Accept", callback_data: `accept:${matchId}` },
        { text: "❌ Pass", callback_data: `pass:${matchId}` },
        { text: "👀 View Details", url: `${APP_URL}/dashboard?view=pending` },
      ],
    ] as InlineButton[][],
  };
}

export function matchAcceptedMessage(otherName: string, otherBio: string, otherX?: string, otherWebsite?: string) {
  let text = `🎉 *Match Unlocked!*

You and ${otherName} are now connected.

*${otherName}*
_"${otherBio}"_`;

  if (otherX) text += `\n🐦 @${otherX}`;
  if (otherWebsite) text += `\n🔗 ${otherWebsite}`;
  text += `\n\nSend them a message — your agents already agreed you'd be a great fit.`;

  return {
    text,
    keyboard: [
      [{ text: "💬 Send Message", url: `${APP_URL}/dashboard?view=matches` }],
    ] as InlineButton[][],
  };
}

export function tradeMessage(action: string, token: string, amount: number, pnl: number, balance: number) {
  const pnlStr = pnl >= 0 ? `+${pnl.toFixed(4)}` : pnl.toFixed(4);
  return `📈 *Agent Trade*

Your agent ${action === "buy" ? "bought" : "sold"} *${token}* on Base
Amount: ${amount.toFixed(4)} ETH
Current P&L: ${pnlStr} ETH

Your balance: ${balance.toFixed(4)} ETH`;
}

export function lowBalanceMessage(balance: number) {
  return {
    text: `⚡ *Low Balance Alert*

Your agent balance is *${balance.toFixed(4)} ETH*. Matching and trading will pause soon.

Fund your agent to keep the mesh alive.`,
    keyboard: [
      [{ text: "💰 Fund Agent", url: `${APP_URL}/dashboard?view=wallet` }],
    ] as InlineButton[][],
  };
}

export function statusMessage(
  agentName: string, matchCount: number, convoCount: number,
  balance: number, isActive: boolean, tradingPnl: number
) {
  return `⚡ *Agent Status*

*${agentName}*
${isActive ? "🟢 Active — networking 24/7" : "🔴 Inactive — fund to activate"}

🔗 Matches: *${matchCount}*
💬 Conversations: *${convoCount}*
💰 Balance: *${balance.toFixed(4)} ETH*
📈 Trading P&L: *${tradingPnl >= 0 ? "+" : ""}${tradingPnl.toFixed(4)} ETH*`;
}

export function balanceMessage(balance: number, estDays: number, tradingPnl: number, isActive: boolean) {
  return {
    text: `💰 *Agent Balance*

*${balance.toFixed(4)} ETH*
${isActive ? `⏱ ~${estDays} days of matching left` : "🔴 Inactive — fund to activate"}
📈 Trading P&L: ${tradingPnl >= 0 ? "+" : ""}${tradingPnl.toFixed(4)} ETH`,
    keyboard: [
      [{ text: "💰 Fund Agent", url: `${APP_URL}/dashboard?view=wallet` }],
    ] as InlineButton[][],
  };
}

export function pendingMatchMessage(matches: any[]) {
  if (matches.length === 0) {
    return {
      text: `🔍 *No pending matches*

Your agent is still searching. I'll message you the second I find someone good.`,
      keyboard: [] as InlineButton[][],
    };
  }

  let text = `🔗 *Pending Matches (${matches.length})*\n`;
  const keyboard: InlineButton[][] = [];

  matches.slice(0, 5).forEach((m: any, i: number) => {
    const score = Math.round(m.score * 100);
    text += `\n${i + 1}. *${score}%* — ${m.synergy || "New match"}`;
    keyboard.push([
      { text: `✅ Accept #${i + 1}`, callback_data: `accept:${m.id}` },
      { text: `❌ Pass #${i + 1}`, callback_data: `pass:${m.id}` },
    ]);
  });

  if (matches.length > 5) {
    text += `\n\n_...and ${matches.length - 5} more_`;
    keyboard.push([{ text: "👀 View All", url: `${APP_URL}/dashboard?view=pending` }]);
  }

  return { text, keyboard };
}

export function settingsMessage(settings: any) {
  const on = "✅";
  const off = "❌";
  return {
    text: `⚙️ *Notification Settings*

${settings.notify_matches ? on : off} Matches
${settings.notify_messages ? on : off} Messages
${settings.notify_trades ? on : off} Trading
${settings.notify_balance ? on : off} Balance

Tap to toggle:`,
    keyboard: [
      [
        { text: `${settings.notify_matches ? "🔔" : "🔕"} Matches`, callback_data: "toggle:notify_matches" },
        { text: `${settings.notify_messages ? "🔔" : "🔕"} Messages`, callback_data: "toggle:notify_messages" },
      ],
      [
        { text: `${settings.notify_trades ? "🔔" : "🔕"} Trading`, callback_data: "toggle:notify_trades" },
        { text: `${settings.notify_balance ? "🔔" : "🔕"} Balance`, callback_data: "toggle:notify_balance" },
      ],
    ] as InlineButton[][],
  };
}
