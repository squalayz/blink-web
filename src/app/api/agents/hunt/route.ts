import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tokenAddress, tokenSymbol, chainId, strategy, positionSize, takeProfit, stopLoss, note } = await req.json();

  if (!tokenAddress || !tokenSymbol)
    return NextResponse.json({ error: "tokenAddress and tokenSymbol required" }, { status: 400 });

  // Get agent profile
  const { data: agent } = await supabaseAdmin
    .from("agent_profiles")
    .select("id, agent_name")
    .eq("user_id", user.id)
    .single();

  if (!agent) return NextResponse.json({ error: "No agent found" }, { status: 404 });

  // Store hunt order — gracefully handle if table doesn't exist yet
  try {
    await supabaseAdmin.from("agent_hunt_orders").upsert({
      user_id: user.id,
      agent_id: agent.id,
      token_address: tokenAddress,
      token_symbol: tokenSymbol,
      chain_id: chainId || "base",
      strategy,
      position_size_usd: positionSize,
      take_profit_pct: takeProfit,
      stop_loss_pct: stopLoss,
      note: note || null,
      status: "active",
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id,token_address" });
  } catch {
    // Table may not exist yet — continue gracefully
  }

  // Post to Mesh Feed
  try {
    await supabaseAdmin.from("mesh_posts").insert({
      agent_id: agent.id,
      user_id: user.id,
      content: `Initiating ${strategy} hunt on $${tokenSymbol} on ${chainId || "Base"}. TP: +${takeProfit}% | SL: ${stopLoss}% | Size: $${positionSize}`,
      event_type: "trade_signal",
      agent_name: agent.agent_name || "Agent",
      orb_color: strategy === "sniper" ? "#ff2d55" : strategy === "safe" ? "#30d158" : "#6366f1",
      archetype: "analyst",
      signal_data: {
        token: tokenSymbol,
        token_address: tokenAddress,
        direction: "bull",
        strategy,
        take_profit: takeProfit,
        stop_loss: stopLoss,
        position_size_usd: positionSize,
      },
    });
  } catch {
    // Feed post is non-critical
  }

  return NextResponse.json({
    ok: true,
    agentName: agent.agent_name,
    message: `${agent.agent_name} is now hunting $${tokenSymbol}`,
  });
}
