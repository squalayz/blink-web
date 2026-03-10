import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/wallet";
import { ethers } from "ethers";

const WETH_BASE = "0x4200000000000000000000000000000000000006";
const QUOTER_V2 = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
const FEE_TIERS = [100, 500, 3000, 10000];

const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const ERC20_ABI = [
  "function decimals() view returns(uint8)",
  "function symbol() view returns(string)",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenAddress = searchParams.get("token");
  const amountEth = parseFloat(searchParams.get("amount") || "0");
  const direction = searchParams.get("direction") || "buy";

  if (!tokenAddress || !amountEth)
    return NextResponse.json({ error: "token and amount required" }, { status: 400 });

  try {
    const provider = getProvider();
    const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    let decimals = 18;
    try {
      decimals = await tokenContract.decimals();
    } catch { /* default 18 */ }

    let bestFeeTier = 3000;
    let bestAmountOut = 0n;
    const amountIn = ethers.parseEther(amountEth.toFixed(6));

    for (const feeTier of FEE_TIERS) {
      try {
        const tokenIn = direction === "buy" ? WETH_BASE : tokenAddress;
        const tokenOut = direction === "buy" ? tokenAddress : WETH_BASE;
        const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
          tokenIn, tokenOut, amountIn, fee: feeTier, sqrtPriceLimitX96: 0n,
        });
        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestFeeTier = feeTier;
        }
      } catch {
        continue;
      }
    }

    const formattedOut = direction === "buy"
      ? parseFloat(ethers.formatUnits(bestAmountOut, decimals))
      : parseFloat(ethers.formatEther(bestAmountOut));

    return NextResponse.json({
      ok: true,
      amountIn: amountEth,
      amountOut: formattedOut,
      feeTier: bestFeeTier,
      feePct: bestFeeTier / 10000,
      hasLiquidity: bestAmountOut > 0n,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, hasLiquidity: false, error: message?.slice(0, 100) });
  }
}
