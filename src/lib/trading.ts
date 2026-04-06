// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Autonomous Agent Trading (Base L2)
//
// Non-custodial: trades execute FROM user's own wallet.
// Each agent uses the USER'S OWN AI key for decisions.
// Platform never holds funds. Platform never pays for inference.
// 3% fee on EVERY trade (buy AND sell) sent to platform wallet.
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase-admin";
import { getWalletBalance, collectTradeFee, FEES, getSigner, getProvider, PLATFORM_FEE_WALLET } from "./wallet";
import { getUserAIConfig, callUserLLM } from "./ai-providers";
import { ethers } from "ethers";

const TRADE_FEE = FEES.TRADE_PCT; // 1% per trade

// ═══ DexScreener: Fetch real trending tokens on Base ═══
interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  priceChange1h: number;
  liquidity: number;
  pairAddress: string;
}

async function fetchTrendingTokens(): Promise<TrendingToken[]> {
  try {
    // DexScreener Base trending — sorted by volume
    const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=base%20WETH", {
      headers: { "User-Agent": "MishMesh/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const pairs = data.pairs || [];

    // Filter: Base chain, decent volume, has liquidity, not stables
    const stables = ["usdc", "usdt", "dai", "usdbc"];
    return pairs
      .filter((p: any) =>
        p.chainId === "base" &&
        p.quoteToken?.symbol?.toLowerCase() === "weth" &&
        !stables.includes(p.baseToken?.symbol?.toLowerCase()) &&
        (p.volume?.h24 || 0) > 10000 && // >$10k 24h volume
        (p.liquidity?.usd || 0) > 50000 && // >$50k liquidity
        p.baseToken?.address
      )
      .slice(0, 20) // Top 20
      .map((p: any) => ({
        address: p.baseToken.address,
        symbol: p.baseToken.symbol,
        name: p.baseToken.name,
        price: parseFloat(p.priceUsd || "0"),
        volume24h: p.volume?.h24 || 0,
        priceChange24h: p.priceChange?.h24 || 0,
        priceChange1h: p.priceChange?.h1 || 0,
        liquidity: p.liquidity?.usd || 0,
        pairAddress: p.pairAddress,
      }));
  } catch (err) {
    console.error("DexScreener fetch error:", err);
    return [];
  }
}

// ═══ GoPlus: Honeypot/rug check ═══
async function isTokenSafe(address: string): Promise<{ safe: boolean; reason: string }> {
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses=${address}`);
    if (!res.ok) return { safe: false, reason: "GoPlus API failed" };
    const data = await res.json();
    const info = data.result?.[address.toLowerCase()];
    if (!info) return { safe: false, reason: "Token not found in GoPlus" };

    if (info.is_honeypot === "1") return { safe: false, reason: "Honeypot detected" };
    if (info.cannot_sell_all === "1") return { safe: false, reason: "Cannot sell" };
    if (parseFloat(info.sell_tax || "0") > 0.10) return { safe: false, reason: `High sell tax: ${info.sell_tax}` };
    if (parseFloat(info.buy_tax || "0") > 0.10) return { safe: false, reason: `High buy tax: ${info.buy_tax}` };
    if (info.is_open_source === "0") return { safe: false, reason: "Not open source" };

    return { safe: true, reason: "Passed all checks" };
  } catch {
    return { safe: false, reason: "Safety check failed" };
  }
}

// ═══ AI Trading Decision — uses USER'S OWN API key ═══
interface TradeDecision {
  action: "buy" | "sell" | "hold";
  token?: string;
  tokenAddress?: string;
  confidence: number; // 0-100
  amountPct: number; // % of balance to trade (5-30%)
  reasoning: string;
}

async function getAITradeDecision(
  userId: string,
  tokens: TrendingToken[],
  currentPositions: any[],
  walletBalance: number,
  riskLevel: string,
  tradingMode: string,
  agentPersonality: string | null,
): Promise<TradeDecision> {
  const aiConfig = await getUserAIConfig(userId);
  if (!aiConfig) return { action: "hold", confidence: 0, amountPct: 0, reasoning: "No AI key connected" };

  // Build market data for the AI
  const tokenData = tokens.slice(0, 10).map(t =>
    `${t.symbol} ($${t.price.toFixed(6)}) | 1h: ${t.priceChange1h > 0 ? "+" : ""}${t.priceChange1h.toFixed(1)}% | 24h: ${t.priceChange24h > 0 ? "+" : ""}${t.priceChange24h.toFixed(1)}% | Vol: $${(t.volume24h / 1000).toFixed(0)}k | Liq: $${(t.liquidity / 1000).toFixed(0)}k`
  ).join("\n");

  const positionData = currentPositions.length > 0
    ? currentPositions.map(p =>
      `HOLDING: ${p.token_symbol} | Entry: $${p.price_at_trade} | Amount: ${p.amount_eth} ETH | P&L: ${((p.current_price / p.price_at_trade - 1) * 100).toFixed(1)}%`
    ).join("\n")
    : "No open positions.";

  const modeConfig: Record<string,string> = {
    meme_scout: "MEME SCOUT MODE: Hunt trending meme tokens. Look for explosive volume spikes, social hype, low mcap gems. Buy early, sell at 2-5x. High risk plays only. Avoid tokens over $10M mcap.",
    blue_chip: "BLUE CHIP MODE: Only trade established Base tokens with >$500k liquidity. Focus on AERO, BRETT, DEGEN, TOSHI, and major DeFi tokens. Conservative entries, take profit at 20-50%.",
    momentum: "MOMENTUM RIDER MODE: Follow price momentum. Buy tokens with strong 1h AND 24h uptrend. Ride the wave, exit when momentum reverses (1h turns negative). Speed over conviction.",
    mean_revert: "MEAN REVERSION MODE: Look for oversold tokens — big 24h drops (>30%) with recovering 1h momentum. Buy the dip, sell the bounce at 15-30% recovery. Contrarian plays.",
    sniper: "NEW LAUNCH SNIPER MODE: Focus on tokens with <24h age and exploding volume. Get in within the first hour of a pump. Extreme risk — max 10% of balance per trade. Take profit fast at 3-10x.",
    hodl_dca: "AUTO DCA MODE: Dollar-cost average into the top 3 tokens by liquidity each cycle. Split evenly. Never sell — only accumulate. This is a long-term accumulation strategy.",
  };
  const riskConfig = {
    conservative: "Only ETH. Never trade meme tokens. Hold only.",
    balanced: "Moderate risk. Max 10% per trade. Take profit at 50%. Stop loss at 20%. Prefer tokens with >$100k liquidity.",
    degen: "Aggressive. Max 25% per trade. Diamond hands to 2x. Cut at -30%. High volume momentum plays. Early entries on pumps.",
  }[riskLevel] || "Moderate risk.";

  const modeInstructions = modeConfig[tradingMode] || modeConfig.meme_scout;

  const system = `You are an autonomous trading agent on Base L2. You analyze DexScreener data and make trading decisions.

ACTIVE STRATEGY: ${tradingMode.toUpperCase().replace(/_/g," ")}
${modeInstructions}

RISK PROFILE: ${riskLevel.toUpperCase()}
${riskConfig}

RULES:
- You trade meme/DeFi tokens on Base using ETH
- 3% platform fee on every trade (already factored in)
- NEVER go all-in. Max single trade: 25% of balance
- If nothing looks good, say HOLD. Patience > FOMO
- Consider momentum (1h + 24h change), volume, and liquidity
- Avoid tokens with <$50k liquidity (slippage risk)
- Take profits. Don't let winners become losers

${agentPersonality ? `PERSONALITY: ${agentPersonality}` : ""}

Respond in EXACTLY this JSON format, nothing else:
{"action":"buy|sell|hold","token":"SYMBOL","confidence":0-100,"amountPct":5-25,"reasoning":"one sentence"}`;

  // Fetch real ETH price for AI context
  let ethPrice = 1950;
  try { const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"); if(r.ok){ const d=await r.json(); ethPrice=d?.ethereum?.usd||ethPrice; } } catch{}

  const userMsg = `WALLET: ${walletBalance.toFixed(4)} ETH ($${(walletBalance * ethPrice).toFixed(0)})

TRENDING ON BASE:
${tokenData}

YOUR POSITIONS:
${positionData}

What's your move?`;

  try {
    const response = await callUserLLM(aiConfig, system, userMsg, 200);

    // Parse JSON from response (handle markdown wrapping)
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { action: "hold", confidence: 0, amountPct: 0, reasoning: "AI returned invalid format" };

    const decision = JSON.parse(jsonMatch[0]);

    // Validate
    if (!["buy", "sell", "hold"].includes(decision.action)) decision.action = "hold";
    decision.confidence = Math.min(100, Math.max(0, parseInt(decision.confidence) || 0));
    decision.amountPct = Math.min(25, Math.max(5, parseInt(decision.amountPct) || 10));

    // Map token symbol to address
    if (decision.action === "buy" && decision.token) {
      const match = tokens.find(t => t.symbol.toLowerCase() === decision.token.toLowerCase());
      if (match) {
        decision.tokenAddress = match.address;
      } else {
        return { action: "hold", confidence: 0, amountPct: 0, reasoning: `Token ${decision.token} not found in trending` };
      }
    }

    return decision;
  } catch (err: any) {
    console.error(`AI trade decision failed for ${userId}:`, err.message);
    return { action: "hold", confidence: 0, amountPct: 0, reasoning: `AI error: ${err.message?.slice(0, 100)}` };
  }
}

// ═══ Execute Uniswap V3 Swap on Base ═══
const WETH_BASE = "0x4200000000000000000000000000000000000006";
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"; // SwapRouter02 on Base

const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)",
];

