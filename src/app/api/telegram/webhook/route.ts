import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  new_chat_members?: TelegramUser[];
}

interface TelegramChatMemberUpdate {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member: { user: TelegramUser; status: string };
  new_chat_member: { user: TelegramUser; status: string };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: TelegramChatMemberUpdate;
  chat_member?: TelegramChatMemberUpdate;
}

function buildWelcomeMessage(firstName: string): string {
  return [
    `👁 Welcome to BLINK, ${firstName}!`,
    ``,
    `The Eye is open. Mystical creatures spawn on a real-world map every minute — walk up, catch them, mint them as NFTs, earn $BLINK tokens.`,
    ``,
    `🟢 *Sign up & start hunting:*`,
    `https://blinkworld.xyz`,
    ``,
    `🟢 *Mint a Genesis NFT:*`,
    `https://mintmyblink.com`,
    ``,
    `*Don't blink.*`,
  ].join("\n");
}

async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyToMessageId?: number,
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: false,
  };
  if (replyToMessageId !== undefined) {
    body.reply_to_message_id = replyToMessageId;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[telegram] sendMessage failed: ${res.status} ${errBody}`);
  }
}

const CONTRACT_KEYWORD_PATTERNS: RegExp[] = [
  /\bcontract address\b/i,
  /\btoken address\b/i,
  /\bblink contract\b/i,
  /\bwhat is the contract\b/i,
  /\btoken contract\b/i,
  /\bcontract\b/i,
  /\bca\b/i,
];

function matchesContractKeyword(text: string): boolean {
  if (text.length >= 80) {
    const trimmed = text.trim().toLowerCase();
    const exactPhrases = [
      "contract",
      "ca",
      "token address",
      "contract address",
      "blink contract",
      "what is the contract",
      "token contract",
    ];
    if (!exactPhrases.includes(trimmed)) return false;
  }
  return CONTRACT_KEYWORD_PATTERNS.some((re) => re.test(text));
}

function buildContractMessage(): string {
  return [
    `🟢 *$BLINK Token Contract*`,
    ``,
    `\`0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B\``,
    ``,
    `🔗 Network: Ethereum Mainnet`,
    `📊 Symbol: BLINK | Supply: 2,000,000,000`,
    `🔍 [Etherscan](https://etherscan.io/token/0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B)`,
    ``,
    `*Don't blink.*`,
  ].join("\n");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = req.headers.get("x-telegram-bot-api-secret-token");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const botToken = process.env.BLINK_BOT_TOKEN;
  if (!botToken) {
    console.error("[telegram] BLINK_BOT_TOKEN not configured");
    return NextResponse.json({ ok: true });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch (err) {
    console.error("[telegram] failed to parse update", err);
    return NextResponse.json({ ok: true });
  }

  try {
    const newMembers = update.message?.new_chat_members;
    if (newMembers && newMembers.length > 0 && update.message) {
      const chatId = update.message.chat.id;
      for (const member of newMembers) {
        if (member.is_bot) continue;
        try {
          await sendMessage(botToken, chatId, buildWelcomeMessage(member.first_name));
        } catch (err) {
          console.error("[telegram] failed to greet new member", err);
        }
      }
    }

    const chatMemberUpdate = update.chat_member;
    if (chatMemberUpdate) {
      const oldStatus = chatMemberUpdate.old_chat_member.status;
      const newStatus = chatMemberUpdate.new_chat_member.status;
      const joinedStatuses = new Set(["member", "restricted"]);
      const leftStatuses = new Set(["left", "kicked"]);
      const justJoined = leftStatuses.has(oldStatus) && joinedStatuses.has(newStatus);
      const user = chatMemberUpdate.new_chat_member.user;
      if (justJoined && !user.is_bot) {
        try {
          await sendMessage(botToken, chatMemberUpdate.chat.id, buildWelcomeMessage(user.first_name));
        } catch (err) {
          console.error("[telegram] failed to greet chat_member join", err);
        }
      }
    }

    const text = update.message?.text;
    if (text && text.startsWith("/start") && update.message) {
      const from = update.message.from;
      const firstName = from?.first_name ?? "friend";
      try {
        await sendMessage(botToken, update.message.chat.id, buildWelcomeMessage(firstName));
      } catch (err) {
        console.error("[telegram] failed to handle /start", err);
      }
    } else if (
      text &&
      update.message &&
      (update.message.chat.type === "group" || update.message.chat.type === "supergroup") &&
      matchesContractKeyword(text)
    ) {
      try {
        await sendMessage(
          botToken,
          update.message.chat.id,
          buildContractMessage(),
          update.message.message_id,
        );
      } catch (err) {
        console.error("[telegram] failed to handle contract keyword", err);
      }
    }
  } catch (err) {
    console.error("[telegram] webhook handler error", err);
  }

  return NextResponse.json({ ok: true });
}
