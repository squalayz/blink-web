// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Unified AI Provider Interface
//
// Users bring their OWN API key. Platform does NOT pay for inference.
// Supports: OpenAI, Anthropic, Google, Groq, OpenRouter, Custom
// ══════════════════════════════════════════════════════════════

export type AIProvider = "openai" | "anthropic" | "google" | "groq" | "xai" | "openrouter" | "custom";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  endpoint?: string; // Only for custom provider
}

// Provider endpoints + defaults
const PROVIDER_CONFIG: Record<string, { url: string; models: string[]; defaultModel: string; costPer1k: number }> = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o3", "o3-mini", "gpt-4-turbo"],
    defaultModel: "gpt-4o-mini",
    costPer1k: 0.15, // per 1k output tokens in cents
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-4-20250514"],
    defaultModel: "claude-sonnet-4-20250514",
    costPer1k: 1.5,
  },
  google: {
    url: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    models: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-2.0-flash",
    costPer1k: 0.075,
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    defaultModel: "llama-3.3-70b-versatile",
    costPer1k: 0.059,
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    models: ["anthropic/claude-sonnet-4", "openai/gpt-4o-mini", "google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct"],
    defaultModel: "openai/gpt-4o-mini",
    costPer1k: 0.15,
  },
  xai: {
    url: "https://api.x.ai/v1/chat/completions",
    models: ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini"],
    defaultModel: "grok-3-mini",
    costPer1k: 0.30,
  },
  custom: {
    url: "",
    models: ["default"],
    defaultModel: "default",
    costPer1k: 0,
  },
};

// ═══ Unified LLM Call ═══
export async function callUserLLM(
  config: AIConfig,
  system: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  const { provider, apiKey, model, endpoint } = config;

  try {
    if (provider === "anthropic") {
      return await callAnthropic(apiKey, model, system, userMessage, maxTokens);
    }

    if (provider === "google") {
      return await callGoogle(apiKey, model, system, userMessage, maxTokens);
    }

    // OpenAI-compatible: OpenAI, Groq, OpenRouter, Custom
    const url = provider === "custom"
      ? (endpoint || "")
      : PROVIDER_CONFIG[provider]?.url || PROVIDER_CONFIG.openai.url;

    return await callOpenAICompatible(url, apiKey, model, system, userMessage, maxTokens, provider);
  } catch (err: any) {
    console.error(`LLM call failed (${provider}/${model}):`, err.message);
    throw err;
  }
}

// ── OpenAI-compatible (OpenAI, Groq, OpenRouter, Custom) ──
async function callOpenAICompatible(
  url: string, apiKey: string, model: string,
  system: string, user: string, maxTokens: number, provider: string
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter needs extra headers
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://mishmesh.ai";
    headers["X-Title"] = "MishMesh Agent";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider} API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Anthropic ──
async function callAnthropic(
  apiKey: string, model: string,
  system: string, user: string, maxTokens: number
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── Google Gemini ──
async function callGoogle(
  apiKey: string, model: string,
  system: string, user: string, maxTokens: number
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ═══ Test Connection ═══
export async function testAIConnection(config: AIConfig): Promise<{ success: boolean; message: string; model: string }> {
  try {
    const result = await callUserLLM(config, "You are a test bot.", "Say 'MishMesh connected!' and nothing else.", 20);
    return { success: true, message: result.trim(), model: config.model };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed", model: config.model };
  }
}

// ═══ Get estimated cost per match ═══
export function estimateCostPerMatch(provider: AIProvider, model: string): string {
  // ~2000 output tokens per match (5 turns × 2 agents × 200 tokens + scoring)
  const config = PROVIDER_CONFIG[provider];
  if (!config) return "Unknown";
  const tokensPerMatch = 2000;
  const cost = (tokensPerMatch / 1000) * config.costPer1k;
  if (cost < 0.01) return "<$0.01";
  return `~$${cost.toFixed(2)}`;
}

// ═══ Get available models for a provider ═══
export function getModelsForProvider(provider: AIProvider): string[] {
  return PROVIDER_CONFIG[provider]?.models || [];
}

export function getDefaultModel(provider: AIProvider): string {
  return PROVIDER_CONFIG[provider]?.defaultModel || "gpt-4o-mini";
}

// ═══ Fetch user's AI config from DB ═══
export async function getUserAIConfig(userId: string): Promise<AIConfig | null> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data } = await supabase
    .from("users")
    .select("ai_provider, ai_api_key_encrypted, ai_model, ai_endpoint")
    .eq("id", userId)
    .single();

  if (!data?.ai_api_key_encrypted) return null;

  return {
    provider: data.ai_provider || "openai",
    apiKey: data.ai_api_key_encrypted, // In production: decrypt this
    model: data.ai_model || getDefaultModel(data.ai_provider || "openai"),
    endpoint: data.ai_endpoint || undefined,
  };
}
