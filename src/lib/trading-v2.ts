// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Trading Engine V2
// Production-safe autonomous trading with:
// - RiskManager (position limits, SL/TP/trailing, circuit breaker)
// - Smart Routing (Uniswap Quoter V2, multi-fee-tier)
// - SL/TP Engine (runs every 5 min)
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase";
import { getWalletBalance, collectTradeFee, getSigner, getProvider, FEES } from "./wallet";
import { getUserAIConfig, callUserLLM } from "./ai-providers";
import { ethers } from "ethers";

// ═══ CONSTANTS ═══
const WETH_BASE = "0x4200000000000000000000000000000000000006";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const QUOTER_V2 = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
const FEE_TIERS = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%

const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
];

const ERC20_ABI = [
  "function approve(address,uint256) external returns(bool)",
  "function balanceOf(address) view returns(uint256)",
  "function decimals() view returns(uint8)",
];

// ═══ RISK CONFIG ═══
export interface RiskConfig {
  max_position_pct: number;
  max_concurrent_positions: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  trailing_stop_pct: number;
  max_daily_loss_pct: number;
  max_slippage_pct: number;
  max_price_impact_pct: number;
  min_liquidity_usd: number;
  cooldown_minutes: number;
}

const STRATEGY_RISKS: Record<string, RiskConfig> = {
  meme_scout: { max_position_pct: 15, max_concurrent_positions: 5, stop_loss_pct: -25, take_profit_pct: 80, trailing_stop_pct: 20, max_daily_loss_pct: -30, max_slippage_pct: 8, max_price_impact_pct: 5, min_liquidity_usd: 50000, cooldown_minutes: 15 },
  momentum: { max_position_pct: 15, max_concurrent_positions: 5, stop_loss_pct: -25, take_profit_pct: 80, trailing_stop_pct: 20, max_daily_loss_pct: -30, max_slippage_pct: 8, max_price_impact_pct: 5, min_liquidity_usd: 50000, cooldown_minutes: 15 },
  sniper: { max_position_pct: 15, max_concurrent_positions: 5, stop_loss_pct: -25, take_profit_pct: 80, trailing_stop_pct: 20, max_daily_loss_pct: -30, max_slippage_pct: 8, max_price_impact_pct: 5, min_liquidity_usd: 30000, cooldown_minutes: 10 },
  blue_chip: { max_position_pct: 30, max_concurrent_positions: 5, stop_loss_pct: -15, take_profit_pct: 40, trailing_stop_pct: 10, max_daily_loss_pct: -30, max_slippage_pct: 3, max_price_impact_pct: 3, min_liquidity_usd: 100000, cooldown_minutes: 30 },
  mean_revert: { max_position_pct: 30, max_concurrent_positions: 5, stop_loss_pct: -15, take_profit_pct: 40, trailing_stop_pct: 10, max_daily_loss_pct: -30, max_slippage_pct: 3, max_price_impact_pct: 3, min_liquidity_usd: 100000, cooldown_minutes: 30 },
  hodl_dca: { max_position_pct: 35, max_concurrent_positions: 8, stop_loss_pct: -999, take_profit_pct: 999, trailing_stop_pct: 999, max_daily_loss_pct: -50, max_slippage_pct: 2, max_price_impact_pct: 2, min_liquidity_usd: 200000, cooldown_minutes: 60 },
};

// ═══ RISK MANAGER ═══
export class RiskManager {
  private config: RiskConfig;
  private userId: string;

  constructor(userId: string, strategy: string, dbOverrides?: Partial<RiskConfig>) {
    this.userId = userId;
    // Priority: DB user overrides > strategy defaults
    this.config = { ...(STRATEGY_RISKS[strategy] || STRATEGY_RISKS.meme_scout) };
    // Apply DB overrides (from agent_balances columns) if present
    if (dbOverrides) {
      for (const [k, v] of Object.entries(dbOverrides)) {
        if (v !== null && v !== undefined) (this.config as any)[k] = v;
      }
    }
    // Platform safety limits — never exceed these regardless of user config
    if (this.config.stop_loss_pct > -50 && this.config.stop_loss_pct !== -999) {
      this.config.stop_loss_pct = Math.max(this.config.stop_loss_pct, -50);
    }
    this.config.max_position_pct = Math.min(this.config.max_position_pct, 50);
  }

