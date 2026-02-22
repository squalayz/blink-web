// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Syndicate Engine
// Signal proposals, AI voting, debates, performance tracking
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase";
import { getUserAIConfig, callUserLLM } from "./ai-providers";
import {
  SyndicateVote, SyndicateChatMessage,
  SYNDICATE_APPROVAL_THRESHOLD, SYNDICATE_MIN_CONFIDENCE,
  SIGNAL_VOTING_TIMEOUT_FAST, SIGNAL_VOTING_TIMEOUT_SLOW,
  FAST_STRATEGIES, STRATEGY_META,
} from "./syndicate-types";

// ═══ HELPERS ═══

async function getAgentProfile(agentId: string) {
  const { data } = await supabaseAdmin.from("agent_profiles")
    .select("id, agent_name, soul, mood, user_id")
    .eq("id", agentId).single();
  return data;
}

async function getSyndicateMembers(syndicateId: string) {
  const { data } = await supabaseAdmin.from("syndicate_members")
    .select("*, agent_profiles(id, agent_name, soul, mood)")
    .eq("syndicate_id", syndicateId).eq("active", true);
  return (data || []).map((m: any) => ({
    ...m,
    agent_name: m.agent_profiles?.agent_name || "Unknown",
    soul: m.agent_profiles?.soul,
    mood: m.agent_profiles?.mood,
  }));
}

async function postToChat(
  syndicateId: string, agentId: string, agentName: string,
  content: string, messageType: SyndicateChatMessage["message_type"],
  signalId?: string, metadata?: Record<string, any>,
) {
  await supabaseAdmin.from("syndicate_chat").insert({
    syndicate_id: syndicateId, agent_id: agentId, agent_name: agentName,
    content, message_type: messageType,
    signal_id: signalId || null, metadata: metadata || {},
  });
}

function buildSyndicateContext(syndicateName: string, members: any[], strategy: string) {
  const teammates = members.map(m => {
    const s = STRATEGY_META[m.trading_strategy] || { name: m.trading_strategy, role: "" };
    return `- ${m.agent_name} (${s.name}) — ${s.role}. Contribution: ${(m.contribution_score * 100).toFixed(0)}%`;
  }).join("\n");

  return `You are in a trading syndicate called "${syndicateName}".
Your teammates:
${teammates}

You're discussing trades with your team. Be yourself — use your personality, quirks, and communication style.
Your strategy perspective: ${STRATEGY_META[strategy]?.name || strategy} — ${STRATEGY_META[strategy]?.role || ""}.
Keep messages under 60 words. Be specific about numbers. Have conviction. If it's a bad trade, SAY SO.`;
}

async function generateAgentMessage(
  userId: string, systemPrompt: string, userPrompt: string,
): Promise<string> {
  const aiConfig = await getUserAIConfig(userId);
  if (!aiConfig) return "";
  try {
    return await callUserLLM(aiConfig, systemPrompt, userPrompt, 150);
  } catch { return ""; }
}

// ═══ PROPOSE TRADE ═══

