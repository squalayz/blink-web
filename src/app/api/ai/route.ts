import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { testAIConnection, getModelsForProvider, getDefaultModel, estimateCostPerMatch, type AIProvider, type AIConfig } from "@/lib/ai-providers";

// POST /api/ai — save AI settings or test connection
export async function POST(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  const body = await req.json();
  const { action } = body;

  // ── Test Connection ──
  if (action === "test") {
    const { provider, apiKey, model, endpoint } = body;
    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API key required" }, { status: 400 });
    }

    const config: AIConfig = {
      provider: provider as AIProvider,
      apiKey,
      model: model || getDefaultModel(provider),
      endpoint: endpoint || undefined,
    };

    const result = await testAIConnection(config);
    return NextResponse.json(result);
  }

  // ── Save AI Settings ──
  if (action === "save") {
    const { provider, apiKey, model, endpoint } = body;
    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API key required" }, { status: 400 });
    }

    // TODO: Encrypt apiKey before storing in production
    const { error } = await supabaseAdmin.from("users").update({
      ai_provider: provider,
      ai_api_key_encrypted: apiKey,
      ai_model: model || getDefaultModel(provider),
      ai_endpoint: endpoint || null,
    }).eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, message: "AI provider saved" });
  }

  // ── Disconnect AI ──
  if (action === "disconnect") {
    await supabaseAdmin.from("users").update({
      ai_api_key_encrypted: null,
      ai_provider: "openai",
      ai_model: "gpt-4o-mini",
      ai_endpoint: null,
    }).eq("id", userId);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/ai — get available providers + models + current settings
export async function GET(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  const { data: user } = await supabaseAdmin.from("users")
    .select("ai_provider, ai_model, ai_endpoint, ai_api_key_encrypted")
    .eq("id", userId).single();

  const providers = [
    { id: "openai", name: "OpenAI", models: getModelsForProvider("openai"), cost: estimateCostPerMatch("openai", "gpt-4o-mini") },
    { id: "anthropic", name: "Anthropic", models: getModelsForProvider("anthropic"), cost: estimateCostPerMatch("anthropic", "claude-sonnet-4-20250514") },
    { id: "google", name: "Google", models: getModelsForProvider("google"), cost: estimateCostPerMatch("google", "gemini-2.0-flash") },
    { id: "groq", name: "Groq", models: getModelsForProvider("groq"), cost: estimateCostPerMatch("groq", "llama-3.3-70b-versatile") },
    { id: "openrouter", name: "OpenRouter", models: getModelsForProvider("openrouter"), cost: estimateCostPerMatch("openrouter", "openai/gpt-4o-mini") },
    { id: "custom", name: "Custom Endpoint", models: ["default"], cost: "Varies" },
  ];

  return NextResponse.json({
    providers,
    current: {
      provider: user?.ai_provider || "openai",
      model: user?.ai_model || "gpt-4o-mini",
      endpoint: user?.ai_endpoint || "",
      connected: !!user?.ai_api_key_encrypted,
      // Never return the actual API key
      keyPreview: user?.ai_api_key_encrypted ? `${user.ai_api_key_encrypted.slice(0, 8)}...${user.ai_api_key_encrypted.slice(-4)}` : null,
    },
  });
}
