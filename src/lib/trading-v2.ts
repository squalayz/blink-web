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
import { detectMarketRegime, adjustForRegime, type MarketRegime } from "./market-regime";
import { shouldAutoSell, TAKE_PROFIT_TIERS } from "./position-manager";
import { passesAntiChurn } from "./anti-churn";
import { calculateKellySize } from "./kelly-sizing";
import { generateReportCard, getReportCardsForPrompt, updatePostExitPrices } from "./report-cards";

// ═══ CONSTANTS ═══
const WETH_BASE = "0x4200000000000000000000000000000000000006";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const QUOTER_V2 = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
const FEE_TIERS = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%

// ═══ GAS RESERVE — NEVER SPEND BELOW THIS ═══
// Base L2 gas is ~0.0001-0.001 ETH per tx. We need enough to:
// 1. Approve token (if selling) ~0.0002 ETH
// 2. Execute sell swap ~0.0005 ETH
// 3. Buffer for gas spikes ~0.0003 ETH
// Total: ~0.001 ETH minimum. We use 0.002 as safe reserve.
const GAS_RESERVE_ETH = 0.002;

// ETH price cache
let _cachedEthPrice = 1950;
let _ethPriceCacheTime = 0;

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
    // Gas reserve check — NEVER let balance drop below reserve
    const availableBalance = walletBalance - GAS_RESERVE_ETH;
    if (amountEth > availableBalance) {
      return { ok: false, reason: `Trade ${amountEth.toFixed(4)} ETH would breach gas reserve (available: ${availableBalance.toFixed(4)}, reserve: ${GAS_RESERVE_ETH})` };
    }

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

    // Block buying tokens we already hold an open position in
    const { data: existingPos } = await supabaseAdmin.from("trading_history")
      .select("id").eq("user_id", this.userId).eq("action", "buy").is("closed_at", null)
      .eq("token_address", tokenAddress).limit(1);
    if (existingPos && existingPos.length > 0) {
      return { ok: false, reason: `Already holding open position in this token — diversify!` };
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

// Known high-liquidity Base tokens — always check these
// ═══ MODE-SPECIFIC TOKEN WATCHLISTS ═══
const BLUE_CHIP_TOKENS = [
  "0x940181a94A35A4569E4529A3CDfB74e38FD98631", // AERO
  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC
  "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", // VIRTUAL
  "0x532f27101965dd16442E59d40670FaF5eBB142E4", // BRETT
];

const MEME_DEGEN_TOKENS = [
  "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", // DEGEN
  "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4", // TOSHI
  "0x2Da56AcB9Ea78330f947bD57C54119Debda7AF71", // MOG
  "0x768BE13e1680b5ebE0024C42c896E3dB59ec0149", // MFER
  "0xBC45647eA894030a4E9801Ec03479739FA2485F0", // KEYCAT
  "0x22e6966B799c4D5B13BE962E1D117b56327FDa66", // WEIRDO
  "0xB1a03EdA10342529bBF8EB700a06C60441fEf25d", // MIGGLES
];

const ALL_TOKENS = [...BLUE_CHIP_TOKENS, ...MEME_DEGEN_TOKENS];

// Mode → which watchlist + min liquidity for DexScreener search
const MODE_TOKEN_CONFIG: Record<string, { watchlist: string[]; searchQuery: string; minLiq: number; minVol: number; sortBy: "volume" | "change1h" }> = {
  meme_scout:  { watchlist: MEME_DEGEN_TOKENS, searchQuery: "base meme", minLiq: 20000, minVol: 5000, sortBy: "change1h" },
  momentum:    { watchlist: ALL_TOKENS, searchQuery: "base trending", minLiq: 30000, minVol: 10000, sortBy: "change1h" },
  sniper:      { watchlist: MEME_DEGEN_TOKENS, searchQuery: "base new", minLiq: 10000, minVol: 3000, sortBy: "volume" },
  blue_chip:   { watchlist: BLUE_CHIP_TOKENS, searchQuery: "base AERO BRETT", minLiq: 100000, minVol: 50000, sortBy: "volume" },
  mean_revert: { watchlist: ALL_TOKENS, searchQuery: "base WETH", minLiq: 50000, minVol: 20000, sortBy: "volume" },
  hodl_dca:    { watchlist: BLUE_CHIP_TOKENS, searchQuery: "base AERO", minLiq: 200000, minVol: 50000, sortBy: "volume" },
};

async function fetchTrendingTokens(tradingMode?: string): Promise<TrendingToken[]> {
  const config = MODE_TOKEN_CONFIG[tradingMode || "meme_scout"] || MODE_TOKEN_CONFIG.meme_scout;
  const tokens: TrendingToken[] = [];
  const seen = new Set<string>();
  const stables = new Set(["usdc", "usdt", "dai", "usdbc", "weth"]);

  // 1. Fetch mode-specific watchlist tokens
  try {
    const batchUrl = `https://api.dexscreener.com/latest/dex/tokens/${config.watchlist.join(",")}`;
    const res = await fetch(batchUrl, {
      headers: { "User-Agent": "MishMesh/2.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      for (const p of (data.pairs || [])) {
        if (p.chainId !== "base") continue;
        const sym = p.baseToken?.symbol;
        const addr = p.baseToken?.address?.toLowerCase();
        if (!sym || !addr || stables.has(sym.toLowerCase()) || seen.has(addr)) continue;
        if ((p.volume?.h24 || 0) < config.minVol || (p.liquidity?.usd || 0) < config.minLiq) continue;
        seen.add(addr);
        tokens.push({
          address: p.baseToken.address, symbol: sym, name: p.baseToken.name || sym,
          price: parseFloat(p.priceUsd || "0"), volume24h: p.volume?.h24 || 0,
          priceChange24h: p.priceChange?.h24 || 0, priceChange1h: p.priceChange?.h1 || 0,
          liquidity: p.liquidity?.usd || 0, pairAddress: p.pairAddress,
        });
      }
    }
  } catch (e) { console.error("[V2] Watchlist fetch error:", e); }

  // 2. Supplement with mode-specific search for new/trending tokens
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(config.searchQuery)}`, {
      headers: { "User-Agent": "MishMesh/2.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      for (const p of (data.pairs || [])) {
        if (p.chainId !== "base") continue;
        const addr = p.baseToken?.address?.toLowerCase();
        if (!addr || seen.has(addr) || stables.has(p.baseToken?.symbol?.toLowerCase())) continue;
        if ((p.volume?.h24 || 0) < config.minVol || (p.liquidity?.usd || 0) < config.minLiq) continue;
        seen.add(addr);
        tokens.push({
          address: p.baseToken.address, symbol: p.baseToken.symbol, name: p.baseToken.name || p.baseToken.symbol,
          price: parseFloat(p.priceUsd || "0"), volume24h: p.volume?.h24 || 0,
          priceChange24h: p.priceChange?.h24 || 0, priceChange1h: p.priceChange?.h1 || 0,
          liquidity: p.liquidity?.usd || 0, pairAddress: p.pairAddress,
        });
      }
    }
  } catch {}

  // Sort by mode preference
  if (config.sortBy === "change1h") {
    return tokens.sort((a, b) => Math.abs(b.priceChange1h) - Math.abs(a.priceChange1h)).slice(0, 20);
  }
  return tokens.sort((a, b) => b.volume24h - a.volume24h).slice(0, 20);
}

// ═══ GOPLUS SAFETY ═══
async function isTokenSafe(address: string): Promise<{ safe: boolean; reason: string }> {
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses=${address}`, { signal: AbortSignal.timeout(5000) });
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
  regime?: { regime: string; confidence: number; recommendation: string; eth1h: number; eth24h: number },
  kellySizePct?: number,
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

  // Cached ETH price — avoid slow CoinGecko call every cycle
  let ethPrice = _cachedEthPrice;
  if (Date.now() - _ethPriceCacheTime > 300_000) { // refresh every 5min
    try { const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", { signal: AbortSignal.timeout(3000) }); if (r.ok) { const d = await r.json(); ethPrice = d?.ethereum?.usd || ethPrice; _cachedEthPrice = ethPrice; _ethPriceCacheTime = Date.now(); } } catch {}
  }

  const tokenData = tokens.slice(0, 10).map(t =>
    `${t.symbol} (${t.address}) $${t.price.toFixed(6)} | 1h:${t.priceChange1h>0?"+":""}${t.priceChange1h.toFixed(1)}% | 24h:${t.priceChange24h>0?"+":""}${t.priceChange24h.toFixed(1)}% | Vol:$${(t.volume24h/1000).toFixed(0)}k | Liq:$${(t.liquidity/1000).toFixed(0)}k`
  ).join("\n");

  // Enrich position data with current prices
  let totalOpenPnl = 0;
  const heldSymbols: string[] = [];
  const posData = positions.length > 0
    ? positions.map(p => {
        const currentToken = tokens.find(t => t.address.toLowerCase() === p.token_address?.toLowerCase());
        const currentPrice = currentToken?.price || 0;
        const pnlPct = p.price_at_trade > 0 && currentPrice > 0
          ? ((currentPrice - p.price_at_trade) / p.price_at_trade) * 100 : 0;
        const pnlEth = p.amount_eth * (pnlPct / 100);
        totalOpenPnl += pnlEth;
        heldSymbols.push(p.token_symbol);
        const age = p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000) : 0;
        const ageStr = age < 60 ? `${age}min` : `${Math.floor(age/60)}h${age%60}m`;
        return `HOLDING: ${p.token_symbol} | Entry:$${p.price_at_trade?.toFixed(6)||"?"} | Now:$${currentPrice?.toFixed(6)||"?"} | P&L:${pnlPct>=0?"+":""}${pnlPct.toFixed(1)}% (${pnlEth>=0?"+":""}${pnlEth.toFixed(4)} ETH) | Size:${p.amount_eth?.toFixed(4)} ETH | Age:${ageStr}`;
      }).join("\n")
    : "No open positions — BUY something!";

  // Calculate win rate + learning from recent closed trades
  const { data: recentTrades } = await supabaseAdmin.from("trading_history")
    .select("token_symbol, action, amount_eth, pnl_eth, reasoning, closed_at, created_at")
    .eq("user_id", userId).not("closed_at", "is", null)
    .order("closed_at", { ascending: false }).limit(20);
  const wins = (recentTrades || []).filter(t => (t.pnl_eth || 0) > 0).length;
  const losses = (recentTrades || []).filter(t => (t.pnl_eth || 0) < 0).length;
  const total = (recentTrades || []).length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : "N/A";
  const totalPnl = (recentTrades || []).reduce((sum, t) => sum + (t.pnl_eth || 0), 0);

  // Build learning context from past trades
  const tradeHistory = (recentTrades || []).slice(0, 10).map(t => {
    const pnl = t.pnl_eth || 0;
    const result = pnl > 0 ? `✅ +${pnl.toFixed(4)} ETH` : pnl < 0 ? `❌ ${pnl.toFixed(4)} ETH` : "⚪ breakeven";
    return `${t.token_symbol}: ${t.amount_eth?.toFixed(4)} ETH → ${result} | ${t.reasoning?.slice(0, 50) || "no reason"}`;
  }).join("\n");

  // Get daily P&L from portfolio snapshot
  const { data: snapshot } = await supabaseAdmin.from("portfolio_snapshots")
    .select("value_eth").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1).single();
  const dailyPnl = snapshot ? walletBalance - snapshot.value_eth : 0;

  const portfolioValue = walletBalance * ethPrice;

  // V3: Get report cards for learning loop
  const reportCardsText = await getReportCardsForPrompt(userId, 10);

  const regimeText = regime
    ? `\n═══ MARKET REGIME ═══\n${regime.regime === 'bull_trending' ? '🐂' : regime.regime === 'bear_trending' ? '🐻' : regime.regime === 'sideways_chop' ? '📊' : '⚡'} ${regime.regime.replace('_', ' ').toUpperCase()} (confidence: ${regime.confidence}%)\nETH 1h: ${regime.eth1h.toFixed(1)}% | 24h: ${regime.eth24h.toFixed(1)}%\nRecommendation: ${regime.recommendation}\n`
    : "";

  const kellyText = kellySizePct ? `\nSuggested position size (Kelly): ${kellySizePct}%` : "";

  const gasReserveWarning = walletBalance < 0.005
    ? `\n⚠️ LOW BALANCE: Only ${walletBalance.toFixed(4)} ETH. Gas reserve is ${GAS_RESERVE_ETH} ETH. SELL a position to recover ETH!`
    : "";

  const system = `You are an autonomous AI trading agent on Base L2.

STRATEGY: ${modePrompts[tradingMode] || modePrompts.meme_scout}
RISK: ${riskLevel.toUpperCase()}
${personality ? `PERSONALITY: ${personality}` : ""}
${regimeText}
═══ RISK LIMITS ═══
- Max position: ${STRATEGY_RISKS[tradingMode]?.max_position_pct || 15}%${kellyText}
- Stop loss: ${STRATEGY_RISKS[tradingMode]?.stop_loss_pct || -25}% | Take profit: +${STRATEGY_RISKS[tradingMode]?.take_profit_pct || 80}%
- Max concurrent: ${STRATEGY_RISKS[tradingMode]?.max_concurrent_positions || 5} | Min liquidity: $${((STRATEGY_RISKS[tradingMode]?.min_liquidity_usd || 50000) / 1000).toFixed(0)}k
- Fee: 3% per trade | Gas reserve: ${GAS_RESERVE_ETH} ETH
${gasReserveWarning}

═══ RULES ═══
1. NEVER buy a token you already hold
2. Your min expected gain must exceed 3% to cover fees (buy + sell)
3. Don't chase — if 1h change is >150%, it's probably too late
4. If today's P&L is below -15%, HOLD (protect capital)
5. If last 3 trades were losses, reduce confidence by 20 points
6. SELL positions hitting TP/SL BEFORE buying new ones
7. Sitting out IS a valid trade — only enter high-conviction setups

Respond ONLY with JSON: {"action":"buy|sell|hold","token":"SYMBOL","tokenAddress":"0x...","confidence":0-100,"amountPct":2-25,"reasoning":"2-3 sentences referencing specific data"}`;

  const userMsg = `═══ PORTFOLIO ═══
Balance: ${walletBalance.toFixed(4)} ETH ($${portfolioValue.toFixed(0)})
Available: ${Math.max(0, walletBalance - GAS_RESERVE_ETH).toFixed(4)} ETH (after gas reserve)
Open positions: ${positions.length} | Open P&L: ${totalOpenPnl>=0?"+":""}${totalOpenPnl.toFixed(4)} ETH
Today's P&L: ${dailyPnl>=0?"+":""}${dailyPnl.toFixed(4)} ETH

═══ PERFORMANCE ═══
Win rate: ${winRate}% (${wins}W/${losses}L) | Total P&L: ${totalPnl>=0?"+":""}${totalPnl.toFixed(4)} ETH

═══ YOUR TRADE HISTORY & GRADES ═══
${reportCardsText}

═══ POSITIONS ═══
${posData}
${heldSymbols.length > 0 ? `⛔ DO NOT BUY: ${heldSymbols.join(", ")} (already holding)\n` : ""}
═══ TOKEN CANDIDATES ═══
${tokenData}

Analyze your grades above. Learn from your A-trades and avoid repeating D/F patterns. Your move?`;


  try {
    const response = await callUserLLM(aiConfig, system, userMsg, 200);
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { action: "hold", confidence: 0, amountPct: 0, reasoning: "Invalid AI response" };
    const d = JSON.parse(jsonMatch[0]);
    d.action = ["buy", "sell", "hold"].includes(d.action) ? d.action : "hold";
    d.confidence = Math.min(100, Math.max(0, parseInt(d.confidence) || 0));
    d.amountPct = Math.min(25, Math.max(5, parseInt(d.amountPct) || 10));
    // Always resolve address from our token list (AI often returns placeholder addresses)
    if (d.action === "buy") {
      const match = tokens.find(t => t.symbol.toLowerCase() === d.token?.toLowerCase());
      if (match) { d.tokenAddress = match.address; }
      else if (!d.tokenAddress || d.tokenAddress.length < 42 || !d.tokenAddress.startsWith("0x")) { d.action = "hold"; }
    }
    return d;
  } catch (err: any) {
    return { action: "hold", confidence: 0, amountPct: 0, reasoning: `AI error: ${err.message?.slice(0, 80)}` };
  }
}