export async function proposeTrade(
  syndicateId: string, proposerAgentId: string,
  decision: { action: string; token: string; tokenAddress: string; confidence: number; amountPct: number; reasoning: string },
  marketData: { price: number; volume24h: number; liquidity: number; mcap?: number; change1h?: number; change24h?: number },
) {
  const agent = await getAgentProfile(proposerAgentId);
  if (!agent) return null;

  const members = await getSyndicateMembers(syndicateId);
  const { data: syndicate } = await supabaseAdmin.from("syndicates")
    .select("name").eq("id", syndicateId).single();

  // Determine voting timeout
  const proposerMember = members.find((m: any) => m.agent_id === proposerAgentId);
  const isFast = FAST_STRATEGIES.includes(proposerMember?.trading_strategy || "");
  const timeoutSec = isFast ? SIGNAL_VOTING_TIMEOUT_FAST : SIGNAL_VOTING_TIMEOUT_SLOW;
  const deadline = new Date(Date.now() + timeoutSec * 1000).toISOString();

  // Create signal
  const { data: signal } = await supabaseAdmin.from("syndicate_signals").insert({
    syndicate_id: syndicateId,
    proposer_agent_id: proposerAgentId,
    token_address: decision.tokenAddress,
    token_symbol: decision.token,
    action: decision.action,
    proposed_amount_pct: decision.amountPct,
    proposer_confidence: decision.confidence,
    proposer_reasoning: decision.reasoning,
    token_price_usd: marketData.price,
    token_volume_24h: marketData.volume24h,
    token_liquidity_usd: marketData.liquidity,
    token_mcap: marketData.mcap || 0,
    token_price_change_1h: marketData.change1h || 0,
    token_price_change_24h: marketData.change24h || 0,
    voting_deadline: deadline,
    status: "voting",
  }).select().single();

  if (!signal) return null;

  // Generate proposal chat message in agent's voice
  const syndicateCtx = buildSyndicateContext(syndicate?.name || "", members, proposerMember?.trading_strategy || "");
  const proposalPrompt = `You just spotted a trade opportunity and want to pitch it to your syndicate.
Token: ${decision.token} ($${marketData.price.toFixed(6)})
1h change: ${(marketData.change1h || 0) > 0 ? "+" : ""}${(marketData.change1h || 0).toFixed(1)}%
24h change: ${(marketData.change24h || 0) > 0 ? "+" : ""}${(marketData.change24h || 0).toFixed(1)}%
Volume: $${((marketData.volume24h || 0) / 1000).toFixed(0)}k | Liquidity: $${((marketData.liquidity || 0) / 1000).toFixed(0)}k
Your confidence: ${decision.confidence}%
Your reasoning: ${decision.reasoning}

Pitch this trade to your team. Be persuasive but honest. Voting is open for ${timeoutSec / 60} minutes.`;

  const chatMsg = await generateAgentMessage(agent.user_id, syndicateCtx, proposalPrompt);
  if (chatMsg) {
    await postToChat(syndicateId, proposerAgentId, agent.agent_name, chatMsg, "signal", signal.id, {
      token: decision.token, confidence: decision.confidence, action: decision.action,
    });
  } else {
    await postToChat(syndicateId, proposerAgentId, agent.agent_name,
      `SIGNAL: ${decision.action.toUpperCase()} ${decision.token} — ${decision.reasoning}. ${decision.confidence}% confident. Voting open for ${timeoutSec / 60} min.`,
      "signal", signal.id, { token: decision.token, confidence: decision.confidence, action: decision.action },
    );
  }

  // Increment proposer stats
  await supabaseAdmin.from("syndicate_members")
    .update({ signals_proposed: (proposerMember?.signals_proposed || 0) + 1 })
    .eq("syndicate_id", syndicateId).eq("agent_id", proposerAgentId);

  // Trigger async voting for all other members
  const voters = members.filter((m: any) => m.agent_id !== proposerAgentId && m.active);
  for (const voter of voters) {
    // Fire and forget — each vote is independent
    castVote(signal.id, syndicateId, voter, decision, marketData, syndicate?.name || "", members).catch(console.error);
  }

  return signal;
}

// ═══ CAST VOTE ═══

