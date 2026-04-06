import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptAES } from "@/lib/production";
import { ethers } from "ethers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to_address, amount } = await req.json();
    if (!to_address || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("eth_address, eth_encrypted_key")
      .eq("user_id", user.id)
      .single();

    if (!profile?.eth_address || !profile?.eth_encrypted_key) {
      return NextResponse.json({ error: "No ETH wallet found" }, { status: 400 });
    }

    // ETH private key is stored as hex string (with or without 0x prefix)
    const privateKeyRaw = decryptAES(profile.eth_encrypted_key);
    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;

    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(privateKey, provider);

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
