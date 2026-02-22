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
    const { risk_level, trading_enabled } = body;
    const updates: any = {};
    if (risk_level) updates.risk_level = risk_level;
    if (trading_enabled !== undefined) updates.trading_enabled = trading_enabled;
    await supabaseAdmin.from("agent_balances").update(updates).eq("user_id", userId);
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
    supabaseAdmin.from("users").select("wallet_address, trading_wallet_address, tier, tier_expires_at").eq("id", userId).single(),
    supabaseAdmin.from("agent_balances").select("*").eq("user_id", userId).single(),
    supabaseAdmin.from("trading_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
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

  const agentBal = balRes.data;
  const estDays = onChainBalance > 0 ? Math.floor(onChainBalance / 0.0003) : 0;

  // Calculate today's PnL from recent trades
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTrades = (tradesRes.data || []).filter((t: any) => new Date(t.created_at) >= todayStart);
  const pnlToday = todayTrades.reduce((sum: number, t: any) => sum + parseFloat(t.pnl_eth || "0"), 0);
  const ethUsdPrice = 2000; // TODO: fetch real price from oracle/API

  return NextResponse.json({
    wallet_address: walletAddress || null,
    has_wallet: !!walletAddress,
    balance_eth: onChainBalance,
    eth_usd_price: ethUsdPrice,
    pnl_today: pnlToday * ethUsdPrice,
    agent_active: agentBal?.trading_enabled || false,
    trading_enabled: agentBal?.trading_enabled || false,
    risk_level: agentBal?.risk_level || "conservative",
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
  });
}