export async function castVote(
  signalId: string, syndicateId: string, voter: any,
  decision: { action: string; token: string; tokenAddress: string; confidence: number; reasoning: string },
  marketData: { price: number; volume24h: number; liquidity: number; mcap?: number; change1h?: number; change24h?: number },
  syndicateName: string, allMembers: any[],
) {
  const voterProfile = await getAgentProfile(voter.agent_id);
  if (!voterProfile) return;

  const syndicateCtx = buildSyndicateContext(syndicateName, allMembers, voter.trading_strategy);

  // Get voter's own positions for context
  const { data: positions } = await supabaseAdmin.from("trading_history")
    .select("token_symbol, amount_eth, pnl_eth").eq("user_id", voter.user_id)
    .eq("action", "buy").is("closed_at", null).limit(5);
  const posCtx = (positions || []).map((p: any) => `${p.token_symbol}: ${p.amount_eth?.toFixed(4)} ETH`).join(", ");

  const votePrompt = `A teammate proposed a trade. Review it from YOUR strategy perspective.

PROPOSED TRADE:
Action: ${decision.action.toUpperCase()} ${decision.token}
Price: $${marketData.price.toFixed(6)}
1h: ${(marketData.change1h || 0) > 0 ? "+" : ""}${(marketData.change1h || 0).toFixed(1)}% | 24h: ${(marketData.change24h || 0) > 0 ? "+" : ""}${(marketData.change24h || 0).toFixed(1)}%
Volume: $${((marketData.volume24h || 0) / 1000).toFixed(0)}k | Liquidity: $${((marketData.liquidity || 0) / 1000).toFixed(0)}k
Proposer confidence: ${decision.confidence}%
Proposer reasoning: ${decision.reasoning}

Your current positions: ${posCtx || "None"}
Your strategy: ${STRATEGY_META[voter.trading_strategy]?.name || voter.trading_strategy}

Respond with ONLY JSON:
{"vote":"approve"|"reject"|"abstain","confidence":0-100,"reasoning":"one sentence from your perspective","strategy_perspective":"As a [your strategy], I think..."}`;

  let voteData: SyndicateVote;
  try {
    const aiConfig = await getUserAIConfig(voter.user_id);
    if (!aiConfig) {
      // Auto-abstain if no AI key
      voteData = {
        agent_id: voter.agent_id, agent_name: voterProfile.agent_name,
        vote: "abstain", confidence: 0, reasoning: "AI unavailable",
        strategy_perspective: "", voted_at: new Date().toISOString(),
      };
    } else {
      const response = await callUserLLM(aiConfig, syndicateCtx, votePrompt, 200);
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error("No JSON");
      const parsed = JSON.parse(jsonMatch[0]);

      voteData = {
        agent_id: voter.agent_id,
        agent_name: voterProfile.agent_name,
        vote: ["approve", "reject", "abstain"].includes(parsed.vote) ? parsed.vote : "abstain",
        confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 50)),
        reasoning: (parsed.reasoning || "").slice(0, 200),
        strategy_perspective: (parsed.strategy_perspective || "").slice(0, 200),
        voted_at: new Date().toISOString(),
      };
    }
  } catch {
    voteData = {
      agent_id: voter.agent_id, agent_name: voterProfile.agent_name,
      vote: "abstain", confidence: 0, reasoning: "Vote processing error",
      strategy_perspective: "", voted_at: new Date().toISOString(),
    };
  }

  // Append vote to signal
  const { data: signal } = await supabaseAdmin.from("syndicate_signals")
    .select("votes, total_votes, approve_votes, reject_votes")
    .eq("id", signalId).single();

  if (!signal) return;

  const votes = [...(signal.votes || []), voteData];
  const approves = votes.filter((v: any) => v.vote === "approve").length;
  const rejects = votes.filter((v: any) => v.vote === "reject").length;

  await supabaseAdmin.from("syndicate_signals").update({
    votes, total_votes: votes.length,
    approve_votes: approves, reject_votes: rejects,
  }).eq("id", signalId);

  // Post vote to chat in agent's voice
  if (voteData.vote !== "abstain" && voteData.reasoning) {
    const chatContent = voteData.strategy_perspective || voteData.reasoning;
    const voteEmoji = voteData.vote === "approve" ? "Approve" : "Reject";
    await postToChat(syndicateId, voter.agent_id, voterProfile.agent_name,
      chatContent, "vote", signalId,
      { vote: voteData.vote, confidence: voteData.confidence, label: voteEmoji },
    );
  }

  // Check if all votes are in — if so, resolve immediately
  const totalVoters = (await getSyndicateMembers(syndicateId)).filter((m: any) => m.agent_id !== signal.votes?.[0]?.agent_id).length;
  // Actually just count non-proposer active members
  if (votes.length >= totalVoters) {
    await resolveSignal(signalId);
  }
}

// ═══ RESOLVE SIGNAL ═══

export async function resolveSignal(signalId: string) {
  const { data: signal } = await supabaseAdmin.from("syndicate_signals")
    .select("*").eq("id", signalId).single();

  if (!signal || signal.status !== "voting") return;

  const votes: SyndicateVote[] = signal.votes || [];
  const approves = votes.filter(v => v.vote === "approve");
  const rejects = votes.filter(v => v.vote === "reject");
  const totalDecisive = approves.length + rejects.length;

  // Get members for weighted confidence
  const members = await getSyndicateMembers(signal.syndicate_id);

  // Calculate weighted confidence from approvals
  let weightedConf = 0;
  let totalWeight = 0;
  for (const v of approves) {
    const member = members.find((m: any) => m.agent_id === v.agent_id);
    const weight = member?.contribution_score || 0.5;
    weightedConf += v.confidence * weight;
    totalWeight += weight;
  }
  const syndicateConfidence = totalWeight > 0 ? weightedConf / totalWeight : 0;

  // Verdict
  const approvalRatio = totalDecisive > 0 ? approves.length / totalDecisive : 0;
  const approved = approvalRatio >= SYNDICATE_APPROVAL_THRESHOLD && syndicateConfidence >= SYNDICATE_MIN_CONFIDENCE;
  const verdict = approved ? "approved" : "rejected";

  await supabaseAdmin.from("syndicate_signals").update({
    verdict, syndicate_confidence: Math.round(syndicateConfidence),
    status: "resolved", resolved_at: new Date().toISOString(),
  }).eq("id", signalId);

  // Get syndicate name for chat
  const { data: syndicate } = await supabaseAdmin.from("syndicates")
    .select("name").eq("id", signal.syndicate_id).single();

  // Post result to chat
  const resultMsg = approved
    ? `APPROVED — Syndicate confidence: ${Math.round(syndicateConfidence)}%. ${approves.length} approve, ${rejects.length} reject. ${signal.token_symbol} trade is greenlit.`
    : `REJECTED — Not enough conviction. ${approves.length} approve, ${rejects.length} reject. Confidence: ${Math.round(syndicateConfidence)}%.`;

  await postToChat(signal.syndicate_id, signal.proposer_agent_id, "Syndicate",
    resultMsg, "result", signalId,
    { verdict, confidence: Math.round(syndicateConfidence), approves: approves.length, rejects: rejects.length },
  );

  // If controversial (2+ each side), trigger debate
  if (approves.length >= 2 && rejects.length >= 2) {
    generateSyndicateDebate(signalId, signal.syndicate_id, approves, rejects, signal, members, syndicate?.name || "").catch(console.error);
  }

  // Update proposer stats
  if (approved) {
    const proposerMember = members.find((m: any) => m.agent_id === signal.proposer_agent_id);
    if (proposerMember) {
      await supabaseAdmin.from("syndicate_members").update({
        signals_approved: (proposerMember.signals_approved || 0) + 1,
      }).eq("syndicate_id", signal.syndicate_id).eq("agent_id", signal.proposer_agent_id);
    }
  }
}

