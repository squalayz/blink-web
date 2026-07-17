// ════════════════════════════════════════════════════════════════════════════
// BLINK Telegram announcements — SERVER ONLY.
//
// Posts a hype message to the BLINK Telegram group every time a payout is
// confirmed on-chain (admin approved + sent). Best-effort: a Telegram failure
// must NEVER fail or delay a payout — errors are logged and swallowed.
//
// Env:
//   BLINK_BOT_TOKEN    @TheEyeBlinkBot bot token
//   BLINK_TG_CHAT_ID   target chat (BLINK group: -1002169037859)
// ════════════════════════════════════════════════════════════════════════════

import "server-only";

const APP_LINK = "https://apps.apple.com/us/app/blinkworld/id6774225621";

function esc(s: string): string {
  // Telegram HTML parse mode — escape the three specials.
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/// Announce a confirmed payout to the BLINK group. Never throws.
export async function announcePayout(opts: {
  username: string | null;
  amountTokens: number;
  txHash: string;
}): Promise<void> {
  const token = process.env.BLINK_BOT_TOKEN;
  const chatId = process.env.BLINK_TG_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[blink-telegram] BLINK_BOT_TOKEN / BLINK_TG_CHAT_ID not set — skipping announcement");
    return;
  }

  const who = opts.username ? `@${esc(opts.username)}` : "A BlinkWorld player";
  const amount = Math.round(opts.amountTokens).toLocaleString("en-US");
  const text =
    `💼💸 <b>BLINK PAYOUT!</b> 💸💼\n\n` +
    `${who} just got <b>${amount} $BLINK</b> sent straight to their wallet for playing BlinkWorld! 🎮💰\n\n` +
    `Catch creatures. Earn Blinks. Get real $BLINK. It pays to play. 😎\n\n` +
    `📲 <a href="${APP_LINK}">Download BlinkWorld on the App Store</a>\n` +
    `🔗 <a href="https://etherscan.io/tx/${esc(opts.txHash)}">Proof on-chain</a>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        link_preview_options: { url: APP_LINK, prefer_small_media: true },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[blink-telegram] sendMessage failed:", res.status, (await res.text()).slice(0, 300));
    }
  } catch (e) {
    console.error("[blink-telegram] announce error:", e instanceof Error ? e.message : e);
  }
}
