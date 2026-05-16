import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptAES } from "@/lib/production";
import { requireAuth, rateLimitByUser, verifyUserPassword } from "@/lib/api-auth";
import { ethers } from "ethers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rlError = rateLimitByUser(user!.id, "send-eth", 5, 60_000);
    if (rlError) return rlError;

    const { to_address, amount, password } = await req.json();
    if (!to_address || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      .eq("id", user.id)
      .single();

    if (!profile?.eth_address || !profile?.eth_encrypted_key) {
      return NextResponse.json({ error: "No ETH wallet found" }, { status: 400 });
    }

    // ETH private key is stored as hex string (with or without 0x prefix)
    const privateKeyRaw = decryptAES(profile.eth_encrypted_key);
    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;

    const provider = new ethers.JsonRpcProvider((process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim());
    const wallet = new ethers.Wallet(privateKey, provider);

    const { data: locks } = await supabaseAdmin.from('wallet_locks').select('amount').eq('user_id', user.id).eq('status', 'locked').eq('currency', 'ETH');
    const lockedAmount = (locks || []).reduce((sum: number, l: { amount: number }) => sum + Number(l.amount), 0);
    const balanceWei = await provider.getBalance(wallet.address);
    const balanceETH = Number(ethers.formatEther(balanceWei));
    const availableETH = balanceETH - lockedAmount;
    if (amount > availableETH) {
      return NextResponse.json({ error: `Insufficient available balance. ${lockedAmount.toFixed(4)} ETH is locked in active BLINKS. Available: ${availableETH.toFixed(4)} ETH` }, { status: 400 });
    }

    const tx = await wallet.sendTransaction({
      to: to_address,
      value: ethers.parseEther(amount.toString()),
    });

    const receipt = await tx.wait(1);
    if (!receipt) throw new Error("Transaction failed — no receipt");

    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("send-eth error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