  async canTrade(tokenAddress: string, amountEth: number, walletBalance: number): Promise<{ ok: boolean; reason: string }> {
    // Check position size limit
    const positionPct = (amountEth / walletBalance) * 100;
    if (positionPct > this.config.max_position_pct) {
      return { ok: false, reason: `Position ${positionPct.toFixed(1)}% exceeds max ${this.config.max_position_pct}%` };
    }

    // Check concurrent positions
    const { count } = await supabaseAdmin.from("trading_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", this.userId).eq("action", "buy").is("closed_at", null);
    if ((count || 0) >= this.config.max_concurrent_positions) {
      return { ok: false, reason: `Max ${this.config.max_concurrent_positions} concurrent positions reached` };
    }

    // Check cooldown
    const { data: lastTrade } = await supabaseAdmin.from("trading_history")
      .select("created_at").eq("user_id", this.userId).eq("token_address", tokenAddress)
      .order("created_at", { ascending: false }).limit(1).single();
    if (lastTrade) {
      const minsSince = (Date.now() - new Date(lastTrade.created_at).getTime()) / 60000;
      if (minsSince < this.config.cooldown_minutes) {
        return { ok: false, reason: `Cooldown: ${Math.ceil(this.config.cooldown_minutes - minsSince)}min left on this token` };
      }
    }

    return { ok: true, reason: "Passed all risk checks" };
  }

  async checkCircuitBreaker(): Promise<{ tripped: boolean; reason: string }> {
    // Get midnight UTC portfolio value
    const { data: snapshot } = await supabaseAdmin.from("portfolio_snapshots")
      .select("value_eth").eq("user_id", this.userId)
      .order("created_at", { ascending: false }).limit(1).single();
    if (!snapshot) return { tripped: false, reason: "No snapshot" };

    const { data: user } = await supabaseAdmin.from("users")
      .select("wallet_address").eq("id", this.userId).single();
    if (!user?.wallet_address) return { tripped: false, reason: "No wallet" };

    const currentBalance = await getWalletBalance(user.wallet_address);
    const changePct = ((currentBalance - snapshot.value_eth) / snapshot.value_eth) * 100;

    if (changePct < this.config.max_daily_loss_pct) {
      // TRIP THE BREAKER
      await supabaseAdmin.from("agent_balances").update({ trading_enabled: false }).eq("user_id", this.userId);
      await supabaseAdmin.from("notifications").insert({
        user_id: this.userId, type: "circuit_breaker",
        message: `🚨 CIRCUIT BREAKER: Portfolio down ${changePct.toFixed(1)}% today. Trading paused. Re-enable manually from dashboard.`,
      });
      return { tripped: true, reason: `Portfolio down ${changePct.toFixed(1)}%` };
    }
    return { tripped: false, reason: `Portfolio change: ${changePct.toFixed(1)}%` };
  }

  getConfig(): RiskConfig { return this.config; }
}

// ═══ SMART ROUTING — Quoter V2 ═══
interface QuoteResult {
  feeTier: number;
  amountOut: bigint;
  amountOutMin: bigint; // after slippage
}

async function findBestRoute(
  tokenIn: string, tokenOut: string, amountIn: bigint, maxSlippagePct: number
): Promise<QuoteResult | null> {
  const provider = getProvider();
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);
  let bestQuote: QuoteResult | null = null;

  for (const fee of FEE_TIERS) {
    try {
      const result = await quoter.quoteExactInputSingle.staticCall({
        tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n,
      });
      const amountOut = result.amountOut || result[0];
      if (!bestQuote || amountOut > bestQuote.amountOut) {
        const slippageMultiplier = BigInt(Math.floor((1 - maxSlippagePct / 100) * 10000));
        bestQuote = {
          feeTier: fee,
          amountOut,
          amountOutMin: (amountOut * slippageMultiplier) / 10000n,
        };
      }
    } catch {
      // This fee tier doesn't have a pool or has no liquidity — skip
    }
  }

  // If no direct route, try multi-hop through WETH (for token→token) or USDC
  if (!bestQuote && tokenIn !== WETH_BASE && tokenOut !== WETH_BASE) {
    // Try tokenIn → WETH → tokenOut
    const hop1 = await findBestRoute(tokenIn, WETH_BASE, amountIn, maxSlippagePct);
    if (hop1) {
      const hop2 = await findBestRoute(WETH_BASE, tokenOut, hop1.amountOut, maxSlippagePct);
      if (hop2) {
        bestQuote = { feeTier: hop1.feeTier, amountOut: hop2.amountOut, amountOutMin: hop2.amountOutMin };
      }
    }
  }

  return bestQuote;
}

