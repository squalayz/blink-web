// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Emergency Kill Switch
// 🛑 SELL ALL — Market sell every open position immediately
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { collectTradeFee, getProvider, FEES } from "@/lib/wallet";
import { ethers } from "ethers";

const WETH_BASE = "0x4200000000000000000000000000000000000006";
const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const QUOTER_V2 = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
const FEE_TIERS = [100, 500, 3000, 10000];

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

async function findBestRoute(tokenIn: string, tokenOut: string, amountIn: bigint): Promise<{ feeTier: number; amountOut: bigint; amountOutMin: bigint } | null> {
  const provider = getProvider();
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);
  let best: { feeTier: number; amountOut: bigint; amountOutMin: bigint } | null = null;

  for (const fee of FEE_TIERS) {
    try {
      const result = await quoter.quoteExactInputSingle.staticCall({
        tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n,
      });
      const amountOut = result.amountOut || result[0];
      if (!best || amountOut > best.amountOut) {
        // 10% slippage tolerance for emergency exits
        const amountOutMin = (amountOut * 9000n) / 10000n;
        best = { feeTier: fee, amountOut, amountOutMin };
      }
    } catch { /* no pool for this tier */ }
  }
  return best;
}

async function getUserId(req: NextRequest): Promise<string | null> {
  // Use SIWE session
  const cookieHeader = req.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/mm-session=([^;]+)/);
  if (!sessionMatch) return null;

  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(sessionMatch[1], secret);
    return (payload as any).sub || (payload as any).userId || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ═══ SELL ALL ═══
  if (action === "sell_all") {
    const results: any[] = [];
    let totalEthReceived = 0;
    let totalFees = 0;
    let positionsClosed = 0;

    try {
      // 1. Immediately disable trading
      await supabaseAdmin.from("agent_balances")
        .update({ trading_enabled: false })
        .eq("user_id", userId);

      // 2. Get user wallet
      const { data: user } = await supabaseAdmin.from("users")
        .select("wallet_encrypted_key, wallet_address")
        .eq("id", userId).single();

      if (!user?.wallet_encrypted_key) {
        return NextResponse.json({ error: "No wallet found" }, { status: 404 });
      }

      // 3. Get all open positions
      const { data: positions } = await supabaseAdmin.from("trading_history")
        .select("*")
        .eq("user_id", userId)
        .eq("action", "buy")
        .is("closed_at", null);

      if (!positions?.length) {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId, type: "emergency_stop",
          message: "🛑 Emergency stop activated. No open positions to sell. Trading paused.",
        });
        return NextResponse.json({
          ok: true, positions_closed: 0, total_eth_received: 0, total_fees: 0,
          message: "Trading paused. No open positions.",
        });
      }

      // 4. Market sell each position
      const { decrypt } = await import("@/lib/wallet");
      const privateKey = decrypt(user.wallet_encrypted_key);
      const provider = getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const router = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, wallet);

      for (const pos of positions) {
        try {
          const token = new ethers.Contract(pos.token_address, ERC20_ABI, wallet);
          const balance = await token.balanceOf(wallet.address);

          if (balance === 0n) {
            // No tokens to sell — just close the position record
            await supabaseAdmin.from("trading_history").update({
              closed_at: new Date().toISOString(),
              pnl_eth: -(pos.amount_eth || 0),
              reasoning: "🛑 Emergency stop — no tokens found in wallet",
            }).eq("id", pos.id);
            results.push({ token: pos.token_symbol, status: "closed_empty", eth: 0 });
            positionsClosed++;
            continue;
          }

          // Find best route
          const quote = await findBestRoute(pos.token_address, WETH_BASE, balance);
          if (!quote) {
            results.push({ token: pos.token_symbol, status: "no_route", eth: 0 });
            // Still close the position record
            await supabaseAdmin.from("trading_history").update({
              closed_at: new Date().toISOString(),
              reasoning: "🛑 Emergency stop — no liquidity route found",
            }).eq("id", pos.id);
            positionsClosed++;
            continue;
          }

          // Approve router
          const approveTx = await token.approve(SWAP_ROUTER, balance);
          await approveTx.wait();

          // Execute swap with 10% slippage
          const params = {
            tokenIn: pos.token_address,
            tokenOut: WETH_BASE,
            fee: quote.feeTier,
            recipient: wallet.address,
            amountIn: balance,
            amountOutMinimum: quote.amountOutMin,
            sqrtPriceLimitX96: 0n,
          };

          const tx = await router.exactInputSingle(params, { gasLimit: 400000n });
          const receipt = await tx.wait();
          const ethReceived = parseFloat(ethers.formatEther(quote.amountOut));

          // Collect 3% trade fee
          const feeResult = await collectTradeFee(
            user.wallet_encrypted_key, ethReceived, "sell", pos.token_symbol
          );
          const fee = ethReceived * FEES.TRADE_PCT;

          totalEthReceived += ethReceived;
          totalFees += fee;
          positionsClosed++;

          // Close position
          await supabaseAdmin.from("trading_history").update({
            closed_at: new Date().toISOString(),
            pnl_eth: ethReceived - (pos.amount_eth || 0),
            reasoning: "🛑 Emergency stop — market sold",
            tx_hash: receipt?.hash || tx.hash,
            fee_eth: (pos.fee_eth || 0) + fee,
          }).eq("id", pos.id);

          results.push({
            token: pos.token_symbol,
            status: "sold",
            eth: ethReceived,
            fee,
            txHash: receipt?.hash || tx.hash,
          });

        } catch (err: any) {
          console.error(`Emergency sell failed for ${pos.token_symbol}:`, err.message);
          results.push({ token: pos.token_symbol, status: "failed", error: err.message?.slice(0, 100) });
        }
      }

      // 5. Send notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId, type: "emergency_stop",
        message: `🛑 EMERGENCY STOP: ${positionsClosed} positions closed. Received ${totalEthReceived.toFixed(4)} ETH. Fees: ${totalFees.toFixed(6)} ETH. Trading paused. Re-enable manually.`,
        metadata: JSON.stringify({ results, totalEthReceived, totalFees, positionsClosed }),
      });

      return NextResponse.json({
        ok: true,
        positions_closed: positionsClosed,
        total_eth_received: totalEthReceived,
        total_fees: totalFees,
        results,
        message: `${positionsClosed} positions closed. Trading paused.`,
      });

    } catch (err: any) {
      console.error("Emergency sell_all failed:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ═══ RE-ENABLE TRADING ═══
  if (action === "re_enable") {
    await supabaseAdmin.from("agent_balances")
      .update({ trading_enabled: true })
      .eq("user_id", userId);

    await supabaseAdmin.from("notifications").insert({
      user_id: userId, type: "trading_resumed",
      message: "Trading re-enabled. Your agent will resume trading in the next cycle.",
    });

    return NextResponse.json({ ok: true, message: "Trading re-enabled." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export const runtime = "nodejs";
export const maxDuration = 120; // Emergency sells may take time
