import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { getWalletBalance, payApiAccess, FEES } from "@/lib/wallet";
import { randomBytes } from "crypto";

// ══════════════════════════════════════════════════════════════
// EXTERNAL DEVELOPER API
//
// Developers pay 0.01 ETH/month for API access.
// Features: matching queries, webhook notifications, agent data.
// Rate limit: 100 calls/hour.
//
// Auth: Header "X-API-Key: mm_xxxxxxxx"
// ══════════════════════════════════════════════════════════════

function generateApiKey(): string {
  return `mm_${randomBytes(24).toString("hex")}`;
}

async function authenticateApiKey(req: NextRequest): Promise<{ userId: string; keyId: string } | null> {
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (!apiKey) return null;

  const { data } = await supabaseAdmin
    .from("developer_api_keys")
    .select("id, user_id, active, expires_at, calls_this_month, rate_limit")
    .eq("api_key", apiKey)
    .eq("active", true)
    .single();

  if (!data) return null;

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    await supabaseAdmin.from("developer_api_keys").update({ active: false }).eq("id", data.id);
    return null;
  }

  // Increment call count
  await supabaseAdmin.from("developer_api_keys")
    .update({ calls_this_month: (data.calls_this_month || 0) + 1 })
    .eq("id", data.id);

  return { userId: data.user_id, keyId: data.id };
}

// POST /api/external — manage API keys + developer actions
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // ── Generate API Key (requires session auth) ──
  if (action === "generate_key") {
    const _sessionUser = await getSessionUser();
    if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = _sessionUser.id;

    // Check wallet balance
    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) return NextResponse.json({ error: "No wallet" }, { status: 404 });

    const balance = await getWalletBalance(user.wallet_address);
    if (balance < FEES.API_ACCESS + 0.001) {
      return NextResponse.json({ error: `Need ${FEES.API_ACCESS} ETH + gas for API access` }, { status: 400 });
    }

    // Pay
    const payResult = await payApiAccess(user.wallet_encrypted_key);
    if (!payResult.success) return NextResponse.json({ error: "Payment failed" }, { status: 500 });

    const apiKey = generateApiKey();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { data: key } = await supabaseAdmin.from("developer_api_keys").insert({
      user_id: userId, api_key: apiKey, name: body.name || "default",
      webhook_url: body.webhook_url || null, expires_at: expiresAt.toISOString(),
      tx_hash: payResult.txHash,
    }).select().single();

    return NextResponse.json({
      ok: true, api_key: apiKey, expires_at: expiresAt.toISOString(),
      txHash: payResult.txHash,
      docs: "See /api/external with X-API-Key header for endpoints.",
    });
  }

  // ── Set webhook URL (requires API key) ──
  if (action === "set_webhook") {
    const auth = await authenticateApiKey(req);
    if (!auth) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const { webhook_url } = body;
    if (!webhook_url) return NextResponse.json({ error: "webhook_url required" }, { status: 400 });

    await supabaseAdmin.from("developer_api_keys")
      .update({ webhook_url }).eq("id", auth.keyId);

    return NextResponse.json({ ok: true, webhook_url });
  }

  // ── Trigger match (requires API key) ──
  if (action === "trigger_match") {
    const auth = await authenticateApiKey(req);
    if (!auth) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const { target_user_id } = body;

    // Get user's matches
    const { data: matches } = await supabaseAdmin.from("matches")
      .select("id, score, synergy, status_a, status_b, created_at")
      .or(`user_a.eq.${auth.userId},user_b.eq.${auth.userId}`)
      .order("created_at", { ascending: false }).limit(10);

    return NextResponse.json({ matches: matches || [] });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/external — read endpoints (requires API key)
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    // Return docs if no key
    return NextResponse.json({
      name: "MishMesh.ai Developer API",
      version: "1.0",
      pricing: `${FEES.API_ACCESS} ETH/month`,
      auth: "Include X-API-Key header with your API key",
      endpoints: {
        "POST /api/external": {
          "generate_key": "Generate API key (requires session auth + 0.01 ETH payment)",
          "set_webhook": "Set webhook URL for match notifications",
          "trigger_match": "Get your recent matches",
        },
        "GET /api/external": {
          "no_key": "Returns this documentation",
          "with_key": "Returns your agent data, matches, and account info",
        },
      },
    });
  }

  // Return user's agent data + matches
  const [userRes, agentRes, matchRes, keyRes] = await Promise.all([
    supabaseAdmin.from("users").select("id, name, industry, building, location, wallet_address, tier").eq("id", auth.userId).single(),
    supabaseAdmin.from("agent_profiles").select("agent_name, summary, capabilities, match_count, conversation_count, reputation_score").eq("user_id", auth.userId).single(),
    supabaseAdmin.from("matches")
      .select("id, score, synergy, collab_idea, status_a, status_b, revealed, created_at")
      .or(`user_a.eq.${auth.userId},user_b.eq.${auth.userId}`)
      .order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("developer_api_keys").select("calls_this_month, rate_limit, expires_at, webhook_url").eq("id", auth.keyId).single(),
  ]);

  return NextResponse.json({
    user: userRes.data,
    agent: agentRes.data,
    matches: matchRes.data || [],
    api: keyRes.data,
  });
}