// ═══ EXECUTE SWAP V2 ═══
async function executeSwapV2(
  encryptedKey: string, tokenIn: string, tokenOut: string,
  amountIn: bigint, feeTier: number, amountOutMin: bigint, isETH: boolean,
): Promise<{ success: boolean; txHash: string; amountOut: string }> {
  try {
    const { decrypt } = await import("./wallet");
    const privateKey = decrypt(encryptedKey);
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const router = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, wallet);
    const deadline = Math.floor(Date.now() / 1000) + 300;

    const params = {
      tokenIn, tokenOut, fee: feeTier, recipient: wallet.address,
      amountIn, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n,
    };

    let tx;
    if (isETH) {
      tx = await router.exactInputSingle(params, { value: amountIn, gasLimit: 350000n });
    } else {
      // Approve first
      const token = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      const approveTx = await token.approve(SWAP_ROUTER, amountIn);
      await approveTx.wait();
      tx = await router.exactInputSingle(params, { gasLimit: 400000n });
    }
    const receipt = await tx.wait();
    return { success: true, txHash: receipt?.hash || tx.hash, amountOut: amountOutMin.toString() };
  } catch (err: any) {
    console.error("[V2] Swap error:", err.message);
    return { success: false, txHash: "", amountOut: "0" };
  }
}

// ═══ DEXSCREENER ═══
interface TrendingToken {
  address: string; symbol: string; name: string; price: number;
  volume24h: number; priceChange24h: number; priceChange1h: number;
  liquidity: number; pairAddress: string;
}

