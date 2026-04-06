import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptAES } from "@/lib/production";

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
      .select("btc_address, encrypted_btc_key")
      .eq("id", user.id)
      .single();

    if (!profile?.btc_address || !profile?.encrypted_btc_key) {
      return NextResponse.json({ error: "No BTC wallet found" }, { status: 400 });
    }

    const wif = decryptAES(profile.encrypted_btc_key);

    const ecc = await import("tiny-secp256k1");
    const { ECPairFactory } = await import("ecpair");
    const bitcoin = await import("bitcoinjs-lib");

    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.fromWIF(wif);

    const { address: senderAddress } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(keyPair.publicKey),
    });

    if (!senderAddress || senderAddress !== profile.btc_address) {
      return NextResponse.json({ error: "Key mismatch" }, { status: 403 });
    }

    // Fetch UTXOs
    const utxoRes = await fetch(`https://mempool.space/api/address/${senderAddress}/utxo`);
    if (!utxoRes.ok) throw new Error("Failed to fetch UTXOs");
    const utxos: Array<{ txid: string; vout: number; value: number }> = await utxoRes.json();

    const satoshis = Math.floor(amount * 1e8);
    const feeRate = 12; // sat/vbyte — reasonable priority fee
    const estimatedSize = 250;
    const fee = feeRate * estimatedSize;

    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

    let inputTotal = 0;
    for (const utxo of utxos) {
      const txHexRes = await fetch(`https://mempool.space/api/tx/${utxo.txid}/hex`);
      const txHex = await txHexRes.text();
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(txHex, "hex"),
      });
      inputTotal += utxo.value;
      if (inputTotal >= satoshis + fee) break;
    }

    if (inputTotal < satoshis + fee) {
      return NextResponse.json({ error: "Insufficient BTC balance" }, { status: 400 });
    }

    psbt.addOutput({ address: to_address, value: satoshis });
    const change = inputTotal - satoshis - fee;
    if (change > 546) {
      psbt.addOutput({ address: senderAddress, value: change });
    }

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const broadcastRes = await fetch("https://mempool.space/api/tx", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: txHex,
    });

    if (!broadcastRes.ok) {
      const err = await broadcastRes.text();
      throw new Error(`BTC broadcast failed: ${err}`);
    }

    const txid = await broadcastRes.text();
    return NextResponse.json({ success: true, txHash: txid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("send-btc error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
