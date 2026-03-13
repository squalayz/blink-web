import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey } from "@/lib/encryption";
import { callUserLLM, type AIProvider } from "@/lib/ai-providers";
import { collectTradeFee } from "@/lib/wallet";

// Platform fee: 3% on every task payout (same as trade fee)
const WORK_FEE_PCT = 0.03;

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bounty_id, bounty_title, bounty_description, budget_eth, action: reqAction } =
    await req.json();

  if (!bounty_id || !bounty_title)
    return NextResponse.json({ error: "Missing bounty info" }, { status: 400 });

  // Get user's full profile (AI + wallet)
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("ai_api_key_encrypted, ai_provider, ai_model, ai_endpoint, wallet_encrypted_key, wallet_address")
    .eq("id", sessionUser.id)
    .single();

  if (!user?.ai_api_key_encrypted)
    return NextResponse.json({ error: "No AI brain connected" }, { status: 400 });

  const log: string[] = [];

  // ── COLLECT FEE on task completion ──────────────────────────────────────
  // Called when Moltlaunch confirms payment landed in user's wallet.
  // 3% of the payout goes to platform wallet.
  if (reqAction === "collect_fee" && user.wallet_encrypted_key) {
    const earnedEth = parseFloat(budget_eth || "0");
    if (earnedEth > 0) {
      try {
        const feeResult = await collectTradeFee(
          user.wallet_encrypted_key,
          earnedEth,
          `work_fee_${bounty_id}`,
          "market_task",
        );
        return NextResponse.json({
          ok: true,
          action: "fee_collected",
          fee_eth: feeResult.fee,
          net_eth: earnedEth - feeResult.fee,
          tx_hash: feeResult.feeTxHash,
          message: `3% platform fee (${feeResult.fee.toFixed(5)} ETH) collected`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Fee collection failed";
        return NextResponse.json({ ok: false, error: msg });
      }
    }
  }

  // ── EVALUATE + QUOTE bounty ──────────────────────────────────────────────
  log.push(`Scanning bounty: "${bounty_title}"`);
  log.push(`Budget: ${budget_eth} ETH`);
  log.push("Evaluating fit with agent capabilities...");

  try {
    const apiKey = await decryptApiKey(user.ai_api_key_encrypted);

    const systemPrompt = `You are an AI agent evaluating freelance bounties on Moltlaunch.
You must decide whether to accept or decline this bounty, and if accepting, propose a quote.
Respond in JSON format: { "action": "quote" | "decline", "quote_eth": number | null, "reasoning": string }
Be concise. Only accept work you can actually do (text generation, code, analysis, research).`;

    const userMessage = `Bounty: "${bounty_title}"
Description: ${bounty_description || "No description provided"}
Budget: ${budget_eth} ETH
Should you take this job? If yes, quote a fair price (at or below budget).`;

    const response = await callUserLLM(
      {
        provider: (user.ai_provider || "openai") as AIProvider,
        apiKey,
        model: user.ai_model || undefined,
        endpoint: user.ai_endpoint || undefined,
      },
      systemPrompt,
      userMessage,
      512,
    );

    let decision: { action: string; quote_eth: number | null; reasoning: string };
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      decision = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { action: "quote", quote_eth: budget_eth * 0.9, reasoning: response };
    } catch {
      decision = { action: "quote", quote_eth: budget_eth * 0.9, reasoning: response };
    }

    log.push(`Agent reasoning: ${decision.reasoning}`);

    if (decision.action === "decline") {
      log.push("Agent decided to decline this bounty");
      return NextResponse.json({ ok: true, action: "declined", log, message: decision.reasoning });
    }

    const quoteEth = decision.quote_eth || budget_eth * 0.9;
    const platformFee = quoteEth * WORK_FEE_PCT;
    const agentNet = quoteEth - platformFee;
    log.push(`Submitting quote: ${quoteEth.toFixed(4)} ETH (you keep ${agentNet.toFixed(4)} after 3% platform fee)`);

    return NextResponse.json({
      ok: true,
      action: "quoted",
      quote_eth: quoteEth.toFixed(4),
      net_eth: agentNet.toFixed(4),
      fee_pct: 3,
      log,
      message: "Agent has evaluated the bounty and submitted a quote.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.push(`Error: ${msg}`);
    return NextResponse.json({ ok: false, error: msg, log });
  }
}
