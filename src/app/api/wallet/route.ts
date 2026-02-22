import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateWallet, getWalletBalance, executeWithdrawal,
  collectDepositFee, payTierUpgrade, payBoost, paySpotlight,
  PLATFORM_FEE_WALLET, FEES, decrypt
} from "@/lib/wallet";

// POST /api/wallet — actions: generate, deposit_fee, withdraw, settings, reveal_key, upgrade, boost, spotlight
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { action } = body;

  // ── Generate wallet (on signup / first visit) ──
  if (action === "generate") {
    const { data: existing } = await supabaseAdmin
      .from("users").select("wallet_address").eq("id", userId).single();
    if (existing?.wallet_address) {
      return NextResponse.json({ error: "Wallet already exists", address: existing.wallet_address }, { status: 400 });
    }

    const { address, privateKey, encryptedKey } = generateWallet();
    await supabaseAdmin.from("users").update({
      wallet_address: address,
      wallet_encrypted_key: encryptedKey,
    }).eq("id", userId);

    return NextResponse.json({
      address,
      privateKey, // Shown ONCE. User must save.
      message: "Save your private key. We cannot recover it.",
    });
  }

  // ── Collect deposit fee (5%) ──
  // Called by frontend after detecting new deposit balance increase
  if (action === "deposit_fee") {
    const { deposit_amount } = body;
    if (!deposit_amount || deposit_amount <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount" }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) {
      return NextResponse.json({ error: "No wallet found" }, { status: 404 });
    }

    // Send 5% to platform wallet 0xEe9D...c280
    const result = await collectDepositFee(user.wallet_encrypted_key, deposit_amount);

    if (result.success) {
      // Log the deposit + fee
      await supabaseAdmin.from("deposits").insert({
        user_id: userId,
        amount_eth: deposit_amount,
        fee_eth: result.fee,
        net_eth: result.net,
        fee_tx_hash: result.feeTxHash,
        status: "confirmed",
      });

      return NextResponse.json({
        ok: true,
        deposited: deposit_amount,
        fee: result.fee,
        net: result.net,
        feeTxHash: result.feeTxHash,
        message: `Deposited ${deposit_amount} ETH. 5% fee (${result.fee.toFixed(4)} ETH) collected. ${result.net.toFixed(4)} ETH credited.`,
      });
    } else {
      return NextResponse.json({ error: "Fee collection failed. Funds remain in your wallet." }, { status: 500 });
    }
  }

  // ── Reveal private key ──
  if (action === "reveal_key") {
    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) {
      return NextResponse.json({ error: "No wallet found" }, { status: 404 });
    }
    const privateKey = decrypt(user.wallet_encrypted_key);
    return NextResponse.json({ privateKey });
  }

  // ── Update settings (risk level, trading toggle) ──
  if (action === "settings") {
    const { risk_level, trading_enabled, trading_mode,
      stop_loss_pct, take_profit_pct, trailing_stop_pct, max_daily_loss_pct,
      max_position_pct, max_slippage_pct, max_price_impact_pct, cooldown_minutes,
      max_concurrent_positions, trade_size_pct, auto_rebalance,
    } = body;
    const updates: any = { user_id: userId };
    if (risk_level) updates.risk_level = risk_level;
    if (trading_enabled !== undefined) updates.trading_enabled = trading_enabled;
    if (trading_mode) updates.trading_mode = trading_mode;
    if (stop_loss_pct !== undefined) updates.stop_loss_pct = stop_loss_pct;
    if (take_profit_pct !== undefined) updates.take_profit_pct = take_profit_pct;
    if (trailing_stop_pct !== undefined) updates.trailing_stop_pct = trailing_stop_pct;
    if (max_daily_loss_pct !== undefined) updates.max_daily_loss_pct = max_daily_loss_pct;
    if (max_position_pct !== undefined) updates.max_position_pct = max_position_pct;
    if (max_slippage_pct !== undefined) updates.max_slippage_pct = max_slippage_pct;
    if (max_price_impact_pct !== undefined) updates.max_price_impact_pct = max_price_impact_pct;
    if (cooldown_minutes !== undefined) updates.cooldown_minutes = cooldown_minutes;
    if (max_concurrent_positions !== undefined) updates.max_concurrent_positions = max_concurrent_positions;
    if (trade_size_pct !== undefined) updates.trade_size_pct = trade_size_pct;
    if (auto_rebalance !== undefined) updates.auto_rebalance = auto_rebalance;
    updates.updated_at = new Date().toISOString();
    await supabaseAdmin.from("agent_balances").upsert(updates, { onConflict: "user_id" });
    return NextResponse.json({ ok: true });
  }

  // ── Withdraw (no additional fee — fees already taken on deposit + trades) ──
  if (action === "withdraw") {
    const { amount_eth, to_address } = body;
    if (!amount_eth || !to_address) {
      return NextResponse.json({ error: "Amount and address required" }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) {
      return NextResponse.json({ error: "No wallet found" }, { status: 404 });
    }

    const balance = await getWalletBalance(user.wallet_address);
    if (balance < amount_eth) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // No additional fee on withdrawals — send full amount
    const result = await executeWithdrawal(user.wallet_encrypted_key, to_address, amount_eth);

    if (result.success) {
      await supabaseAdmin.from("withdrawals").insert({
        user_id: userId, amount_eth, to_address,
        tx_hash: result.txHash, status: "sent",
      });
      return NextResponse.json({ ok: true, txHash: result.txHash });
    } else {
      return NextResponse.json({ error: "Withdrawal failed" }, { status: 500 });
    }
  }

  // ── Upgrade tier (Pro: 0.005 ETH, Business: 0.015 ETH) ──
  if (action === "upgrade") {
    const { tier } = body;
    if (!["pro", "business"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) {
      return NextResponse.json({ error: "No wallet found" }, { status: 404 });
    }

    const balance = await getWalletBalance(user.wallet_address);
    const cost = tier === "pro" ? FEES.PRO_MONTHLY : FEES.BUSINESS_MONTHLY;
    if (balance < cost) {
      return NextResponse.json({ error: `Insufficient balance. Need ${cost} ETH for ${tier} tier.` }, { status: 400 });
    }

    const result = await payTierUpgrade(user.wallet_encrypted_key, tier as "pro" | "business");
    if (result.success) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await supabaseAdmin.from("users").update({
        tier, tier_expires_at: expiresAt.toISOString(),
      }).eq("id", userId);
      await supabaseAdmin.from("tier_payments").insert({
        user_id: userId, tier, amount_eth: cost, tx_hash: result.txHash,
      });
      return NextResponse.json({ ok: true, tier, txHash: result.txHash, expiresAt });
    } else {
      return NextResponse.json({ error: "Payment failed" }, { status: 500 });
    }
  }

  // ── Boost (0.005 ETH one-time) ──
  if (action === "boost") {
    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) return NextResponse.json({ error: "No wallet" }, { status: 404 });

    const balance = await getWalletBalance(user.wallet_address);
    if (balance < FEES.BOOST) {
      return NextResponse.json({ error: `Need ${FEES.BOOST} ETH for boost` }, { status: 400 });
    }

    const result = await payBoost(user.wallet_encrypted_key);
    if (result.success) {
      await supabaseAdmin.from("agent_profiles").update({ boosted_at: new Date().toISOString() }).eq("user_id", userId);
      return NextResponse.json({ ok: true, txHash: result.txHash });
    }
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }

  // ── Spotlight (0.01 ETH/week) ──
  if (action === "spotlight") {
    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) return NextResponse.json({ error: "No wallet" }, { status: 404 });

    const balance = await getWalletBalance(user.wallet_address);
    if (balance < FEES.SPOTLIGHT_WEEKLY) {
      return NextResponse.json({ error: `Need ${FEES.SPOTLIGHT_WEEKLY} ETH for spotlight` }, { status: 400 });
    }

    const result = await paySpotlight(user.wallet_encrypted_key);
    if (result.success) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await supabaseAdmin.from("agent_profiles").update({
        spotlight_until: expiresAt.toISOString(),
      }).eq("user_id", userId);
      return NextResponse.json({ ok: true, txHash: result.txHash, expiresAt });
    }
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/wallet — wallet info + on-chain balance + fee structure
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = sessionUser.id;

  const [userRes, balRes, tradesRes, withdrawRes, depositRes] = await Promise.all([
    supabaseAdmin.from("users").select("wallet_address, trading_wallet_address, tier, tier_expires_at, ai_provider, ai_api_key_encrypted").eq("id", userId).single(),
    supabaseAdmin.from("agent_balances").select("*").eq("user_id", userId).single(),
    supabaseAdmin.from("trading_history").select("*").eq("user_id", userId).neq("action", "skip").order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("deposits").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  // Use trading wallet if set, otherwise identity wallet
  const tradingWallet = userRes.data?.trading_wallet_address;
  const identityWallet = userRes.data?.wallet_address;
  const walletAddress = tradingWallet || identityWallet;
  let onChainBalance = 0;
  if (walletAddress) {
    onChainBalance = await getWalletBalance(walletAddress);
  }

  // ═══ INSTANT DEPOSIT DETECTION & 5% FEE COLLECTION ═══
  // Runs on every balance poll (~30s). Detects new deposits and auto-collects fee.
  let depositCollected = false;
  let depositInfo: any = null;
  if (walletAddress && onChainBalance > 0.0001) {
    try {
      const { data: tracking } = await supabaseAdmin
        .from("deposit_tracking")
        .select("last_known_balance")
        .eq("user_id", userId)
        .single();

      const lastKnown = tracking?.last_known_balance || 0;
      const diff = onChainBalance - lastKnown;

      if (diff > 0.0001) {
        // New deposit detected — collect 5% immediately
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("wallet_encrypted_key")
          .eq("id", userId)
          .single();

        if (userData?.wallet_encrypted_key) {
          const result = await collectDepositFee(userData.wallet_encrypted_key, diff);

          if (result.success) {
            depositCollected = true;
            depositInfo = { amount: diff, fee: result.fee, net: result.net, tx: result.feeTxHash };

            // Update on-chain balance (post-fee)
            onChainBalance = onChainBalance - result.fee;

            // Log deposit
            await supabaseAdmin.from("deposits").insert({
              user_id: userId,
              amount_eth: diff,
              fee_eth: result.fee,
              net_eth: result.net,
              fee_tx_hash: result.feeTxHash,
              status: "confirmed",
            });

            // Update tracking
            await supabaseAdmin.from("deposit_tracking").upsert({
              user_id: userId,
              last_known_balance: onChainBalance,
              last_checked_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

            // Notify user
            await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              type: "deposit",
              message: `Deposit: ${diff.toFixed(4)} ETH received. Fee: ${result.fee.toFixed(6)} ETH (5%). Credited: ${result.net.toFixed(4)} ETH.`,
              metadata: JSON.stringify(depositInfo),
            });

            // ═══ REFERRAL REWARD: Pay 30% of fee to referrer ═══
            try {
              const { data: refUser } = await supabaseAdmin.from("users")
                .select("referred_by")
                .eq("id", userId).single();
              if (refUser?.referred_by) {
                const { data: referrer } = await supabaseAdmin.from("users")
                  .select("wallet_address")
                  .eq("id", refUser.referred_by).single();
                if (referrer?.wallet_address) {
                  const referralReward = result.fee * 0.30; // 30% of our 5% fee
                  if (referralReward >= 0.000001) {
                    const { sendFeeToPlatform } = await import("@/lib/wallet");
                    // Send reward FROM platform wallet to referrer
                    // For now, log it — actual payout requires platform wallet signing
                    await supabaseAdmin.from("referral_rewards").insert({
                      user_id: refUser.referred_by,
                      reward_type: "deposit_fee_share",
                      amount_eth: referralReward,
                      from_user_id: userId,
                      unlocked_at: new Date().toISOString(),
                    });
                    await supabaseAdmin.from("notifications").insert({
                      user_id: refUser.referred_by,
                      type: "referral_reward",
                      message: `Referral reward: +${referralReward.toFixed(6)} ETH from a deposit by someone you invited!`,
                    });
                  }
                }
              }
            } catch (refErr) { console.error("Referral reward error:", refErr); }
          }
        }
      } else {
        // No new deposit — keep tracking in sync
        await supabaseAdmin.from("deposit_tracking").upsert({
          user_id: userId,
          last_known_balance: onChainBalance,
          last_checked_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    } catch (e) {
      // Don't break the balance response if deposit detection fails
      console.error("Deposit detection error:", e);
    }
  }

  const agentBal = balRes.data;
  const estDays = onChainBalance > 0 ? Math.floor(onChainBalance / 0.0003) : 0;

  // Calculate today's PnL from recent trades
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTrades = (tradesRes.data || []).filter((t: any) => new Date(t.created_at) >= todayStart);
  const pnlToday = todayTrades.reduce((sum: number, t: any) => sum + parseFloat(t.pnl_eth || "0"), 0);
  // Fetch real ETH price
  let ethUsdPrice = 1950; // fallback
  try {
    const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", { next: { revalidate: 60 } });
    if (priceRes.ok) {
      const priceData = await priceRes.json();
      ethUsdPrice = priceData?.ethereum?.usd || ethUsdPrice;
    }
  } catch {}

  return NextResponse.json({
    wallet_address: walletAddress || null,
    has_wallet: !!walletAddress,
    balance_eth: onChainBalance,
    eth_usd_price: ethUsdPrice,
    pnl_today: pnlToday * ethUsdPrice,
    agent_active: agentBal?.trading_enabled || false,
    trading_enabled: agentBal?.trading_enabled || false,
    risk_level: agentBal?.risk_level || "conservative",
    trading_mode: agentBal?.trading_mode || "meme_scout",
    total_trading_pnl: agentBal?.total_trading_pnl || 0,
    total_fees_paid: agentBal?.total_fees || 0,
    estimated_days: estDays,
    tier: userRes.data?.tier || "free",
    tier_expires_at: userRes.data?.tier_expires_at || null,
    recent_trades: tradesRes.data || [],
    recent_withdrawals: withdrawRes.data || [],
    recent_deposits: depositRes.data || [],
    // Fee structure — displayed to users
    fees: FEES,
    platform_fee_wallet: PLATFORM_FEE_WALLET,
    chain: "Base (L2)",
    chain_id: 8453,
    ai_connected: !!userRes.data?.ai_api_key_encrypted,
    ai_provider: userRes.data?.ai_provider || null,
    // Instant deposit info (null if no new deposit this poll)
    deposit_just_collected: depositCollected ? depositInfo : null,
  });
}
