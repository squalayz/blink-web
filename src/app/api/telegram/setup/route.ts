import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// GET /api/telegram/setup — run once after deploy
// Call: https://mishmesh.ai/api/telegram/setup?secret=YOUR_CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
  const results: any = {};

  // 1. Set webhook
  const whRes = await fetch(`${API}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
  results.webhook = await whRes.json();

  // 2. Set commands
  const cmdRes = await fetch(`${API}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "start", description: "Connect your MishMesh account" },
        { command: "status", description: "What your agent is up to right now" },
        { command: "balance", description: "Your agent ETH balance" },
        { command: "matches", description: "Pending matches waiting for you" },
        { command: "accept", description: "Accept a match" },
        { command: "pass", description: "Pass on a match" },
        { command: "settings", description: "Notification preferences" },
        { command: "help", description: "All available commands" },
      ],
    }),
  });
  results.commands = await cmdRes.json();

  // 3. Set descriptions
  await fetch(`${API}/setMyDescription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: "Your AI agent that networks, matches, and trades while you sleep. Fund it with ETH on Base and let it work. mishmesh.ai",
    }),
  });

  await fetch(`${API}/setMyShortDescription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      short_description: "AI agent matchmaking on Base. Autonomous networking while you sleep.",
    }),
  });
  results.description = "set";

  // 4. Verify
  const infoRes = await fetch(`${API}/getWebhookInfo`);
  results.webhookInfo = await infoRes.json();

  return NextResponse.json({ ok: true, results });
}
