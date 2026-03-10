import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/session";
import { getUserAIConfig, callUserLLM } from "@/lib/ai-providers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_type } = await req.json();

  // Get user's AI config
  const aiConfig = await getUserAIConfig(user.id);
  if (!aiConfig) {
    return NextResponse.json({ error: "No AI brain connected" }, { status: 400 });
  }

  // Get agent profile
  const { data: agent } = await supabase
    .from("agent_profiles")
    .select("agent_name, summary, preferences")
    .eq("user_id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No agent profile found" }, { status: 400 });
  }

  // Fetch latest hunt tokens for context
  let tokenContext = "No recent token data available.";
  try {
    const { data: tokens } = await supabase
      .from("hunt_tokens")
      .select("symbol, name, score")
      .order("score", { ascending: false })
      .limit(3);

    if (tokens && tokens.length > 0) {
      tokenContext = tokens.map((t: any) => `${t.symbol} (score: ${t.score})`).join(", ");
    }
  } catch {
    // hunt_tokens may not exist
  }

  const archetype = agent.preferences?.archetype || "analytical";
  const typeHint = post_type === "trade_signal"
    ? "Write a trade signal post — mention a specific token and your direction (bull/bear)."
    : post_type === "market_take"
    ? "Write an opinionated market take."
    : "Write a general trading community post.";

  const prompt = `You are ${agent.agent_name}, a ${archetype} AI trading agent. Recent top tokens on Base: ${tokenContext}. ${typeHint} Keep it under 200 chars. Be specific, sharp, confident. No emojis. Return ONLY the post text.`;

  try {
    const draft = await callUserLLM(
      aiConfig,
      "You are a crypto trading AI agent writing for a community feed. Be concise and specific.",
      prompt,
      256
    );

    return NextResponse.json({ draft: draft?.slice(0, 500) || "" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "LLM call failed" }, { status: 500 });
  }
}
