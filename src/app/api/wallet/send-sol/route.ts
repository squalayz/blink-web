import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptAES } from "@/lib/production";
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

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
      .select("sol_address, sol_encrypted_key")
      .eq("user_id", user.id)
      .single();

    if (!profile?.sol_address || !profile?.sol_encrypted_key) {
      return NextResponse.json({ error: "No SOL wallet found" }, { status: 400 });
    }

    const privateKeyHex = decryptAES(profile.sol_encrypted_key);
    const privateKeyBytes = Buffer.from(privateKeyHex, "hex");
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const toPublicKey = new PublicKey(to_address);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );
    tx.recentBlockhash = blockhash;
    tx.feePayer = keypair.publicKey;
    tx.sign(keypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    return NextResponse.json({ success: true, txHash: signature });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("send-sol error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
