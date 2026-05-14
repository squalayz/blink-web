import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptAES } from "@/lib/production";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate — require valid Supabase session
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Generate all three wallets in parallel
    const [ethResult, solResult, btcResult] = await Promise.all([
      // ETH wallet
      (async () => {
        const ethWallet = ethers.Wallet.createRandom();
        return {
          address: ethWallet.address,
          encryptedKey: encryptAES(ethWallet.privateKey),
        };
      })(),

      // SOL wallet
      (async () => {
        const solKeypair = Keypair.generate();
        return {
          address: solKeypair.publicKey.toBase58(),
          encryptedKey: encryptAES(
            Buffer.from(solKeypair.secretKey).toString("hex")
          ),
        };
      })(),

      // BTC wallet (native deps — keep dynamic imports)
      (async () => {
        try {
          const ecc = await import("tiny-secp256k1");
          const { ECPairFactory } = await import("ecpair");
          const bitcoin = await import("bitcoinjs-lib");

          const ECPair = ECPairFactory(ecc);
          const keyPair = ECPair.makeRandom();
          const { address } = bitcoin.payments.p2wpkh({
            pubkey: Buffer.from(keyPair.publicKey),
          });
          return {
            address: address || "",
            encryptedKey: encryptAES(keyPair.toWIF()),
          };
        } catch (btcErr) {
          console.error("BTC wallet generation failed:", btcErr);
          return { address: "", encryptedKey: "" };
        }
      })(),
    ]);

    // 3. Store encrypted keys + addresses in profiles (never return private keys)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        sol_address: solResult.address,
        eth_address: ethResult.address,
        btc_address: btcResult.address || null,
        sol_encrypted_key: solResult.encryptedKey,
        eth_encrypted_key: ethResult.encryptedKey,
        btc_encrypted_key: btcResult.encryptedKey || null,
      })
      .eq("id", user.id);

    if (updateError) {
      // Try upsert into profiles if row doesn't exist
      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: user.id,
          sol_address: solResult.address,
          eth_address: ethResult.address,
          btc_address: btcResult.address || null,
          sol_encrypted_key: solResult.encryptedKey,
          eth_encrypted_key: ethResult.encryptedKey,
          btc_encrypted_key: btcResult.encryptedKey || null,
        });

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to store wallet data" },
          { status: 500 }
        );
      }
    }

    // 4. Return ONLY public addresses — never private keys
    return NextResponse.json({
      sol_address: solResult.address,
      eth_address: ethResult.address,
      btc_address: btcResult.address || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Wallet generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
