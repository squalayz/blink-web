// BLINK custodial ETH send.
// Requires fresh password re-prompt. Builds an EIP-1559 transaction
// (maxFeePerGas / maxPriorityFeePerGas) and broadcasts via JsonRpcProvider.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import { decryptAES, isValidAddress, isValidETHAmount } from "@/lib/production";
import { requireAuth, rateLimitByUser, verifyUserPassword } from "@/lib/api-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RPC_URL = (process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim();

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rlError = rateLimitByUser(user!.id, "wallet-send", 5, 60_000);
    if (rlError) return rlError;

    const body = await req.json();
    const { to_address, amount, password } = body as {
      to_address?: string;
      amount?: number;
      password?: string;
    };

    if (!to_address || !isValidAddress(to_address)) {
      return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
    }
    if (typeof amount !== "number" || !isValidETHAmount(amount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password required to send" }, { status: 400 });
    }
    if (!user!.email) {
      return NextResponse.json({ error: "User has no email" }, { status: 400 });
    }

    const validPw = await verifyUserPassword(user!.email, password);
    if (!validPw) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("eth_address, eth_encrypted_key")
      .eq("id", user!.id)
      .single();

    if (!profile?.eth_address || !profile?.eth_encrypted_key) {
      return NextResponse.json({ error: "No ETH wallet found" }, { status: 400 });
    }

    const privateKeyRaw = decryptAES(profile.eth_encrypted_key);
    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const value = ethers.parseEther(amount.toString());

    const [balance, feeData, nonce, network] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getFeeData(),
      provider.getTransactionCount(wallet.address, "pending"),
      provider.getNetwork(),
    ]);

    if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
      return NextResponse.json({ error: "Network does not support EIP-1559 fee data" }, { status: 500 });
    }

    const gasLimit = 21_000n;
    const estimatedFee = feeData.maxFeePerGas * gasLimit;
    if (balance < value + estimatedFee) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Need ~${ethers.formatEther(value + estimatedFee)} ETH including gas.`,
        },
        { status: 400 }
      );
    }

    const tx = await wallet.sendTransaction({
      to: to_address,
      value,
      gasLimit,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      nonce,
      chainId: network.chainId,
      type: 2,
    });

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      from: wallet.address,
      to: to_address,
      amount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("wallet/send error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
