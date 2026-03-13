import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, action, ethAmount, userId } = body;

    if (!token || !action || !ethAmount) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Stub: simulate trade execution
    const txHash = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

    console.log(`[MeshTrade] ${action.toUpperCase()} ${ethAmount} ETH of ${token.symbol} by ${userId || "anon"} → ${txHash}`);

    return NextResponse.json({
      success: true,
      txHash,
      ethAmount,
      action,
      token: { symbol: token.symbol, address: token.address, price: token.price },
      timestamp: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