// ═══ DEBATE ENGINE ═══

export async function generateSyndicateDebate(
  signalId: string, syndicateId: string,
  approves: SyndicateVote[], rejects: SyndicateVote[],
  signal: any, members: any[], syndicateName: string,
) {
  // Pick strongest bull and bear
  const bull = approves.sort((a, b) => b.confidence - a.confidence)[0];
  const bear = rejects.sort((a, b) => b.confidence - a.confidence)[0];
  if (!bull || !bear) return;

  const bullMember = members.find((m: any) => m.agent_id === bull.agent_id);
  const bearMember = members.find((m: any) => m.agent_id === bear.agent_id);
  if (!bullMember || !bearMember) return;

  const tokenCtx = `Token: ${signal.token_symbol} at $${signal.token_price_usd}. Vol: $${((signal.token_volume_24h || 0) / 1000).toFixed(0)}k. Liq: $${((signal.token_liquidity_usd || 0) / 1000).toFixed(0)}k.`;

  // Round 1: Bull states case
  const bullCtx = buildSyndicateContext(syndicateName, members, bullMember.trading_strategy);
  const bullR1 = await generateAgentMessage(bullMember.user_id, bullCtx,
    `You voted APPROVE on ${signal.token_symbol}. ${tokenCtx} The bears are doubting. Make your bull case in 40 words. Be specific. Numbers matter.`);
  if (bullR1) await postToChat(syndicateId, bull.agent_id, bull.agent_name, bullR1, "debate", signalId, { side: "bull", round: 1 });

  // Round 1: Bear states case
  const bearCtx = buildSyndicateContext(syndicateName, members, bearMember.trading_strategy);
  const bearR1 = await generateAgentMessage(bearMember.user_id, bearCtx,
    `You voted REJECT on ${signal.token_symbol}. ${tokenCtx} The bulls think you're wrong. Make your bear case in 40 words. Be specific.`);
  if (bearR1) await postToChat(syndicateId, bear.agent_id, bear.agent_name, bearR1, "debate", signalId, { side: "bear", round: 1 });

  // Round 2: Responses
  if (bullR1 && bearR1) {
    const bullR2 = await generateAgentMessage(bullMember.user_id, bullCtx,
      `The bear (${bear.agent_name}) argues: "${bearR1}". Counter their specific points in 40 words.`);
    if (bullR2) await postToChat(syndicateId, bull.agent_id, bull.agent_name, bullR2, "debate", signalId, { side: "bull", round: 2 });

    const bearR2 = await generateAgentMessage(bearMember.user_id, bearCtx,
      `The bull (${bull.agent_name}) argues: "${bullR1}". Counter their specific points in 40 words.`);
    if (bearR2) await postToChat(syndicateId, bear.agent_id, bear.agent_name, bearR2, "debate", signalId, { side: "bear", round: 2 });
  }

  // Round 3: Final takes
  const bullR3 = await generateAgentMessage(bullMember.user_id, bullCtx,
    `Final take on ${signal.token_symbol}. If you're right, what's the target? If wrong, where's your stop? One sentence each.`);
  if (bullR3) await postToChat(syndicateId, bull.agent_id, bull.agent_name, bullR3, "debate", signalId, { side: "bull", round: 3 });

  const bearR3 = await generateAgentMessage(bearMember.user_id, bearCtx,
    `Final take on ${signal.token_symbol}. If the bull is right, what did you miss? If you're right, what happens next? One sentence each.`);
  if (bearR3) await postToChat(syndicateId, bear.agent_id, bear.agent_name, bearR3, "debate", signalId, { side: "bear", round: 3 });
}

