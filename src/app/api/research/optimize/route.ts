import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callUserLLM, getUserAIConfig } from "@/lib/ai-providers";
import { sendTelegramMessage } from "@/lib/telegram";

async function processUser(userId: string): Promise<{
  rulesAdded: number;
  rulesUpdated: number;
}> {
  // Get agent profile
  const { data: agentProfile, error: agentError } = await supabaseAdmin
    .from("agent_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (agentError || !agentProfile) {
    throw new Error(`No agent profile found for user ${userId}`);
  }

  const agentId = agentProfile.id;

  // Gather real outcomes (last 30 days)
  const { data: trades, error: tradesError } = await supabaseAdmin
    .from("trade_logs")
    .select("token_symbol, token_address, chain_id, action, price, pnl, timestamp")
    .eq("user_id", userId)
    .gte("timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("timestamp", { ascending: false });

  if (tradesError) {
    throw new Error(`Failed to fetch trades: ${tradesError.message}`);
  }

  if (!trades || trades.length === 0) {
    throw new Error(`No trades found in the last 30 days for user ${userId}`);
  }

  // Get current strategy rules
  const { data: currentRules, error: rulesError } = await supabaseAdmin
    .from("agent_learned_rules")
    .select("rule, category, confidence")
    .eq("agent_id", agentId)
    .eq("active", true);

  if (rulesError) {
    throw new Error(`Failed to fetch rules: ${rulesError.message}`);
  }

  // Get user's AI config
  const config = await getUserAIConfig(userId);
  if (!config) return { rulesAdded: 0, rulesUpdated: 0 };

  // Run research prompt via user's LLM
  const systemPrompt = `You are an AI research agent optimizing a trading strategy based on real outcomes.
Analyze the data carefully. Find patterns. Be specific and actionable.
Return ONLY a valid JSON array, no markdown or explanation.`;

  const tradeOutcomes = trades.slice(0, 50);

  const userMessage = `Current strategy rules:
${JSON.stringify(currentRules || [])}

Last 30 days of real trade outcomes (${trades.length} trades):
${JSON.stringify(tradeOutcomes)}

Scoring context: volume 30%, liquidity 20%, price change 25%, txns 25%

Analyze outcomes. Find patterns. Suggest 3-5 specific rule changes.

For each, return: { rule: string, category: string, confidence: number (0-100), reasoning: string, expected_improvement: string }

Categories: trading_style, risk_profile, chain_preference, timing, position_sizing

Return JSON array only.`;

  const llmResponse = await callUserLLM(config, systemPrompt, userMessage, 1024);

  // Parse the JSON response (handle markdown-wrapped JSON)
  let suggestions: Array<{
    rule: string;
    category: string;
    confidence: number;
    reasoning: string;
    expected_improvement: string;
  }>;

  try {
    let cleaned = llmResponse.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    suggestions = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${llmResponse.slice(0, 200)}`);
  }

  if (!Array.isArray(suggestions)) {
    throw new Error("LLM response is not an array");
  }

  // Apply improvements — only suggestions with confidence > 50
  let newRulesCount = 0;
  let updatedRulesCount = 0;

  for (const suggestion of suggestions) {
    if (suggestion.confidence <= 50) continue;

    // Check if a rule with the same category already exists
    const { data: existing } = await supabaseAdmin
      .from("agent_learned_rules")
      .select("id")
      .eq("agent_id", agentId)
      .eq("category", suggestion.category)
      .eq("rule", suggestion.rule)
      .maybeSingle();

    if (existing) {
      // Update existing rule
      await supabaseAdmin
        .from("agent_learned_rules")
        .update({
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
          expected_improvement: suggestion.expected_improvement,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      updatedRulesCount++;
    } else {
      // Insert new rule
      await supabaseAdmin.from("agent_learned_rules").insert({
        agent_id: agentId,
        rule: suggestion.rule,
        category: suggestion.category,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        expected_improvement: suggestion.expected_improvement,
        active: true,
        created_at: new Date().toISOString(),
      });
      newRulesCount++;
    }
  }

  // Calculate average improvement for logging
  const avgImprovement =
    suggestions.length > 0
      ? suggestions.map((s) => s.expected_improvement).join("; ")
      : "No improvements suggested";

  // Log to agent_research_log
  await supabaseAdmin.from("agent_research_log").insert({
    user_id: userId,
    agent_id: agentProfile.id,
    experiments_run: trades.length,
    rules_added: newRulesCount,
    rules_updated: updatedRulesCount,
    insights: suggestions,
    estimated_improvement: avgImprovement,
    ran_at: new Date().toISOString(),
  });

  // Update agent_profiles
  await supabaseAdmin
    .from("agent_profiles")
    .update({
      last_research_at: new Date().toISOString(),
      total_experiments: (agentProfile.total_experiments || 0) + trades.length,
    })
    .eq("id", agentProfile.id);

  // Notify user via Telegram
  const { data: notifSettings } = await supabaseAdmin
    .from("notification_settings")
    .select("telegram_chat_id")
    .eq("user_id", userId)
    .single();

  if (notifSettings?.telegram_chat_id) {
    const topInsight =
      suggestions.length > 0
        ? `Top insight: ${suggestions[0].rule} (${suggestions[0].confidence}% confidence)`
        : "No new insights this cycle.";

    const msg = `\u{1F9E0} Your agent ran its nightly research\n\n\u{1F4CA} Analyzed ${trades.length} trades from the last 30 days\n\u{1F52C} Processed ${trades.length} data points\n\u2705 Updated ${newRulesCount} strategy rules\n\n${topInsight}\n\nYour agent is getting smarter. \u{1F680}`;
    await sendTelegramMessage(notifSettings.telegram_chat_id, msg);
  }

  return { rulesAdded: newRulesCount, rulesUpdated: updatedRulesCount };
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const isAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId } = body as { userId?: string };

  let userIds: string[] = [];

  if (userId) {
    userIds = [userId];
  } else {
    // Find eligible users: research_enabled and have an AI API key
    const { data: eligibleUsers, error } = await supabaseAdmin
      .from("agent_profiles")
      .select("user_id")
      .or("research_enabled.eq.true,research_enabled.is.null")
      .not("ai_api_key_encrypted", "is", null);

    if (error) {
      return NextResponse.json({ error: "Failed to query users", details: error.message }, { status: 500 });
    }

    userIds = (eligibleUsers || []).map((u: { user_id: string }) => u.user_id);
  }

  let usersProcessed = 0;
  let totalRulesUpdated = 0;

  for (const uid of userIds) {
    try {
      const result = await processUser(uid);
      usersProcessed++;
      totalRulesUpdated += result.rulesAdded + result.rulesUpdated;
    } catch (err) {
      console.error(`[research/optimize] Error processing user ${uid}:`, err);
      // Continue to the next user
    }
  }

  return NextResponse.json({ ok: true, usersProcessed, totalRulesUpdated });
}

export const runtime = "nodejs";
export const maxDuration = 300;
