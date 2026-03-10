import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { getProvider, getWalletBalance, collectTradeFee, decrypt, FEES } from "@/lib/wallet";
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
  "function allowance(address,address) view returns(uint256)",
];

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { action, tokenAddress, tokenSymbol, amountEth, slippagePct = 1 } = body;

  if (!["buy", "sell"].includes(action))
    return NextResponse.json({ error: "action must be buy or sell" }, { status: 400 });
  if (!tokenAddress || !tokenSymbol)
    return NextResponse.json({ error: "tokenAddress and tokenSymbol required" }, { status: 400 });
  if (!amountEth || amountEth <= 0)
    return NextResponse.json({ error: "amountEth must be > 0" }, { status: 400 });
  if (amountEth > 10)
    return NextResponse.json({ error: "Maximum 10 ETH per trade" }, { status: 400 });

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("wallet_address, wallet_encrypted_key")
    .eq("id", userId)
    .single();

  if (!userData?.wallet_encrypted_key)
    return NextResponse.json({ error: "No wallet found. Generate one on the Wallet tab first." }, { status: 404 });

  const walletAddress = userData.wallet_address;
  const encryptedKey = userData.wallet_encrypted_key;

  try {
    const privateKey = decrypt(encryptedKey);
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);

    const ethBalance = await getWalletBalance(walletAddress);
    const GAS_RESERVE = 0.003;

    if (action === "buy") {
      if (ethBalance < amountEth + GAS_RESERVE) {
        return NextResponse.json({
          error: `Insufficient balance. You have ${ethBalance.toFixed(4)} ETH. Need ${(amountEth + GAS_RESERVE).toFixed(4)} ETH (includes gas reserve).`,
        }, { status: 400 });
      }

      const fee = amountEth * FEES.TRADE_PCT;
      const tradeAmount = amountEth - fee;

      const feeResult = await collectTradeFee(encryptedKey, amountEth, "buy", tokenSymbol);
      if (!feeResult.success) {
        return NextResponse.json({ error: "Fee collection failed" }, { status: 500 });
      }

      const amountInWei = ethers.parseEther(tradeAmount.toFixed(6));
      const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);

      let bestFeeTier = 3000;
      let bestAmountOut = 0n;

      for (const feeTier of FEE_TIERS) {
        try {
          const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: WETH_BASE,
            tokenOut: tokenAddress,
            amountIn: amountInWei,
            fee: feeTier,
            sqrtPriceLimitX96: 0n,
          });
          if (amountOut > bestAmountOut) {
            bestAmountOut = amountOut;
            bestFeeTier = feeTier;
          }
        } catch {
          continue;
        }
      }

      if (bestAmountOut === 0n) {
        return NextResponse.json({ error: "No liquidity found for this token on Base. Try a different chain." }, { status: 400 });
      }

      const slippageFactor = BigInt(Math.floor((100 - slippagePct) * 100));
      const amountOutMin = (bestAmountOut * slippageFactor) / 10000n;

      const router = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, wallet);

      const tx = await router.exactInputSingle({
        tokenIn: WETH_BASE,
        tokenOut: tokenAddress,
        fee: bestFeeTier,
        recipient: walletAddress,
        amountIn: amountInWei,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0n,
      }, { value: amountInWei, gasLimit: 400000n });

      const receipt = await tx.wait();

      await supabaseAdmin.from("trade_logs").insert({
        user_id: userId,
        action: "buy",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount: amountEth,
        price: 0,
        tx_hash: receipt?.hash || tx.hash,
        reasoning: "Manual hunt trade",
        confidence: 100,
        gas_cost: 0.001,
      });

      await supabaseAdmin.from("agent_balances")
        .update({ balance_eth: ethBalance - amountEth })
        .eq("user_id", userId);

      return NextResponse.json({
        ok: true,
        action: "buy",
        tokenSymbol,
        amountEth,
        fee,
        txHash: receipt?.hash || tx.hash,
        amountOut: bestAmountOut.toString(),
        feeTier: bestFeeTier,
        message: `Bought ${tokenSymbol} with ${tradeAmount.toFixed(4)} ETH. Fee: ${fee.toFixed(4)} ETH. Tx: ${(receipt?.hash || tx.hash).slice(0, 10)}...`,
      });
    }

    if (action === "sell") {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const tokenBalance = await token.balanceOf(walletAddress);

      if (tokenBalance === 0n) {
        return NextResponse.json({ error: `You don't have any ${tokenSymbol} to sell.` }, { status: 400 });
      }

      const sellAmount = amountEth <= 1
        ? (tokenBalance * BigInt(Math.floor(amountEth * 10000))) / 10000n
        : tokenBalance;

      const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);
      let bestFeeTier = 3000;
      let bestEthOut = 0n;

      for (const feeTier of FEE_TIERS) {
        try {
          const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: tokenAddress,
            tokenOut: WETH_BASE,
            amountIn: sellAmount,
            fee: feeTier,
            sqrtPriceLimitX96: 0n,
          });
          if (amountOut > bestEthOut) {
            bestEthOut = amountOut;
            bestFeeTier = feeTier;
          }
        } catch {
          continue;
        }
      }

      if (bestEthOut === 0n) {
        return NextResponse.json({ error: "Cannot get a quote for this sell. Pool may be empty." }, { status: 400 });
      }

      const slippageFactor = BigInt(Math.floor((100 - slippagePct) * 100));
      const ethOutMin = (bestEthOut * slippageFactor) / 10000n;

      const signer = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      const approveTx = await signer.approve(SWAP_ROUTER, sellAmount);
      await approveTx.wait();

      const router = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, wallet);
      const tx = await router.exactInputSingle({
        tokenIn: tokenAddress,
        tokenOut: WETH_BASE,
        fee: bestFeeTier,
        recipient: walletAddress,
        amountIn: sellAmount,
        amountOutMinimum: ethOutMin,
        sqrtPriceLimitX96: 0n,
      }, { gasLimit: 450000n });

      const receipt = await tx.wait();

      const ethReceived = parseFloat(ethers.formatEther(bestEthOut));
      await collectTradeFee(encryptedKey, ethReceived, "sell", tokenSymbol);

      await supabaseAdmin.from("trade_logs").insert({
        user_id: userId,
        action: "sell",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount: ethReceived,
        price: 0,
        tx_hash: receipt?.hash || tx.hash,
        reasoning: "Manual hunt trade",
        confidence: 100,
        gas_cost: 0.001,
      });

      return NextResponse.json({
        ok: true,
        action: "sell",
        tokenSymbol,
        ethReceived,
        txHash: receipt?.hash || tx.hash,
        feeTier: bestFeeTier,
        message: `Sold ${tokenSymbol}. Received ~${ethReceived.toFixed(4)} ETH. Tx: ${(receipt?.hash || tx.hash).slice(0, 10)}...`,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Hunt Execute] error:", message);
    return NextResponse.json({
      error: message?.includes("insufficient funds") ? "Insufficient ETH for this trade + gas"
        : message?.includes("UNPREDICTABLE_GAS_LIMIT") ? "Cannot estimate gas — pool may have low liquidity"
        : message?.includes("execution reverted") ? "Swap reverted — try higher slippage or smaller amount"
        : `Trade failed: ${message?.slice(0, 120)}`,
    }, { status: 500 });
  }
}