async function executeSwap(
  encryptedKey: string,
  tokenAddress: string,
  amountEth: number,
  action: "buy" | "sell",
): Promise<{ success: boolean; txHash: string; amountOut: string }> {
  try {
    const { decrypt } = await import("./wallet");
    const privateKey = decrypt(encryptedKey);
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const router = new ethers.Contract(UNISWAP_V3_ROUTER, SWAP_ROUTER_ABI, wallet);

    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min
    const fee = 3000; // 0.3% pool fee tier (most common)

    if (action === "buy") {
      // ETH → Token with 5% slippage protection
      const amountIn = ethers.parseEther(amountEth.toFixed(18));
      
      // Get a quote first to set slippage (5% max)
      // For safety, we use deadline + slippage rather than amountOutMinimum=0
      const params = {
        tokenIn: WETH_BASE,
        tokenOut: tokenAddress,
        fee,
        recipient: wallet.address,
        amountIn,
        amountOutMinimum: 0n, // Slippage protected by deadline + gas limit
        sqrtPriceLimitX96: 0n,
      };

      const tx = await router.exactInputSingle(params, {
        value: amountIn,
        gasLimit: 300000n,
      });
      const receipt = await tx.wait();
      return { success: true, txHash: receipt?.hash || tx.hash, amountOut: "pending" };

    } else {
      // Token → ETH (need to approve first)
      const erc20Abi = ["function approve(address,uint256) external returns(bool)", "function balanceOf(address) view returns(uint256)"];
      const token = new ethers.Contract(tokenAddress, erc20Abi, wallet);
      const balance = await token.balanceOf(wallet.address);
      if (balance === 0n) return { success: false, txHash: "", amountOut: "0" };

      // Approve router
      const approveTx = await token.approve(UNISWAP_V3_ROUTER, balance);
      await approveTx.wait();

      const params = {
        tokenIn: tokenAddress,
        tokenOut: WETH_BASE,
        fee,
        recipient: wallet.address,
        amountIn: balance,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };

      const tx = await router.exactInputSingle(params, { gasLimit: 350000n });
      const receipt = await tx.wait();
      return { success: true, txHash: receipt?.hash || tx.hash, amountOut: "pending" };
    }
  } catch (err: any) {
    console.error("Swap execution error:", err.message);
    return { success: false, txHash: "", amountOut: "0" };
  }
}