// ═══ EMERGENCY GAS RECOVERY ═══
// If wallet is below gas reserve and has open positions, force-sell the smallest one
async function emergencyGasRecovery(userId: string, walletAddress: string, encryptedKey: string): Promise<boolean> {
  const balance = await getWalletBalance(walletAddress);
  if (balance >= GAS_RESERVE_ETH) return false; // we're fine

  console.log(`[EMERGENCY] ${userId.slice(0,8)}: Balance ${balance.toFixed(6)} ETH < gas reserve ${GAS_RESERVE_ETH}. Force-selling smallest position.`);

  const { data: positions } = await supabaseAdmin.from("trading_history")
    .select("*").eq("user_id", userId).eq("action", "buy").is("closed_at", null)
    .order("amount_eth", { ascending: true }).limit(1);

  if (!positions?.length) return false;
  const pos = positions[0];

  try {
    const provider = getProvider();
    const token = new ethers.Contract(pos.token_address, ERC20_ABI, provider);
    const { decrypt } = await import("./wallet");
    const wallet = new ethers.Wallet(decrypt(encryptedKey), provider);
    const tokenBalance = await token.balanceOf(wallet.address);
    if (tokenBalance === 0n) return false;

    const quote = await findBestRoute(pos.token_address, WETH_BASE, tokenBalance, 10); // wider slippage for emergency
    if (!quote) return false;

    const result = await executeSwapV2(encryptedKey, pos.token_address, WETH_BASE, tokenBalance, quote.feeTier, quote.amountOutMin, false);
    if (result.success) {
      const ethReceived = parseFloat(ethers.formatEther(quote.amountOut));
      await supabaseAdmin.from("trading_history").update({
        closed_at: new Date().toISOString(), pnl_eth: ethReceived - pos.amount_eth,
        reasoning: `🚨 EMERGENCY GAS RECOVERY — balance was ${balance.toFixed(6)} ETH, needed ${GAS_RESERVE_ETH} to operate`,
      }).eq("id", pos.id);
      await supabaseAdmin.from("trade_logs").insert({
        user_id: userId, action: "sell",
        token_symbol: pos.token_symbol, token_address: pos.token_address,
        amount: ethReceived, price: 0,
        pnl: ethReceived - pos.amount_eth,
        reasoning: `Emergency gas recovery`,
        gas_cost: 0.001,
        closed_at: new Date().toISOString(),
      });
      await supabaseAdmin.from("notifications").insert({
        user_id: userId, type: "emergency_sell",
        message: `🚨 Emergency sell: ${pos.token_symbol} — Balance too low for gas (${balance.toFixed(4)} ETH). Recovered ${ethReceived.toFixed(4)} ETH.`,
      });
      console.log(`[EMERGENCY] ${userId.slice(0,8)}: Sold ${pos.token_symbol} for ${ethReceived.toFixed(4)} ETH`);
      return true;
    }
  } catch (err: any) {
    console.error(`[EMERGENCY] Sell failed for ${userId.slice(0,8)}:`, err.message);
  }
  return false;
}