// ═══ STATS ═══

export async function updateSyndicateStats(syndicateId: string, pnlEth: number, won: boolean, tokenSymbol?: string) {
  const { data: s } = await supabaseAdmin.from("syndicates").select("*").eq("id", syndicateId).single();
  if (!s) return;

  const totalTrades = (s.total_trades || 0) + 1;
  const winningTrades = (s.winning_trades || 0) + (won ? 1 : 0);
  const totalPnl = (s.total_pnl_eth || 0) + pnlEth;
  const weeklyPnl = (s.weekly_pnl_eth || 0) + pnlEth;
  const streak = won ? Math.max(1, (s.streak || 0) + (s.streak >= 0 ? 1 : 1)) : Math.min(-1, (s.streak || 0) - (s.streak <= 0 ? 1 : 1));
  const isBest = pnlEth > (s.best_trade_pnl || 0);

  await supabaseAdmin.from("syndicates").update({
    total_trades: totalTrades,
    winning_trades: winningTrades,
    win_rate: totalTrades > 0 ? winningTrades / totalTrades : 0,
    total_pnl_eth: totalPnl,
    weekly_pnl_eth: weeklyPnl,
    streak,
    ...(isBest ? { best_trade_pnl: pnlEth, best_trade_token: tokenSymbol } : {}),
  }).eq("id", syndicateId);
}

export async function updateMemberContribution(syndicateId: string, agentId: string, wasProfitable: boolean) {
  const { data: m } = await supabaseAdmin.from("syndicate_members")
    .select("signals_proposed, signals_approved, signals_profitable")
    .eq("syndicate_id", syndicateId).eq("agent_id", agentId).single();
  if (!m) return;

  const profitable = (m.signals_profitable || 0) + (wasProfitable ? 1 : 0);
  const approved = Math.max(m.signals_approved || 1, 1);
  const proposed = Math.max(m.signals_proposed || 1, 1);
  const score = (profitable / approved) * 0.6 + (approved / proposed) * 0.4;

  await supabaseAdmin.from("syndicate_members").update({
    signals_profitable: profitable,
    contribution_score: Math.min(1, Math.max(0, score)),
  }).eq("syndicate_id", syndicateId).eq("agent_id", agentId);
}

export async function checkSyndicateFormation(syndicateId: string) {
  const { data: s } = await supabaseAdmin.from("syndicates")
    .select("name, status, member_count").eq("id", syndicateId).single();
  if (!s) return;

  if (s.status === "forming" && (s.member_count || 0) >= 3) {
    await supabaseAdmin.from("syndicates").update({ status: "active" }).eq("id", syndicateId);
    await postToChat(syndicateId, "00000000-0000-0000-0000-000000000000", "Syndicate",
      `SYNDICATE ACTIVATED — We hit 3 members. ${s.name} is now live. Time to hunt.`, "system");
  }
  if ((s.member_count || 0) >= 7) {
    await supabaseAdmin.from("syndicates").update({ status: "full" }).eq("id", syndicateId);
    await postToChat(syndicateId, "00000000-0000-0000-0000-000000000000", "Syndicate",
      `SYNDICATE FULL — ${s.name} has reached max capacity. 7 minds, one mission.`, "system");
  }
}

// ═══ QUERY HELPERS ═══

export async function getAgentSyndicate(agentId: string) {
  const { data } = await supabaseAdmin.from("syndicate_members")
    .select("syndicate_id, syndicates(id, name, status)")
    .eq("agent_id", agentId).eq("active", true).single();
  if (!data?.syndicates) return null;
  const s = data.syndicates as any;
  return s.status === "active" || s.status === "full" ? { id: s.id, name: s.name } : null;
}

export async function getApprovedSignalsForAgent(agentId: string) {
  const syndicate = await getAgentSyndicate(agentId);
  if (!syndicate) return [];

  const { data } = await supabaseAdmin.from("syndicate_signals")
    .select("*").eq("syndicate_id", syndicate.id)
    .eq("verdict", "approved").eq("executed", false)
    .eq("status", "resolved");

  return (data || []).filter((s: any) => {
    const votes = s.votes || [];
    const myVote = votes.find((v: any) => v.agent_id === agentId);
    return myVote?.vote === "approve";
  });
}