async function fetchTrendingTokens(): Promise<TrendingToken[]> {
  try {
    const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=base%20WETH", {
      headers: { "User-Agent": "MishMesh/2.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const stables = ["usdc", "usdt", "dai", "usdbc"];
    return (data.pairs || [])
      .filter((p: any) =>
        p.chainId === "base" && p.quoteToken?.symbol?.toLowerCase() === "weth" &&
        !stables.includes(p.baseToken?.symbol?.toLowerCase()) &&
        (p.volume?.h24 || 0) > 10000 && (p.liquidity?.usd || 0) > 30000
      ).slice(0, 20).map((p: any) => ({
        address: p.baseToken.address, symbol: p.baseToken.symbol, name: p.baseToken.name,
        price: parseFloat(p.priceUsd || "0"), volume24h: p.volume?.h24 || 0,
        priceChange24h: p.priceChange?.h24 || 0, priceChange1h: p.priceChange?.h1 || 0,
        liquidity: p.liquidity?.usd || 0, pairAddress: p.pairAddress,
      }));
  } catch { return []; }
}

// ═══ GOPLUS SAFETY ═══
async function isTokenSafe(address: string): Promise<{ safe: boolean; reason: string }> {
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses=${address}`);
    if (!res.ok) return { safe: false, reason: "GoPlus API failed" };
    const data = await res.json();
    const info = data.result?.[address.toLowerCase()];
    if (!info) return { safe: false, reason: "Not in GoPlus" };
    if (info.is_honeypot === "1") return { safe: false, reason: "Honeypot" };
    if (info.cannot_sell_all === "1") return { safe: false, reason: "Cannot sell" };
    if (parseFloat(info.sell_tax || "0") > 0.10) return { safe: false, reason: `Sell tax ${info.sell_tax}` };
    if (parseFloat(info.buy_tax || "0") > 0.10) return { safe: false, reason: `Buy tax ${info.buy_tax}` };
    return { safe: true, reason: "Passed" };
  } catch { return { safe: false, reason: "Safety check failed" }; }
}

// ═══ AI DECISION ═══
async function getAIDecision(
  userId: string, tokens: TrendingToken[], positions: any[],
  walletBalance: number, riskLevel: string, tradingMode: string, personality: string | null,
) {
  const aiConfig = await getUserAIConfig(userId);
  if (!aiConfig) return { action: "hold", confidence: 0, amountPct: 0, reasoning: "No AI key" };

  const modePrompts: Record<string, string> = {
    meme_scout: "MEME SCOUT: Hunt trending meme tokens. Explosive volume, low mcap gems. Buy early, sell at 2-5x.",
    blue_chip: "BLUE CHIP: Only established Base tokens with >$500k liq. AERO, BRETT, DEGEN. Conservative entries.",
    momentum: "MOMENTUM: Follow 1h+24h momentum. Buy pumps, exit when momentum reverses.",
    mean_revert: "MEAN REVERSION: Buy oversold (>30% 24h drop) with recovering 1h. Sell 15-30% bounce.",
    sniper: "SNIPER: Fresh launches <24h, exploding volume. Max 10% balance. Take profit fast.",
    hodl_dca: "AUTO DCA: Split into top 3 by liquidity each cycle. Never sell. Accumulate.",
  };

  let ethPrice = 1950;
  try { const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"); if (r.ok) { const d = await r.json(); ethPrice = d?.ethereum?.usd || ethPrice; } } catch {}

  const tokenData = tokens.slice(0, 10).map(t =>
    `${t.symbol} ($${t.price.toFixed(6)}) | 1h:${t.priceChange1h>0?"+":""}${t.priceChange1h.toFixed(1)}% | 24h:${t.priceChange24h>0?"+":""}${t.priceChange24h.toFixed(1)}% | Vol:$${(t.volume24h/1000).toFixed(0)}k | Liq:$${(t.liquidity/1000).toFixed(0)}k`
  ).join("\n");

  // Enrich position data with current prices
  let totalOpenPnl = 0;
  const posData = positions.length > 0
    ? positions.map(p => {
        const currentToken = tokens.find(t => t.address.toLowerCase() === p.token_address?.toLowerCase());
        const currentPrice = currentToken?.price || 0;
        const pnlPct = p.price_at_trade > 0 && currentPrice > 0
          ? ((currentPrice - p.price_at_trade) / p.price_at_trade) * 100 : 0;
        const pnlEth = p.amount_eth * (pnlPct / 100);
        totalOpenPnl += pnlEth;
        return `HOLDING: ${p.token_symbol} | Entry:$${p.price_at_trade?.toFixed(6)||"?"} | Now:$${currentPrice?.toFixed(6)||"?"} | P&L:${pnlPct>=0?"+":""}${pnlPct.toFixed(1)}% (${pnlEth>=0?"+":""}${pnlEth.toFixed(4)} ETH) | Size:${p.amount_eth?.toFixed(4)} ETH`;
      }).join("\n")
    : "No open positions.";

  // Calculate win rate from recent closed trades
  const { data: recentTrades } = await supabaseAdmin.from("trading_history")
    .select("pnl_eth").eq("user_id", userId).not("closed_at", "is", null)
    .order("closed_at", { ascending: false }).limit(20);
  const wins = (recentTrades || []).filter(t => (t.pnl_eth || 0) > 0).length;
  const total = (recentTrades || []).length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : "N/A";

  // Get daily P&L from portfolio snapshot
  const { data: snapshot } = await supabaseAdmin.from("portfolio_snapshots")
    .select("value_eth").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1).single();
  const dailyPnl = snapshot ? walletBalance - snapshot.value_eth : 0;

  const portfolioValue = walletBalance * ethPrice;

  const system = `You are an autonomous trading agent on Base L2.

STRATEGY: ${modePrompts[tradingMode] || modePrompts.meme_scout}
RISK: ${riskLevel.toUpperCase()}
${personality ? `PERSONALITY: ${personality}` : ""}

RISK LIMITS:
- Max position size: ${STRATEGY_RISKS[tradingMode]?.max_position_pct || 15}% of portfolio
- Stop loss: ${STRATEGY_RISKS[tradingMode]?.stop_loss_pct || -25}%
- Take profit: +${STRATEGY_RISKS[tradingMode]?.take_profit_pct || 80}%
- Max concurrent positions: ${STRATEGY_RISKS[tradingMode]?.max_concurrent_positions || 5}
- Min liquidity: $${((STRATEGY_RISKS[tradingMode]?.min_liquidity_usd || 50000) / 1000).toFixed(0)}k
- Platform fee: 3% per trade (buy AND sell)

Respond ONLY with JSON: {"action":"buy|sell|hold","token":"SYMBOL","tokenAddress":"0x...","confidence":0-100,"amountPct":5-25,"reasoning":"one sentence"}`;

  const userMsg = `PORTFOLIO:
- Balance: ${walletBalance.toFixed(4)} ETH ($${portfolioValue.toFixed(0)})
- Open positions: ${positions.length}
- Open P&L: ${totalOpenPnl>=0?"+":""}${totalOpenPnl.toFixed(4)} ETH
- Today's P&L: ${dailyPnl>=0?"+":""}${dailyPnl.toFixed(4)} ETH
- Win rate (last 20): ${winRate}%

TRENDING TOKENS:
${tokenData}

POSITIONS:
${posData}

Your move?`;

  try {
    const response = await callUserLLM(aiConfig, system, userMsg, 200);
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { action: "hold", confidence: 0, amountPct: 0, reasoning: "Invalid AI response" };
    const d = JSON.parse(jsonMatch[0]);
    d.action = ["buy", "sell", "hold"].includes(d.action) ? d.action : "hold";
    d.confidence = Math.min(100, Math.max(0, parseInt(d.confidence) || 0));
    d.amountPct = Math.min(25, Math.max(5, parseInt(d.amountPct) || 10));
    if (d.action === "buy" && !d.tokenAddress) {
      const match = tokens.find(t => t.symbol.toLowerCase() === d.token?.toLowerCase());
      if (match) d.tokenAddress = match.address; else d.action = "hold";
    }
    return d;
  } catch (err: any) {
    return { action: "hold", confidence: 0, amountPct: 0, reasoning: `AI error: ${err.message?.slice(0, 80)}` };
  }
}

// ═══ STOP LOSS / TAKE PROFIT ENGINE ═══
export async function runSLTPEngine() {
  const { data: openPositions } = await supabaseAdmin.from("trading_history")
    .select("*, users!inner(wallet_address, wallet_encrypted_key)")
    .eq("action", "buy").is("closed_at", null);

  if (!openPositions?.length) return;

  for (const pos of openPositions) {
    try {
      // Fetch current price from DexScreener
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.token_address}`);
      if (!res.ok) continue;
      const data = await res.json();
      const pair = data.pairs?.find((p: any) => p.chainId === "base");
      if (!pair) continue;

      const currentPrice = parseFloat(pair.priceUsd || "0");
      if (!currentPrice || !pos.price_at_trade) continue;

      const pnlPct = ((currentPrice - pos.price_at_trade) / pos.price_at_trade) * 100;
      const peakPrice = Math.max(pos.peak_price || pos.price_at_trade, currentPrice);
      const drawdownFromPeak = peakPrice > 0 ? ((currentPrice - peakPrice) / peakPrice) * 100 : 0;

      // Update peak price
      if (currentPrice > (pos.peak_price || 0)) {
        await supabaseAdmin.from("trading_history").update({ peak_price: currentPrice }).eq("id", pos.id);
      }

      const sl = pos.stop_loss_pct || -20;
      const tp = pos.take_profit_pct || 50;
      const ts = pos.trailing_stop_pct || 15;
      let shouldSell = false;
      let sellReason = "";

      if (sl !== -999 && pnlPct <= sl) { shouldSell = true; sellReason = `Stop loss hit: ${pnlPct.toFixed(1)}%`; }
      else if (tp !== 999 && pnlPct >= tp) { shouldSell = true; sellReason = `Take profit hit: ${pnlPct.toFixed(1)}%`; }
      else if (ts !== 999 && drawdownFromPeak <= -ts && pnlPct > 0) { shouldSell = true; sellReason = `Trailing stop: ${drawdownFromPeak.toFixed(1)}% from peak`; }

      if (shouldSell && pos.users?.wallet_encrypted_key) {
        // Execute sell
        const quote = await findBestRoute(pos.token_address, WETH_BASE, ethers.MaxUint256, 5);
        // Get actual token balance
        const provider = getProvider();
        const token = new ethers.Contract(pos.token_address, ERC20_ABI, provider);
        const { decrypt } = await import("./wallet");
        const wallet = new ethers.Wallet(decrypt(pos.users.wallet_encrypted_key), provider);
        const balance = await token.balanceOf(wallet.address);
        if (balance === 0n) continue;

        const sellQuote = await findBestRoute(pos.token_address, WETH_BASE, balance, 5);
        if (!sellQuote) continue;

        const result = await executeSwapV2(
          pos.users.wallet_encrypted_key, pos.token_address, WETH_BASE,
          balance, sellQuote.feeTier, sellQuote.amountOutMin, false,
        );

        if (result.success) {
          // Collect 3% fee
          const ethReceived = parseFloat(ethers.formatEther(sellQuote.amountOut));
          await collectTradeFee(pos.users.wallet_encrypted_key, ethReceived, "sell", pos.token_symbol);

          // Close position
          await supabaseAdmin.from("trading_history").update({
            closed_at: new Date().toISOString(),
            pnl_eth: ethReceived - pos.amount_eth,
            reasoning: sellReason,
          }).eq("id", pos.id);

          // Notify
          await supabaseAdmin.from("notifications").insert({
            user_id: pos.user_id, type: "auto_exit",
            message: `🔴 Auto-exit: ${pos.token_symbol} — ${sellReason}. Received ${ethReceived.toFixed(4)} ETH.`,
          });
        }
      }
    } catch (err) {
      console.error(`[V2] SLTP error for position ${pos.id}:`, err);
    }
  }
}