// ═══ STOP LOSS / TAKE PROFIT ENGINE ═══
export async function runSLTPEngine() {
  const { data: openPositions } = await supabaseAdmin.from("trading_history")
    .select("*, users!inner(wallet_address, wallet_encrypted_key)")
    .eq("action", "buy").is("closed_at", null);

  if (!openPositions?.length) return;

  // First: check for any users with dangerously low gas
  const checkedUsers = new Set<string>();
  for (const pos of openPositions) {
    if (!checkedUsers.has(pos.user_id) && pos.users?.wallet_address && pos.users?.wallet_encrypted_key) {
      checkedUsers.add(pos.user_id);
      await emergencyGasRecovery(pos.user_id, pos.users.wallet_address, pos.users.wallet_encrypted_key);
    }
  }

  // V3: Use position manager for all sell decisions
  // Determine strategy per user (fallback to meme_scout)
  const userStrategies: Record<string, string> = {};
  const { data: agentConfigs } = await supabaseAdmin.from("agent_balances")
    .select("user_id, trading_mode").eq("trading_enabled", true);
  for (const ac of agentConfigs || []) userStrategies[ac.user_id] = ac.trading_mode || "meme_scout";

  for (const pos of openPositions) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.token_address}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const pair = data.pairs?.find((p: any) => p.chainId === "base");
      if (!pair) continue;

      const currentPrice = parseFloat(pair.priceUsd || "0");
      if (!currentPrice || !pos.price_at_trade) continue;

      // Update peak price
      if (currentPrice > (pos.peak_price || 0)) {
        await supabaseAdmin.from("trading_history").update({ peak_price: currentPrice }).eq("id", pos.id);
      }

      // V3: Position manager decides sell logic (graduated TP, momentum-based aging)
      const posStrategy = userStrategies[pos.user_id] || "meme_scout";
      const vol5m = pair.volume?.m5 || 0;
      const vol1h = pair.volume?.h1 || 0;
      const volumeDecreasing = vol1h > 0 && (vol5m * 12) < vol1h * 0.5;

      const sellDecision = shouldAutoSell(
        { ...pos, tiers_hit: pos.tiers_hit || [], remaining_size_pct: pos.remaining_size_pct || 100 },
        currentPrice, posStrategy, volumeDecreasing
      );

      if (sellDecision.sell && pos.users?.wallet_encrypted_key) {
        const provider = getProvider();
        const token = new ethers.Contract(pos.token_address, ERC20_ABI, provider);
        const { decrypt } = await import("./wallet");
        const wallet = new ethers.Wallet(decrypt(pos.users.wallet_encrypted_key), provider);
        const fullBalance = await token.balanceOf(wallet.address);
        if (fullBalance === 0n) continue;

        const sellPct = sellDecision.sellPct || 100;
        const sellAmount = sellPct >= 100 ? fullBalance : (fullBalance * BigInt(sellPct)) / 100n;
        if (sellAmount === 0n) continue;

        const sellQuote = await findBestRoute(pos.token_address, WETH_BASE, sellAmount, 8);
        if (!sellQuote) continue;

        const result = await executeSwapV2(
          pos.users.wallet_encrypted_key, pos.token_address, WETH_BASE,
          sellAmount, sellQuote.feeTier, sellQuote.amountOutMin, false,
        );

        if (result.success) {
          const ethReceived = parseFloat(ethers.formatEther(sellQuote.amountOut));
          await collectTradeFee(pos.users.wallet_encrypted_key, ethReceived, "sell", pos.token_symbol);

          if (sellPct >= 100) {
            await supabaseAdmin.from("trading_history").update({
              closed_at: new Date().toISOString(), pnl_eth: ethReceived - pos.amount_eth,
              reasoning: `🤖 V3 SLTP: ${sellDecision.reason}`,
            }).eq("id", pos.id);
            // Generate report card on close
            try { await generateReportCard(pos.user_id, { ...pos, closed_at: new Date().toISOString(), pnl_eth: ethReceived - pos.amount_eth }, posStrategy); } catch {}
          } else {
            // Partial sell — update tiers
            const newTiersHit = [...(pos.tiers_hit || [])];
            const tiers = TAKE_PROFIT_TIERS[posStrategy] || [];
            const pnlPct = ((currentPrice - pos.price_at_trade) / pos.price_at_trade) * 100;
            for (let i = 0; i < tiers.length; i++) {
              if (!newTiersHit.includes(i) && pnlPct >= tiers[i].trigger_pct) { newTiersHit.push(i); break; }
            }
            const newRemaining = Math.max(0, (pos.remaining_size_pct || 100) - sellPct);
            await supabaseAdmin.from("trading_history").update({
              tiers_hit: newTiersHit, remaining_size_pct: newRemaining,
              trailing_stop_pct: sellDecision.newTrailingStop || pos.trailing_stop_pct,
              amount_eth: pos.amount_eth * (newRemaining / 100),
            }).eq("id", pos.id);
          }

          await supabaseAdmin.from("notifications").insert({
            user_id: pos.user_id, type: "auto_exit",
            message: `🔴 ${sellPct < 100 ? `Partial (${sellPct}%)` : ''} ${pos.token_symbol}: ${sellDecision.reason}. Got ${ethReceived.toFixed(4)} ETH`,
          });

          // Sell record for feed
          await supabaseAdmin.from("trading_history").insert({
            user_id: pos.user_id, token_address: pos.token_address,
            token_symbol: pos.token_symbol, action: "sell", amount_eth: ethReceived,
            pnl_eth: sellPct >= 100 ? ethReceived - pos.amount_eth : undefined,
            reasoning: `🤖 V3 SLTP: ${sellDecision.reason}`,
          });
          await supabaseAdmin.from("trade_logs").insert({
            user_id: pos.user_id, action: "sell",
            token_symbol: pos.token_symbol, token_address: pos.token_address,
            amount: ethReceived, price: 0,
            pnl: sellPct >= 100 ? ethReceived - pos.amount_eth : undefined,
            reasoning: `V3 SLTP: ${sellDecision.reason}`,
            gas_cost: 0.001,
          });
        }
      }
    } catch (err) {
      console.error(`[V3] SLTP error for position ${pos.id}:`, err);
    }
  }

  // V3: Update post-exit prices for recently closed positions (for grading)
  try { await updatePostExitPrices(); } catch {}
}