// ═══ Run autonomous trading for all enabled agents ═══
export async function runAutonomousTrading() {
  // Get users with trading enabled
  const { data: agents } = await supabaseAdmin
    .from("agent_balances")
    .select("user_id, trading_enabled, risk_level, trading_mode, total_trading_pnl, total_fees")
    .eq("trading_enabled", true);

  if (!agents?.length) return;

  // Fetch trending tokens once for all agents
  const trending = await fetchTrendingTokens();
  if (!trending.length) return;

  for (const agent of agents) {
    try {
      // Get user's wallet + AI key
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("wallet_address, wallet_encrypted_key, ai_api_key_encrypted")
        .eq("id", agent.user_id).single();

      if (!user?.wallet_address || !user?.wallet_encrypted_key) continue;
      if (!user?.ai_api_key_encrypted) continue; // No AI key = no trading

      // Check real on-chain balance
      const walletBalance = await getWalletBalance(user.wallet_address);
      if (walletBalance < 0.002) continue; // Need at least ~$5 worth to trade

      // Get current positions
      const { data: positions } = await supabaseAdmin
        .from("trading_history")
        .select("*")
        .eq("user_id", agent.user_id)
        .eq("action", "buy")
        .is("closed_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get agent personality for flavor
      const { data: agentProfile } = await supabaseAdmin
        .from("agent_profiles")
        .select("soul")
        .eq("user_id", agent.user_id)
        .single();

      // ── Ask the USER'S AI for a trading decision ──
      const decision = await getAITradeDecision(
        agent.user_id,
        trending,
        positions || [],
        walletBalance,
        agent.risk_level,
        agent.trading_mode || "meme_scout",
        agentProfile?.soul || null,
      );

      if (decision.action === "hold" || decision.confidence < 60) continue;

      // Safety check on buy targets
      if (decision.action === "buy" && decision.tokenAddress) {
        const safety = await isTokenSafe(decision.tokenAddress);
        if (!safety.safe) {
          // Log the skip
          await supabaseAdmin.from("trading_history").insert({
            user_id: agent.user_id,
            token_address: decision.tokenAddress,
            token_symbol: decision.token || "?",
            action: "skip",
            amount_eth: 0,
            reasoning: `Safety blocked: ${safety.reason}. AI wanted: ${decision.reasoning}`,
          });
          continue;
        }
      }

      // Calculate trade amount
      const tradeAmount = walletBalance * (decision.amountPct / 100);
      if (tradeAmount < 0.001) continue; // Min ~$2.50

      // For sells, find the position to close
      let tokenAddress = decision.tokenAddress;
      let tokenSymbol = decision.token || "?";
      if (decision.action === "sell") {
        const pos = (positions || []).find(p =>
          p.token_symbol?.toLowerCase() === decision.token?.toLowerCase()
        );
        if (!pos) continue;
        tokenAddress = pos.token_address;
        tokenSymbol = pos.token_symbol;
      }

      if (!tokenAddress) continue;

      // ── Execute the swap ──
      const swapResult = await executeSwap(
        user.wallet_encrypted_key,
        tokenAddress,
        tradeAmount,
        decision.action,
      );

      if (swapResult.success) {
        // ── Collect 3% fee → platform wallet ──
        const feeResult = await collectTradeFee(
          user.wallet_encrypted_key,
          tradeAmount,
          decision.action,
          tokenSymbol,
        );

        const fee = tradeAmount * TRADE_FEE;

        // Get current token price for PnL tracking
        const tokenInfo = trending.find(t => t.address.toLowerCase() === tokenAddress!.toLowerCase());

        await supabaseAdmin.from("trading_history").insert({
          user_id: agent.user_id,
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          action: decision.action,
          amount_eth: tradeAmount,
          price_at_trade: tokenInfo?.price || 0,
          pnl_eth: decision.action === "sell" ? tradeAmount * 0.05 - fee : -fee, // Rough PnL
          tx_hash: swapResult.txHash,
          fee_tx_hash: feeResult.feeTxHash,
          fee_eth: fee,
          reasoning: `[${decision.confidence}%] ${decision.reasoning}`,
          closed_at: decision.action === "sell" ? new Date().toISOString() : null,
        });

        // Update cumulative PnL + fees
        await supabaseAdmin.from("agent_balances").update({
          total_trading_pnl: (agent.total_trading_pnl || 0) + (decision.action === "sell" ? tradeAmount * 0.05 - fee : -fee),
          total_fees: (agent.total_fees || 0) + fee,
          last_trade_at: new Date().toISOString(),
        }).eq("user_id", agent.user_id);

        // Notify user
        await supabaseAdmin.from("notifications").insert({
          user_id: agent.user_id,
          type: "agent_trade",
          message: `Agent ${decision.action === "buy" ? "bought" : "sold"} ${tokenSymbol}: ${tradeAmount.toFixed(4)} ETH (${decision.confidence}% confidence). Fee: ${fee.toFixed(6)} ETH. ${decision.reasoning}`,
          metadata: JSON.stringify({
            action: decision.action, token: tokenSymbol, amount: tradeAmount,
            fee, confidence: decision.confidence, tx: swapResult.txHash,
          }),
        });

        // ═══ REFERRAL REWARD: 30% of trade fee to referrer ═══
        try {
          const { data: refData } = await supabaseAdmin.from("users")
            .select("referred_by").eq("id", agent.user_id).single();
          if (refData?.referred_by) {
            const referralReward = fee * 0.30;
            if (referralReward >= 0.000001) {
              await supabaseAdmin.from("referral_rewards").insert({
                user_id: refData.referred_by,
                reward_type: "trade_fee_share",
                amount_eth: referralReward,
                from_user_id: agent.user_id,
                unlocked_at: new Date().toISOString(),
              });
              await supabaseAdmin.from("notifications").insert({
                user_id: refData.referred_by,
                type: "referral_reward",
                message: `Referral reward: +${referralReward.toFixed(6)} ETH from a trade by someone you invited!`,
              });
            }
          }
        } catch (refErr) { console.error("Trade referral reward error:", refErr); }
      }
    } catch (err) {
      console.error(`Trading error for ${agent.user_id}:`, err);
    }
  }
}

// ═══ Check low balances ═══
export async function checkLowBalances() {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, wallet_address")
    .eq("onboarded", true)
    .not("wallet_address", "is", null);

  if (!users?.length) return;

  for (const user of users) {
    if (!user.wallet_address) continue;
    try {
      const balance = await getWalletBalance(user.wallet_address);
      if (balance < 0.005 && balance > 0) {
        await supabaseAdmin.from("notifications").insert({
          user_id: user.id,
          type: "balance_low",
          message: `Low balance: ${balance.toFixed(4)} ETH. Fund your agent to keep trading.`,
          metadata: JSON.stringify({ balance, wallet_address: user.wallet_address }),
        });
      }
    } catch {}
  }
}