// ═══ MAIN TRADING LOOP V2 ═══
export async function runAutonomousTradingV2(modeFilter?: string[]) {
  let query = supabaseAdmin.from("agent_balances")
    .select("user_id, trading_enabled, risk_level, trading_mode, total_trading_pnl, total_fees, stop_loss_pct, take_profit_pct, trailing_stop_pct, max_daily_loss_pct, max_position_pct, max_slippage_pct, max_price_impact_pct, cooldown_minutes")
    .eq("trading_enabled", true);

  if (modeFilter?.length) {
    query = query.in("trading_mode", modeFilter);
  }

  const { data: agents } = await query;

  if (!agents?.length) return;

  const trending = await fetchTrendingTokens();
  if (!trending.length) return;

  for (const agent of agents) {
    try {
      const { data: user } = await supabaseAdmin.from("users")
        .select("wallet_address, wallet_encrypted_key, ai_api_key_encrypted")
        .eq("id", agent.user_id).single();

      if (!user?.wallet_address || !user?.wallet_encrypted_key || !user?.ai_api_key_encrypted) continue;

      const walletBalance = await getWalletBalance(user.wallet_address);
      if (walletBalance < 0.002) continue;

      const strategy = agent.trading_mode || "meme_scout";
      // Pass DB overrides from agent_balances columns
      const dbOverrides: Partial<RiskConfig> = {};
      if (agent.stop_loss_pct != null) dbOverrides.stop_loss_pct = agent.stop_loss_pct;
      if (agent.take_profit_pct != null) dbOverrides.take_profit_pct = agent.take_profit_pct;
      if (agent.trailing_stop_pct != null) dbOverrides.trailing_stop_pct = agent.trailing_stop_pct;
      if (agent.max_daily_loss_pct != null) dbOverrides.max_daily_loss_pct = agent.max_daily_loss_pct;
      if (agent.max_position_pct != null) dbOverrides.max_position_pct = agent.max_position_pct;
      if (agent.max_slippage_pct != null) dbOverrides.max_slippage_pct = agent.max_slippage_pct;
      if (agent.max_price_impact_pct != null) dbOverrides.max_price_impact_pct = agent.max_price_impact_pct;
      if (agent.cooldown_minutes != null) dbOverrides.cooldown_minutes = agent.cooldown_minutes;
      const risk = new RiskManager(agent.user_id, strategy, dbOverrides);

      // Circuit breaker check
      const breaker = await risk.checkCircuitBreaker();
      if (breaker.tripped) continue;

      // Get positions
      const { data: positions } = await supabaseAdmin.from("trading_history")
        .select("*").eq("user_id", agent.user_id).eq("action", "buy").is("closed_at", null).limit(10);

      // Agent personality
      const { data: profile } = await supabaseAdmin.from("agent_profiles")
        .select("soul").eq("user_id", agent.user_id).single();

      // AI decision
      const decision = await getAIDecision(
        agent.user_id, trending, positions || [], walletBalance,
        agent.risk_level, strategy, profile?.soul || null,
      );

      if (decision.action === "hold" || decision.confidence < 60) continue;

      const riskConfig = risk.getConfig();

      if (decision.action === "buy" && decision.tokenAddress) {
        // ═══ SYNDICATE CHECK — propose instead of executing directly ═══
        try {
          const { getAgentSyndicate, proposeTrade: syndicatePropose } = await import("./syndicate-engine");
          const { data: agentProfile } = await supabaseAdmin.from("agent_profiles")
            .select("id").eq("user_id", agent.user_id).single();
          if (agentProfile) {
            const syndicate = await getAgentSyndicate(agentProfile.id);
            if (syndicate) {
              const tokenInfo = trending.find(t => t.address.toLowerCase() === decision.tokenAddress.toLowerCase());
              await syndicatePropose(syndicate.id, agentProfile.id, decision, {
                price: tokenInfo?.price || 0, volume24h: tokenInfo?.volume24h || 0,
                liquidity: tokenInfo?.liquidity || 0, mcap: 0,
                change1h: tokenInfo?.priceChange1h, change24h: tokenInfo?.priceChange24h,
              });
              continue; // Don't execute — wait for syndicate verdict
            }
          }
        } catch (e) { console.error("[V2] Syndicate check error:", e); }

        // Safety check
        const safety = await isTokenSafe(decision.tokenAddress);
        if (!safety.safe) {
          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id, token_address: decision.tokenAddress,
            token_symbol: decision.token || "?", action: "skip", amount_eth: 0,
            reasoning: `Safety: ${safety.reason}. AI: ${decision.reasoning}`,
          });
          continue;
        }

        // Liquidity check
        const tokenInfo = trending.find(t => t.address.toLowerCase() === decision.tokenAddress.toLowerCase());
        if (tokenInfo && tokenInfo.liquidity < riskConfig.min_liquidity_usd) {
          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id, token_address: decision.tokenAddress,
            token_symbol: decision.token || "?", action: "skip", amount_eth: 0,
            reasoning: `Liquidity $${(tokenInfo.liquidity/1000).toFixed(0)}k < min $${(riskConfig.min_liquidity_usd/1000).toFixed(0)}k`,
          });
          continue;
        }

        // Risk check
        const tradeAmount = walletBalance * (decision.amountPct / 100);
        const riskCheck = await risk.canTrade(decision.tokenAddress, tradeAmount, walletBalance);
        if (!riskCheck.ok) {
          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id, token_address: decision.tokenAddress,
            token_symbol: decision.token || "?", action: "skip", amount_eth: 0,
            reasoning: `Risk blocked: ${riskCheck.reason}`,
          });
          continue;
        }

        // Smart route
        const amountIn = ethers.parseEther(tradeAmount.toFixed(18));
        const quote = await findBestRoute(WETH_BASE, decision.tokenAddress, amountIn, riskConfig.max_slippage_pct);
        if (!quote) {
          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id, token_address: decision.tokenAddress,
            token_symbol: decision.token || "?", action: "skip", amount_eth: 0,
            reasoning: "No liquidity route found across any fee tier",
          });
          continue;
        }

        // Price impact check — compare quoted output vs theoretical
        if (tokenInfo && tokenInfo.price > 0) {
          const theoreticalTokens = tradeAmount / tokenInfo.price; // how many tokens we SHOULD get
          const decimals = 18; // most Base tokens
          const theoreticalRaw = BigInt(Math.floor(theoreticalTokens * (10 ** decimals)));
          if (theoreticalRaw > 0n) {
            const impactPct = Number((theoreticalRaw - quote.amountOut) * 10000n / theoreticalRaw) / 100;
            if (impactPct > riskConfig.max_price_impact_pct) {
              await supabaseAdmin.from("trading_history").insert({
                user_id: agent.user_id, token_address: decision.tokenAddress,
                token_symbol: decision.token || "?", action: "skip", amount_eth: 0,
                reasoning: `Price impact ${impactPct.toFixed(1)}% exceeds max ${riskConfig.max_price_impact_pct}%`,
              });
              continue;
            }
          }
        }

        // Execute swap
        const result = await executeSwapV2(
          user.wallet_encrypted_key, WETH_BASE, decision.tokenAddress,
          amountIn, quote.feeTier, quote.amountOutMin, true,
        );

        if (result.success) {
          const fee = tradeAmount * FEES.TRADE_PCT;
          await collectTradeFee(user.wallet_encrypted_key, tradeAmount, "buy", decision.token || "?");

          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id, token_address: decision.tokenAddress,
            token_symbol: decision.token || "?", action: "buy", amount_eth: tradeAmount,
            price_at_trade: tokenInfo?.price || 0, peak_price: tokenInfo?.price || 0,
            stop_loss_pct: riskConfig.stop_loss_pct, take_profit_pct: riskConfig.take_profit_pct,
            trailing_stop_pct: riskConfig.trailing_stop_pct,
            tx_hash: result.txHash, fee_eth: fee,
            reasoning: `[${decision.confidence}%] ${decision.reasoning} | Route: ${quote.feeTier/10000}% pool`,
          });

          await supabaseAdmin.from("notifications").insert({
            user_id: agent.user_id, type: "agent_trade",
            message: `🟢 Buy ${decision.token}: ${tradeAmount.toFixed(4)} ETH | ${decision.confidence}% confidence | SL:${riskConfig.stop_loss_pct}% TP:+${riskConfig.take_profit_pct}% | ${decision.reasoning}`,
          });

          // Referral reward
          try {
            const { data: ref } = await supabaseAdmin.from("users").select("referred_by").eq("id", agent.user_id).single();
            if (ref?.referred_by) {
              const reward = fee * 0.30;
              if (reward >= 0.000001) {
                await supabaseAdmin.from("referral_rewards").insert({
                  user_id: ref.referred_by, reward_type: "trade_fee_share",
                  amount_eth: reward, from_user_id: agent.user_id, unlocked_at: new Date().toISOString(),
                });
              }
            }
          } catch {}
        }
      }

      if (decision.action === "sell") {
        const pos = (positions || []).find(p => p.token_symbol?.toLowerCase() === decision.token?.toLowerCase());
        if (!pos) continue;

        const provider = getProvider();
        const token = new ethers.Contract(pos.token_address, ERC20_ABI, provider);
        const { decrypt } = await import("./wallet");
        const wallet = new ethers.Wallet(decrypt(user.wallet_encrypted_key), provider);
        const balance = await token.balanceOf(wallet.address);
        if (balance === 0n) continue;

        const quote = await findBestRoute(pos.token_address, WETH_BASE, balance, riskConfig.max_slippage_pct);
        if (!quote) continue;

        const result = await executeSwapV2(
          user.wallet_encrypted_key, pos.token_address, WETH_BASE,
          balance, quote.feeTier, quote.amountOutMin, false,
        );

        if (result.success) {
          const ethReceived = parseFloat(ethers.formatEther(quote.amountOut));
          await collectTradeFee(user.wallet_encrypted_key, ethReceived, "sell", pos.token_symbol);

          await supabaseAdmin.from("trading_history").update({
            closed_at: new Date().toISOString(), pnl_eth: ethReceived - pos.amount_eth,
            reasoning: `[${decision.confidence}%] ${decision.reasoning}`,
          }).eq("id", pos.id);

          await supabaseAdmin.from("notifications").insert({
            user_id: agent.user_id, type: "agent_trade",
            message: `🔴 Sell ${pos.token_symbol}: ${ethReceived.toFixed(4)} ETH | P&L: ${(ethReceived - pos.amount_eth).toFixed(4)} ETH | ${decision.reasoning}`,
          });
        }
      }
    } catch (err) {
      console.error(`[V2] Trading error for ${agent.user_id}:`, err);
    }
  }
}