// ═══ SINGLE USER INSTANT TRADING ═══
// Called when user flips trading ON or requests immediate scan.
// Lower confidence threshold for first trade to ensure action.
export async function runSingleUserTrading(userId: string): Promise<{ action: string; token?: string; reasoning: string }> {
  const { data: agent } = await supabaseAdmin.from("agent_balances")
    .select("user_id, trading_enabled, risk_level, trading_mode, total_trading_pnl, total_fees, stop_loss_pct, take_profit_pct, trailing_stop_pct, max_daily_loss_pct, max_position_pct, max_slippage_pct, max_price_impact_pct, cooldown_minutes, max_concurrent_positions, trade_size_pct, auto_rebalance")
    .eq("user_id", userId).eq("trading_enabled", true).single();

  if (!agent) return { action: "skip", reasoning: "Trading not enabled" };

  const { data: user } = await supabaseAdmin.from("users")
    .select("wallet_address, wallet_encrypted_key, ai_api_key_encrypted")
    .eq("id", userId).single();

  if (!user?.wallet_address || !user?.wallet_encrypted_key || !user?.ai_api_key_encrypted)
    return { action: "skip", reasoning: "Missing wallet or AI key" };

  const walletBalance = await getWalletBalance(user.wallet_address);
  if (walletBalance < 0.002) return { action: "skip", reasoning: "Balance too low (< 0.002 ETH)" };

  const strategy = agent.trading_mode || "meme_scout";
  const dbOverrides: Partial<RiskConfig> = {};
  if (agent.stop_loss_pct != null) dbOverrides.stop_loss_pct = agent.stop_loss_pct;
  if (agent.take_profit_pct != null) dbOverrides.take_profit_pct = agent.take_profit_pct;
  if (agent.trailing_stop_pct != null) dbOverrides.trailing_stop_pct = agent.trailing_stop_pct;
  if (agent.max_daily_loss_pct != null) dbOverrides.max_daily_loss_pct = agent.max_daily_loss_pct;
  if (agent.max_position_pct != null) dbOverrides.max_position_pct = agent.max_position_pct;
  if (agent.max_slippage_pct != null) dbOverrides.max_slippage_pct = agent.max_slippage_pct;
  if (agent.max_price_impact_pct != null) dbOverrides.max_price_impact_pct = agent.max_price_impact_pct;
  if (agent.cooldown_minutes != null) dbOverrides.cooldown_minutes = agent.cooldown_minutes;
  if (agent.max_concurrent_positions != null) dbOverrides.max_concurrent_positions = agent.max_concurrent_positions;
  const userTradeSizePct = agent.trade_size_pct || null;
  const risk = new RiskManager(userId, strategy, dbOverrides);

  const breaker = await risk.checkCircuitBreaker();
  if (breaker.tripped) return { action: "skip", reasoning: "Circuit breaker tripped" };

  // ═══ V3: MARKET REGIME + PRE-AI POSITION MANAGEMENT ═══
  const regime = await detectMarketRegime();
  console.log(`[V3] ${userId.slice(0,8)} | Regime: ${regime.regime} (${regime.confidence}%) | ETH 1h:${regime.eth1h.toFixed(1)}% 24h:${regime.eth24h.toFixed(1)}%`);

  {
    const { data: openPos } = await supabaseAdmin.from("trading_history")
      .select("*").eq("user_id", userId).eq("action", "buy").is("closed_at", null).limit(10);

    if (openPos?.length) {
      for (const pos of openPos) {
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.token_address}`, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) continue;
          const data = await res.json();
          const pair = data.pairs?.find((p: any) => p.chainId === "base");
          if (!pair) continue;

          const currentPrice = parseFloat(pair.priceUsd || "0");
          if (!currentPrice || !pos.price_at_trade) continue;

          // Update peak price
          if (currentPrice > (pos.peak_price || 0)) {
            await supabaseAdmin.from("trading_history").update({ peak_price: currentPrice }).eq("id", pos.id);
          }

          // V3: Use position manager (graduated TP tiers, momentum-based aging)
          const vol5m = pair.volume?.m5 || 0;
          const vol1h = pair.volume?.h1 || 0;
          const volumeDecreasing = vol1h > 0 && (vol5m * 12) < vol1h * 0.5; // 5min rate < 50% of hourly rate

          const sellDecision = shouldAutoSell(
            { ...pos, tiers_hit: pos.tiers_hit || [], remaining_size_pct: pos.remaining_size_pct || 100 },
            currentPrice, strategy, volumeDecreasing
          );

          if (sellDecision.sell && user.wallet_encrypted_key) {
            console.log(`[V3-SELL] ${userId.slice(0,8)}: ${pos.token_symbol} — ${sellDecision.reason} (sell ${sellDecision.sellPct || 100}%)`);
            const provider = getProvider();
            const token = new ethers.Contract(pos.token_address, ERC20_ABI, provider);
            const { decrypt } = await import("./wallet");
            const wallet = new ethers.Wallet(decrypt(user.wallet_encrypted_key), provider);
            const fullBalance = await token.balanceOf(wallet.address);
            if (fullBalance === 0n) continue;

            // Partial sell for graduated TP tiers
            const sellPct = sellDecision.sellPct || 100;
            const sellAmount = sellPct >= 100 ? fullBalance : (fullBalance * BigInt(sellPct)) / 100n;
            if (sellAmount === 0n) continue;

            const sellQuote = await findBestRoute(pos.token_address, WETH_BASE, sellAmount, 8);
            if (!sellQuote) continue;

            const result = await executeSwapV2(user.wallet_encrypted_key, pos.token_address, WETH_BASE, sellAmount, sellQuote.feeTier, sellQuote.amountOutMin, false);
            if (result.success) {
              const ethReceived = parseFloat(ethers.formatEther(sellQuote.amountOut));
              await collectTradeFee(user.wallet_encrypted_key, ethReceived, "sell", pos.token_symbol);

              if (sellPct >= 100) {
                // Full close
                const closedPos = { ...pos, closed_at: new Date().toISOString(), pnl_eth: ethReceived - pos.amount_eth, reasoning: `🤖 V3: ${sellDecision.reason}` };
                await supabaseAdmin.from("trading_history").update({
                  closed_at: closedPos.closed_at, pnl_eth: closedPos.pnl_eth, reasoning: closedPos.reasoning,
                }).eq("id", pos.id);
                // Generate report card
                try { await generateReportCard(userId, { ...pos, ...closedPos }, strategy); } catch {}
              } else {
                // Partial close — update remaining size + tiers hit + tighten trailing
                const newTiersHit = [...(pos.tiers_hit || [])];
                const tiers = TAKE_PROFIT_TIERS[strategy] || [];
                for (let i = 0; i < tiers.length; i++) {
                  if (!newTiersHit.includes(i)) {
                    const pnlPct = ((currentPrice - pos.price_at_trade) / pos.price_at_trade) * 100;
                    if (pnlPct >= tiers[i].trigger_pct) { newTiersHit.push(i); break; }
                  }
                }
                const newRemaining = Math.max(0, (pos.remaining_size_pct || 100) - sellPct);
                await supabaseAdmin.from("trading_history").update({
                  tiers_hit: newTiersHit,
                  remaining_size_pct: newRemaining,
                  trailing_stop_pct: sellDecision.newTrailingStop || pos.trailing_stop_pct,
                  amount_eth: pos.amount_eth * (newRemaining / 100),
                }).eq("id", pos.id);
              }

              await supabaseAdmin.from("notifications").insert({
                user_id: userId, type: "auto_exit",
                message: `🔴 ${sellPct < 100 ? `Partial sell (${sellPct}%)` : 'Sell'} ${pos.token_symbol}: ${sellDecision.reason}. Got ${ethReceived.toFixed(4)} ETH`,
              });
              await supabaseAdmin.from("trading_history").insert({
                user_id: userId, token_address: pos.token_address,
                token_symbol: pos.token_symbol, action: "sell", amount_eth: ethReceived,
                pnl_eth: sellPct >= 100 ? ethReceived - pos.amount_eth : undefined,
                tx_hash: result.txHash, reasoning: `🤖 V3: ${sellDecision.reason}`,
              });
              await supabaseAdmin.from("trade_logs").insert({
                user_id: userId, action: "sell",
                token_symbol: pos.token_symbol, token_address: pos.token_address,
                amount: ethReceived, price: 0,
                pnl: sellPct >= 100 ? ethReceived - pos.amount_eth : undefined,
                tx_hash: result.txHash, reasoning: `V3: ${sellDecision.reason}`,
                gas_cost: 0.001,
              });
              if (sellPct >= 100) {
                return { action: "sell", token: pos.token_symbol, reasoning: `V3 auto-sold: ${sellDecision.reason}. Got ${ethReceived.toFixed(4)} ETH` };
              }
            }
          }
        } catch (err) { console.error(`[V3-SELL] Error:`, err); }
      }
    }
  }

  // Fetch trending tokens for this user's trading mode
  const trending = await fetchTrendingTokens(strategy);
  if (!trending.length) return { action: "skip", reasoning: "No trending tokens found" };

  const { data: positions } = await supabaseAdmin.from("trading_history")
    .select("*").eq("user_id", userId).eq("action", "buy").is("closed_at", null).limit(10);

  const { data: profile } = await supabaseAdmin.from("agent_profiles")
    .select("soul").eq("user_id", userId).single();

  // V3: Kelly sizing
  const kelly = await calculateKellySize(userId, 70, risk.getConfig().max_position_pct, regime.regime as MarketRegime);
  console.log(`[V3] ${userId.slice(0,8)} | Kelly: ${kelly.positionPct}% (WR:${kelly.winRate.toFixed(0)}% avgW:+${kelly.avgWin.toFixed(1)}% avgL:-${kelly.avgLoss.toFixed(1)}%)`);

  const decision = await getAIDecision(
    userId, trending, positions || [], walletBalance,
    agent.risk_level, strategy, profile?.soul || null,
    regime, kelly.positionPct,
  );

  console.log(`[V3] ${userId.slice(0,8)} | AI: ${decision.action} ${decision.token || ''} | confidence: ${decision.confidence}% | ${decision.reasoning?.slice(0,100)}`);

  // V3: Regime-adjusted confidence threshold
  const regimeAdjusted = adjustForRegime(risk.getConfig(), regime.regime as MarketRegime);
  const minConfidence = regimeAdjusted.min_confidence || 40;

  if (decision.action === "hold" || decision.confidence < minConfidence) {
    console.log(`[V3] ${userId.slice(0,8)} | HOLD — confidence ${decision.confidence}% < min ${minConfidence}%`);
    return { action: "hold", reasoning: decision.reasoning || "AI chose to hold" };
  }

  const riskConfig = risk.getConfig();

  if (decision.action === "buy" && decision.tokenAddress) {
    // V3: Anti-churn check
    const churnCheck = await passesAntiChurn(userId, decision.tokenAddress, strategy);
    if (!churnCheck.pass) {
      console.log(`[V3] ${userId.slice(0,8)} | ANTI-CHURN BLOCKED: ${churnCheck.reason}`);
      return { action: "skip", token: decision.token, reasoning: churnCheck.reason };
    }

    console.log(`[V3] ${userId.slice(0,8)} | BUY flow: ${decision.token} (${decision.tokenAddress}) | confidence: ${decision.confidence}%`);
    const safety = await isTokenSafe(decision.tokenAddress);
    console.log(`[TRADE-V2] ${userId} | Safety: ${safety.safe ? 'PASS' : 'FAIL'} — ${safety.reason}`);
    if (!safety.safe) {
      await supabaseAdmin.from("trading_history").insert({
        user_id: userId, token_address: decision.tokenAddress,
        token_symbol: decision.token || "?", action: "skip", amount_eth: 0,
        reasoning: `Safety: ${safety.reason}`,
      });
      return { action: "skip", token: decision.token, reasoning: `Safety failed: ${safety.reason}` };
    }

    const tokenInfo = trending.find(t => t.address.toLowerCase() === decision.tokenAddress.toLowerCase());
    console.log(`[TRADE-V2] ${userId} | Token in list: ${tokenInfo ? `YES liq=$${(tokenInfo.liquidity/1000).toFixed(0)}k` : 'NOT FOUND'}`);
    if (tokenInfo && tokenInfo.liquidity < riskConfig.min_liquidity_usd) {
      console.log(`[TRADE-V2] ${userId} | BLOCKED: Low liquidity $${(tokenInfo.liquidity/1000).toFixed(0)}k < $${(riskConfig.min_liquidity_usd/1000).toFixed(0)}k`);
      return { action: "skip", token: decision.token, reasoning: `Low liquidity: $${(tokenInfo.liquidity/1000).toFixed(0)}k` };
    }

    // V3: Kelly-informed position sizing
    const maxPct = userTradeSizePct || riskConfig.max_position_pct || 15;
    const kellyPct = kelly.positionPct;
    const aiPct = decision.amountPct || 10;
    const effectivePct = Math.min(aiPct, kellyPct, maxPct); // most conservative wins
    const availableForTrading = Math.max(0, walletBalance - GAS_RESERVE_ETH);
    const tradeAmount = Math.min(availableForTrading, walletBalance * (effectivePct / 100));
    if (tradeAmount < 0.0005) {
      console.log(`[V3] ${userId.slice(0,8)} | BLOCKED: Trade ${tradeAmount.toFixed(6)} ETH too small`);
      return { action: "skip", token: decision.token, reasoning: `Balance too low after gas reserve` };
    }
    console.log(`[V3] ${userId.slice(0,8)} | Size: ${tradeAmount.toFixed(4)} ETH (${effectivePct}% — AI:${aiPct}% Kelly:${kellyPct}% Max:${maxPct}%)`);
    const riskCheck = await risk.canTrade(decision.tokenAddress, tradeAmount, walletBalance);
    console.log(`[V3] ${userId.slice(0,8)} | Risk: ${riskCheck.ok ? 'PASS' : 'FAIL'} — ${riskCheck.reason}`);
    if (!riskCheck.ok) return { action: "skip", token: decision.token, reasoning: riskCheck.reason };

    const amountIn = ethers.parseEther(tradeAmount.toFixed(18));
    console.log(`[TRADE-V2] ${userId} | Finding route: ${tradeAmount.toFixed(4)} ETH → ${decision.tokenAddress} (max slip ${riskConfig.max_slippage_pct}%)`);
    const quote = await findBestRoute(WETH_BASE, decision.tokenAddress, amountIn, riskConfig.max_slippage_pct);
    console.log(`[TRADE-V2] ${userId} | Route: ${quote ? `FOUND fee=${quote.feeTier}` : 'NO ROUTE'}`);
    if (!quote) return { action: "skip", token: decision.token, reasoning: "No liquidity route" };

    // Price impact check
    if (tokenInfo && tokenInfo.price > 0) {
      const theoreticalTokens = tradeAmount / tokenInfo.price;
      const theoreticalRaw = BigInt(Math.floor(theoreticalTokens * (10 ** 18)));
      if (theoreticalRaw > 0n) {
        const impactPct = Number((theoreticalRaw - quote.amountOut) * 10000n / theoreticalRaw) / 100;
        if (impactPct > riskConfig.max_price_impact_pct) {
          return { action: "skip", token: decision.token, reasoning: `Price impact ${impactPct.toFixed(1)}%` };
        }
      }
    }

    console.log(`[TRADE-V2] ${userId} | EXECUTING SWAP: ${tradeAmount.toFixed(4)} ETH → ${decision.token} via ${quote.feeTier} pool`);
    const result = await executeSwapV2(
      user.wallet_encrypted_key, WETH_BASE, decision.tokenAddress,
      amountIn, quote.feeTier, quote.amountOutMin, true,
    );
    console.log(`[TRADE-V2] ${userId} | Swap result: ${result.success ? 'SUCCESS' : 'FAILED'} tx=${result.txHash || 'none'}`);

    if (result.success) {
      const fee = tradeAmount * FEES.TRADE_PCT;
      await collectTradeFee(user.wallet_encrypted_key, tradeAmount, "buy", decision.token || "?");
      await supabaseAdmin.from("trading_history").insert({
        user_id: userId, token_address: decision.tokenAddress,
        token_symbol: decision.token || "?", action: "buy", amount_eth: tradeAmount,
        price_at_trade: tokenInfo?.price || 0, peak_price: tokenInfo?.price || 0,
        stop_loss_pct: riskConfig.stop_loss_pct, take_profit_pct: riskConfig.take_profit_pct,
        trailing_stop_pct: riskConfig.trailing_stop_pct,
        tx_hash: result.txHash, fee_eth: fee,
        reasoning: `[${decision.confidence}%] ${decision.reasoning} | Route: ${quote.feeTier/10000}% pool`,
      });
      await supabaseAdmin.from("trade_logs").insert({
        user_id: userId, action: "buy",
        token_symbol: decision.token || "?", token_address: decision.tokenAddress,
        amount: tradeAmount, price: tokenInfo?.price || 0,
        tx_hash: result.txHash, reasoning: decision.reasoning,
        confidence: decision.confidence, gas_cost: 0.001,
      });
      await supabaseAdmin.from("notifications").insert({
        user_id: userId, type: "agent_trade",
        message: `🟢 Buy ${decision.token}: ${tradeAmount.toFixed(4)} ETH | ${decision.confidence}% confidence | ${decision.reasoning}`,
      });
      try {
        const { writeFeedEvent } = await import("./reputation");
        await writeFeedEvent(userId, "trade", `BUY ${decision.token}`,
          `Your agent bought ${tradeAmount.toFixed(4)} ETH of ${decision.token}. ${decision.reasoning}`,
          { action: "buy", token: decision.token, amount: tradeAmount, confidence: decision.confidence, tx_hash: result.txHash });
      } catch {}
      return { action: "buy", token: decision.token, reasoning: `Bought ${tradeAmount.toFixed(4)} ETH of ${decision.token}` };
    }
    return { action: "error", token: decision.token, reasoning: "Swap execution failed" };
  }

  if (decision.action === "sell") {
    // Match by symbol OR address (AI sometimes uses either)
    const pos = (positions || []).find(p =>
      p.token_symbol?.toLowerCase() === decision.token?.toLowerCase() ||
      p.token_address?.toLowerCase() === decision.tokenAddress?.toLowerCase()
    );
    if (!pos) return { action: "skip", reasoning: `No position in ${decision.token}` };

    console.log(`[TRADE-V2] ${userId} | SELL flow: ${pos.token_symbol} (${pos.token_address})`);
    const provider = getProvider();
    const token = new ethers.Contract(pos.token_address, ERC20_ABI, provider);
    const { decrypt } = await import("./wallet");
    const wallet = new ethers.Wallet(decrypt(user.wallet_encrypted_key), provider);
    const balance = await token.balanceOf(wallet.address);
    console.log(`[TRADE-V2] ${userId} | Token balance: ${balance.toString()}`);
    if (balance === 0n) return { action: "skip", reasoning: "Zero token balance" };

    const quote = await findBestRoute(pos.token_address, WETH_BASE, balance, riskConfig.max_slippage_pct);
    console.log(`[TRADE-V2] ${userId} | Sell route: ${quote ? `FOUND fee=${quote.feeTier}` : 'NO ROUTE'}`);
    if (!quote) return { action: "skip", reasoning: "No sell route" };

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
      await supabaseAdmin.from("trade_logs").insert({
        user_id: userId, action: "sell",
        token_symbol: pos.token_symbol, token_address: pos.token_address,
        amount: ethReceived, price: 0,
        pnl: ethReceived - pos.amount_eth,
        tx_hash: result.txHash || "",
        reasoning: decision.reasoning || "",
        confidence: decision.confidence || 80,
        gas_cost: 0.001,
        closed_at: new Date().toISOString(),
      });
      await supabaseAdmin.from("notifications").insert({
        user_id: userId, type: "agent_trade",
        message: `🔴 Sell ${pos.token_symbol}: ${ethReceived.toFixed(4)} ETH | P&L: ${(ethReceived - pos.amount_eth).toFixed(4)} ETH`,
      });
      console.log(`[TRADE-V2] ${userId} | SELL SUCCESS: ${pos.token_symbol} → ${ethReceived.toFixed(4)} ETH | PnL: ${(ethReceived - pos.amount_eth).toFixed(4)} ETH`);
      try {
        const { writeFeedEvent } = await import("./reputation");
        const pnl = ethReceived - pos.amount_eth;
        await writeFeedEvent(userId, "trade", `SELL ${pos.token_symbol}`,
          `Your agent sold ${pos.token_symbol} for ${ethReceived.toFixed(4)} ETH. P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} ETH`,
          { action: "sell", token: pos.token_symbol, amount: ethReceived, pnl, tx_hash: result.txHash });
      } catch {}
      return { action: "sell", token: pos.token_symbol, reasoning: `Sold ${pos.token_symbol} for ${ethReceived.toFixed(4)} ETH` };
    }
    return { action: "error", token: pos.token_symbol, reasoning: "Sell execution failed" };
  }

  return { action: "hold", reasoning: decision.reasoning || "No action" };
}

// Debug logger — writes to debug_log table
async function dlog(msg: string) {
  console.log(msg);
  try { await supabaseAdmin.from("debug_log").insert({ msg }); } catch {}
}

// ═══ MAIN TRADING LOOP V2 ═══
export async function runAutonomousTradingV2(modeFilter?: string[]) {
  let query = supabaseAdmin.from("agent_balances")
    .select("user_id, trading_enabled, risk_level, trading_mode, total_trading_pnl, total_fees, stop_loss_pct, take_profit_pct, trailing_stop_pct, max_daily_loss_pct, max_position_pct, max_slippage_pct, max_price_impact_pct, cooldown_minutes, max_concurrent_positions, trade_size_pct, auto_rebalance")
    .eq("trading_enabled", true);

  if (modeFilter?.length) {
    query = query.in("trading_mode", modeFilter);
  }

  const { data: agents } = await query;

  if (!agents?.length) { dlog("[V2] No agents with trading enabled"); return; }
  console.log(`[V2] Processing ${agents.length} agents`);

  // Cache trending tokens per mode to avoid duplicate API calls
  const trendingCache: Record<string, TrendingToken[]> = {};

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
      if (agent.max_concurrent_positions != null) dbOverrides.max_concurrent_positions = agent.max_concurrent_positions;
      const userTradeSizePct = agent.trade_size_pct || null; // user's custom trade size
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

      // Fetch tokens for this user's mode (cached per mode)
      if (!trendingCache[strategy]) {
        trendingCache[strategy] = await fetchTrendingTokens(strategy);
      }
      const trending = trendingCache[strategy];
      if (!trending.length) { await dlog(`[V2] ${agent.user_id.slice(0,8)}: No tokens for mode ${strategy}`); continue; }

      // AI decision
      await dlog(`[V2] ${agent.user_id.slice(0,8)}: Calling AI (${strategy}, bal:${walletBalance.toFixed(4)} ETH, ${trending.length} tokens)`);
      const decision = await getAIDecision(
        agent.user_id, trending, positions || [], walletBalance,
        agent.risk_level, strategy, profile?.soul || null,
      );

      if (decision.action === "hold" || decision.confidence < 60) {
        await dlog(`[V2] ${agent.user_id.slice(0,8)}: AI said ${decision.action} (conf:${decision.confidence}) — ${decision.reasoning}`);
        continue;
      }
      await dlog(`[V2] ${agent.user_id.slice(0,8)}: AI wants to ${decision.action} ${decision.token} (conf:${decision.confidence}, addr:${decision.tokenAddress})`);


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
        await dlog(`[V2] ${agent.user_id.slice(0,8)}: Checking safety for ${decision.token} @ ${decision.tokenAddress}`);
        const safety = await isTokenSafe(decision.tokenAddress);
        if (!safety.safe) {
          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id, token_address: decision.tokenAddress,
            token_symbol: decision.token || "?", action: "skip", amount_eth: 0,
            reasoning: `Safety: ${safety.reason}. AI: ${decision.reasoning}`,
          });
          continue;
        }

        await dlog(`[V2] ${agent.user_id.slice(0,8)}: Safety passed for ${decision.token}`);
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

        // Risk check — respect gas reserve
        const maxPct = userTradeSizePct || riskConfig.max_position_pct || 15;
        const effectivePct = Math.min(decision.amountPct || maxPct, maxPct);
        const availableForTrading = Math.max(0, walletBalance - GAS_RESERVE_ETH);
        const tradeAmount = Math.min(availableForTrading, walletBalance * (effectivePct / 100));
        if (tradeAmount < 0.0005) { await dlog(`[V2] ${agent.user_id.slice(0,8)}: Balance too low after gas reserve`); continue; }
        await dlog(`[V2] ${agent.user_id.slice(0,8)}: Risk check — trade ${tradeAmount.toFixed(6)} ETH (${effectivePct}% of ${walletBalance.toFixed(4)}, reserve: ${GAS_RESERVE_ETH})`);
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
        await dlog(`[V2] ${agent.user_id.slice(0,8)}: Risk passed. Finding route for ${decision.token}...`);
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
        await dlog(`[V2] ${agent.user_id.slice(0,8)}: EXECUTING swap ${tradeAmount.toFixed(6)} ETH -> ${decision.token} via fee tier ${quote.feeTier}`);
        const result = await executeSwapV2(
          user.wallet_encrypted_key, WETH_BASE, decision.tokenAddress,
          amountIn, quote.feeTier, quote.amountOutMin, true,
        );

        await dlog(`[V2] ${agent.user_id.slice(0,8)}: Swap result: success=${result.success} tx=${result.txHash || 'none'}`);
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
          await supabaseAdmin.from("trade_logs").insert({
            user_id: agent.user_id, action: "buy",
            token_symbol: decision.token || "?", token_address: decision.tokenAddress,
            amount: tradeAmount, price: tokenInfo?.price || 0,
            tx_hash: result.txHash, reasoning: decision.reasoning,
            confidence: decision.confidence, gas_cost: 0.001,
          });

          await supabaseAdmin.from("notifications").insert({
            user_id: agent.user_id, type: "agent_trade",
            message: `🟢 Buy ${decision.token}: ${tradeAmount.toFixed(4)} ETH | ${decision.confidence}% confidence | SL:${riskConfig.stop_loss_pct}% TP:+${riskConfig.take_profit_pct}% | ${decision.reasoning}`,
          });

          // Feed event
          try {
            const { writeFeedEvent } = await import("./reputation");
            await writeFeedEvent(agent.user_id, "trade",
              `BUY ${decision.token}`,
              `Your agent bought ${tradeAmount.toFixed(4)} ETH of ${decision.token}. ${decision.reasoning}`,
              { action: "buy", token: decision.token, amount: tradeAmount, confidence: decision.confidence,
                reasoning: decision.reasoning, tx_hash: result.txHash },
            );
          } catch {}

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

          await supabaseAdmin.from("trade_logs").insert({
            user_id: agent.user_id, action: "sell",
            token_symbol: pos.token_symbol, token_address: pos.token_address,
            amount: ethReceived, price: 0,
            pnl: ethReceived - pos.amount_eth,
            tx_hash: result.txHash || "",
            reasoning: decision.reasoning || "",
            confidence: decision.confidence || 80,
            gas_cost: 0.001,
            closed_at: new Date().toISOString(),
          });

          await supabaseAdmin.from("notifications").insert({
            user_id: agent.user_id, type: "agent_trade",
            message: `🔴 Sell ${pos.token_symbol}: ${ethReceived.toFixed(4)} ETH | P&L: ${(ethReceived - pos.amount_eth).toFixed(4)} ETH | ${decision.reasoning}`,
          });
        }
      }
    } catch (err) {
      const errMsg = (err as any)?.message || String(err);
      await dlog(`[V2] CRASH for ${agent.user_id.slice(0,8)}: ${errMsg.slice(0,300)}`);
      console.error(`[V2] Trading error for ${agent.user_id}:`, err);
    }
  }
}
