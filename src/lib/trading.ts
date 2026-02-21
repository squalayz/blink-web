// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Autonomous Agent Trading (Base L2)
//
// Non-custodial: trades execute FROM user's own wallet.
// Platform never holds user funds.
// 1% fee on EVERY trade (buy AND sell) sent to platform wallet.
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase";
import { getWalletBalance, executeTrade, collectTradeFee, FEES } from "./wallet";

const RISK_ALLOC = { conservative: 0, balanced: 0.05, degen: 0.20 } as const;
const MAX_TRADE_PCT = { conservative: 0, balanced: 0.25, degen: 0.40 } as const;
const TAKE_PROFIT = { conservative: 0, balanced: 1.5, degen: 2.0 } as const;
const STOP_LOSS = { conservative: 0, balanced: 0.8, degen: 0.6 } as const;
const TRADE_FEE = FEES.TRADE_PCT; // 1% per trade (buy AND sell)

interface TrendingToken {
  address: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  signal: "strong_buy" | "buy" | "hold" | "sell";
}

async function detectTrendingTokens(): Promise<TrendingToken[]> {
  // Production: DexScreener API
  // const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=base");
  // Parse, filter by volume > $50k, momentum signals, etc.
  return []; // Empty until real data source connected
}

async function shouldTrade(
  token: TrendingToken, riskLevel: string,
  positions: any[], walletBalance: number
): Promise<{ action: "buy" | "sell" | "hold"; amount: number; reasoning: string }> {
  if (riskLevel === "conservative") return { action: "hold", amount: 0, reasoning: "Conservative: ETH only" };

  const alloc = walletBalance * (RISK_ALLOC[riskLevel as keyof typeof RISK_ALLOC] || 0);
  if (alloc < 0.0001) return { action: "hold", amount: 0, reasoning: "Insufficient balance for trading" };

  const existing = positions.find(p => p.token_address === token.address && p.action === "buy");
  if (existing) {
    const ratio = token.price / (existing.price_at_trade || token.price);
    const tp = TAKE_PROFIT[riskLevel as keyof typeof TAKE_PROFIT] || 1.5;
    const sl = STOP_LOSS[riskLevel as keyof typeof STOP_LOSS] || 0.8;
    if (ratio >= tp) return { action: "sell", amount: existing.amount_eth, reasoning: `Take profit at ${Math.round(ratio * 100)}%` };
    if (ratio <= sl) return { action: "sell", amount: existing.amount_eth, reasoning: `Stop loss at ${Math.round(ratio * 100)}%` };
    return { action: "hold", amount: 0, reasoning: `Holding at ${Math.round(ratio * 100)}%` };
  }

  if (token.signal === "strong_buy" || token.signal === "buy") {
    const maxTrade = alloc * (MAX_TRADE_PCT[riskLevel as keyof typeof MAX_TRADE_PCT] || 0.25);
    if (maxTrade < 0.0001) return { action: "hold", amount: 0, reasoning: "Trade amount too small" };
    return { action: "buy", amount: maxTrade, reasoning: `${token.signal}: ${token.symbol} ${token.priceChange24h > 0 ? "+" : ""}${token.priceChange24h}%` };
  }
  return { action: "hold", amount: 0, reasoning: "No signal" };
}

// ═══ Run autonomous trading for all enabled agents ═══
export async function runAutonomousTrading() {
  // Get users with trading enabled + their wallet keys
  const { data: agents } = await supabaseAdmin
    .from("agent_balances")
    .select("user_id, trading_enabled, risk_level, total_trading_pnl, total_fees")
    .eq("trading_enabled", true)
    .neq("risk_level", "conservative");

  if (!agents?.length) return;

  const trending = await detectTrendingTokens();
  if (!trending.length) return;

  for (const agent of agents) {
    try {
      // Get user's wallet
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("wallet_address, wallet_encrypted_key")
        .eq("id", agent.user_id).single();

      if (!user?.wallet_address || !user?.wallet_encrypted_key) continue;

      // Check real on-chain balance
      const walletBalance = await getWalletBalance(user.wallet_address);
      if (walletBalance < 0.001) continue; // Skip if dust

      const { data: positions } = await supabaseAdmin
        .from("trading_history").select("*")
        .eq("user_id", agent.user_id).eq("action", "buy")
        .order("created_at", { ascending: false }).limit(10);

      for (const token of trending) {
        const decision = await shouldTrade(token, agent.risk_level, positions || [], walletBalance);
        if (decision.action === "hold") continue;

        // Execute trade FROM user's own wallet
        const result = await executeTrade(
          user.wallet_encrypted_key,
          token.address,
          decision.amount,
          decision.action
        );

        if (result.success) {
          // 1% fee on EVERY trade (buy AND sell) — sent to platform wallet
          const fee = decision.amount * TRADE_FEE;
          const feeResult = await collectTradeFee(
            user.wallet_encrypted_key, decision.amount, decision.action, token.symbol
          );

          const pnl = decision.action === "sell" ? decision.amount * 0.1 : 0; // Placeholder PnL

          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id,
            token_address: token.address, token_symbol: token.symbol,
            action: decision.action, amount_eth: decision.amount,
            pnl_eth: decision.action === "sell" ? pnl - fee : -fee,
            tx_hash: result.txHash, fee_tx_hash: feeResult.feeTxHash,
            fee_eth: fee, reasoning: decision.reasoning,
          });

          // Update PnL tracking (fee deducted from every trade)
          await supabaseAdmin.from("agent_balances").update({
            total_trading_pnl: (agent.total_trading_pnl || 0) + (decision.action === "sell" ? pnl - fee : -fee),
            total_fees: (agent.total_fees || 0) + fee,
          }).eq("user_id", agent.user_id);

          // Notify user on sells
          if (decision.action === "sell") {
            try {
              const { sendNotification } = await import("@/lib/notifications");
              await sendNotification(agent.user_id, "agent_trade", {
                token: token.symbol, pnl: pnl - fee,
                action: "sell", amount: decision.amount, fee,
              });
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error(`Trading error for ${agent.user_id}:`, err);
    }
  }
}

// ═══ Check low balances — queries on-chain for each active user ═══
export async function checkLowBalances() {
  // Get all users with wallets who are onboarded
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, wallet_address")
    .eq("onboarded", true)
    .not("wallet_address", "is", null);

  if (!users?.length) return;

  const { sendNotification } = await import("@/lib/notifications");

  for (const user of users) {
    if (!user.wallet_address) continue;
    try {
      const balance = await getWalletBalance(user.wallet_address);
      if (balance < 0.005 && balance > 0) {
        await sendNotification(user.id, "balance_low", {
          balance, threshold: "0.005",
          wallet_address: user.wallet_address,
        });
      }
    } catch {}
  }
}
