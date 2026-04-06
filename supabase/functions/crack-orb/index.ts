import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "https://esm.sh/@solana/web3.js@1.91.8";
import { ethers } from "https://esm.sh/ethers@6.11.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ------------------------------------------------------------------ */
/*  AES-256-CBC decryption                                             */
/*  Format: hex string = IV (32 hex chars / 16 bytes) + ciphertext     */
/*  Key: base64-encoded 32-byte AES key from env                       */
/* ------------------------------------------------------------------ */
async function decryptKey(encryptedHex: string): Promise<string> {
  const keyB64 = Deno.env.get("WALLET_ENCRYPTION_KEY")!;
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  // Split hex: first 32 hex chars = 16 bytes IV, rest = ciphertext
  const ivHex = encryptedHex.slice(0, 32);
  const ctHex = encryptedHex.slice(32);

  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const ct = new Uint8Array(ctHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    ct
  );

  return new TextDecoder().decode(new Uint8Array(decrypted));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { orbId, hunterWallet, hunterUserId, gpsLat, gpsLng } =
      await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch orb
    const { data: orb, error: orbError } = await supabase
      .from("orbs")
      .select("*")
      .eq("id", orbId)
      .single();

    if (orbError || !orb) {
      return Response.json({ error: "Orb not found" }, { status: 404, headers: CORS });
    }
    if (orb.status !== "pending" && orb.status !== "active") {
      return Response.json(
        { error: `Orb is already ${orb.status}` },
        { status: 400, headers: CORS }
      );
    }

    // GPS distance check (haversine)
    const R = 6371e3;
    const p = Math.PI / 180;
    const dLat = (gpsLat - orb.lat) * p;
    const dLon = (gpsLng - orb.lng) * p;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(orb.lat * p) * Math.cos(gpsLat * p) * Math.sin(dLon / 2) ** 2;
    const distance = 2 * R * Math.asin(Math.sqrt(a));
    const radius = orb.radius_meters ?? 100;

    if (distance > radius) {
      return Response.json(
        {
          error: `Too far away. You are ${Math.round(distance)}m away, need to be within ${radius}m`,
        },
        { status: 400, headers: CORS }
      );
    }

    // Fetch dropper's profile to get encrypted private key
    const { data: dropperProfile, error: profileError } = await supabase
      .from("profiles")
      .select("sol_address, eth_address, sol_encrypted_key, eth_encrypted_key")
      .eq("user_id", orb.dropper_id)
      .single();

    if (profileError || !dropperProfile) {
      return Response.json(
        { error: "Dropper profile not found" },
        { status: 500, headers: CORS }
      );
    }

    const currency = (orb.currency || "SOL").toUpperCase();
    const totalAmount = orb.amount;
    const hunterAmount = totalAmount * 0.9;
    const feeAmount = totalAmount * 0.1;

    let txHash: string | null = null;
    let explorerUrl: string | null = null;

    if (currency === "SOL") {
      const encryptedKey = dropperProfile.sol_encrypted_key;
      if (!encryptedKey) {
        return Response.json({ error: "Dropper has no SOL key" }, { status: 500, headers: CORS });
      }

      const privateKeyHex = await decryptKey(encryptedKey);
      const privateKeyBytes = Uint8Array.from(
        privateKeyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
      );
      const keypair = Keypair.fromSecretKey(privateKeyBytes);

      const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");

      const hunterPubkey = new PublicKey(hunterWallet);
      const feePubkey = new PublicKey(Deno.env.get("MISHMESH_FEE_WALLET_SOL")!);

      const hunterLamports = Math.floor(hunterAmount * LAMPORTS_PER_SOL);
      const feeLamports = Math.floor(feeAmount * LAMPORTS_PER_SOL);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: hunterPubkey,
          lamports: hunterLamports,
        })
      );
      tx.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: feePubkey,
          lamports: feeLamports,
        })
      );
      tx.recentBlockhash = blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);

      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      txHash = sig;
      explorerUrl = `https://solscan.io/tx/${txHash}`;
    } else if (currency === "ETH") {
      const encryptedKey = dropperProfile.eth_encrypted_key;
      if (!encryptedKey) {
        return Response.json({ error: "Dropper has no ETH key" }, { status: 500, headers: CORS });
      }

      const privateKeyHex = await decryptKey(encryptedKey);
      const privateKey = privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`;

      const rpcUrl = Deno.env.get("ETH_RPC_URL") || "https://mainnet.base.org";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const feeWallet = Deno.env.get("MISHMESH_FEE_WALLET_ETH")!;

      // Send 90% to hunter
      const hunterTx = await wallet.sendTransaction({
        to: hunterWallet,
        value: ethers.parseEther(hunterAmount.toString()),
      });
      const hunterReceipt = await hunterTx.wait(1);
      if (!hunterReceipt) throw new Error("Hunter transfer failed");

      // Send 10% platform fee
      const feeTx = await wallet.sendTransaction({
        to: feeWallet,
        value: ethers.parseEther(feeAmount.toString()),
      });
      await feeTx.wait(1);

      txHash = hunterReceipt.hash;
      explorerUrl = `https://basescan.org/tx/${txHash}`;
    } else {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    // Atomic update — only succeeds if still pending/active
    const { error: updateError } = await supabase
      .from("orbs")
      .update({
        status: "cracked",
        cracked_by: hunterUserId,
        cracked_at: new Date().toISOString(),
        payout_tx_hash: txHash,
      })
      .eq("id", orbId)
      .eq("status", orb.status); // atomic check

    if (updateError) {
      return Response.json(
        { error: "Orb was already cracked by someone else" },
        { status: 409, headers: CORS }
      );
    }

    // Release wallet lock
    await supabase
      .from("wallet_locks")
      .update({ status: "claimed", updated_at: new Date().toISOString() })
      .eq("orb_id", orbId);

    return Response.json(
      { success: true, txHash, explorerUrl, message: "Orb cracked! Crypto is on its way." },
      { headers: CORS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500, headers: CORS });
  }
});
