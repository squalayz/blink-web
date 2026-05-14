import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "https://esm.sh/@solana/web3.js@1.91.8";
import { ethers } from "https://esm.sh/ethers@6.11.1";
import { scryptSync } from "node:crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENC_SALT = "mishmesh-v17-salt";

function deriveKey(): Uint8Array {
  const password = Deno.env.get("WALLET_ENCRYPTION_KEY") || Deno.env.get("NEXTAUTH_SECRET") || "";
  return new Uint8Array(scryptSync(password, ENC_SALT, 32));
}

async function decryptKey(encoded: string): Promise<string> {
  const keyBytes = deriveKey();
  const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = data.slice(0, 16);
  const authTag = data.slice(16, 32);
  const ciphertext = data.slice(32);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    cryptoKey,
    combined
  );

  return new TextDecoder().decode(decrypted);
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

    if (hunterUserId === orb.dropper_id) {
      return Response.json(
        { error: "You cannot crack your own orb" },
        { status: 403, headers: CORS }
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

      const balance = await connection.getBalance(keypair.publicKey);
      const totalLamports = hunterLamports + feeLamports + 10000;
      if (balance < totalLamports) {
        return Response.json(
          { error: "Dropper wallet has insufficient SOL balance. The orb may no longer be funded." },
          { status: 400, headers: CORS }
        );
      }

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

      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // Don't block on confirmation — tx is broadcast, return immediately.
      // confirmTransaction fires in background so the UI can show success ASAP.
      connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      ).catch(() => {}); // fire and forget

      txHash = sig;
      explorerUrl = `https://solscan.io/tx/${txHash}`;
    } else if (currency === "ETH") {
      const encryptedKey = dropperProfile.eth_encrypted_key;
      if (!encryptedKey) {
        return Response.json({ error: "Dropper has no ETH key" }, { status: 500, headers: CORS });
      }

      const privateKeyHex = await decryptKey(encryptedKey);
      const privateKey = privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`;

      const rpcUrl = Deno.env.get("ETH_RPC_URL") || "https://cloudflare-eth.com";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const feeWallet = Deno.env.get("MISHMESH_FEE_WALLET_ETH")!;

      const walletBalance = await provider.getBalance(wallet.address);
      const totalNeeded = ethers.parseEther(hunterAmount.toString()) + ethers.parseEther(feeAmount.toString());
      if (walletBalance < totalNeeded) {
        return Response.json(
          { error: "Dropper wallet has insufficient ETH balance. The orb may no longer be funded." },
          { status: 400, headers: CORS }
        );
      }

      // Send 90% to hunter — broadcast immediately, don't wait for confirmation
      const hunterTx = await wallet.sendTransaction({
        to: hunterWallet,
        value: ethers.parseEther(hunterAmount.toString()),
      });

      // Send 10% platform fee — broadcast immediately
      wallet.sendTransaction({
        to: feeWallet,
        value: ethers.parseEther(feeAmount.toString()),
      }).catch((feeErr: unknown) => {
        const msg = feeErr instanceof Error ? feeErr.message : String(feeErr);
        console.error('[PLATFORM_FEE_FAILED]', JSON.stringify({ orbId, feeAmount, currency: 'ETH', error: msg, timestamp: new Date().toISOString() }));
      });

      // Return hash immediately — tx is in mempool, user sees it right away
      txHash = hunterTx.hash;
      explorerUrl = `https://etherscan.io/tx/${txHash}`;
    } else if (currency === 'BTC') {
      return Response.json(
        { error: 'BTC orb cracking is coming soon. This orb cannot be cracked yet.' },
        { status: 501, headers: CORS }
      );
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
