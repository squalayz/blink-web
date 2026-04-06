import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      chain,         // "solana" | "ethereum" | "bitcoin"
      signedTx,      // base64 (SOL) or hex string (ETH)
      toAddress,     // recipient wallet — for logging only
      orbId,         // optional — links tx to an orb
    } = await req.json();

    if (!chain || !signedTx) {
      return new Response(JSON.stringify({ error: "Missing required fields: chain, signedTx" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let txHash: string;
    let explorerUrl: string;

    if (chain === "solana") {
      const rpc = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [signedTx, { encoding: "base64", preflightCommitment: "confirmed" }],
        }),
      });
      const json = await res.json();
      if (json.error) {
        return new Response(JSON.stringify({ error: json.error.message || "Solana RPC error" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      txHash = json.result;
      explorerUrl = `https://solscan.io/tx/${txHash}`;

    } else if (chain === "ethereum") {
      const rpc = Deno.env.get("ETH_RPC_URL") || "https://eth-mainnet.public.blastapi.io";
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_sendRawTransaction",
          params: [signedTx],
        }),
      });
      const json = await res.json();
      if (json.error) {
        return new Response(JSON.stringify({ error: json.error.message || "ETH RPC error" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      txHash = json.result;
      explorerUrl = `https://etherscan.io/tx/${txHash}`;

    } else {
      return new Response(JSON.stringify({ error: `Unsupported chain: ${chain}. Use solana or ethereum.` }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // If orbId provided, log the tx hash on the orb
    if (orbId) {
      await supabase.from("orbs").update({ tx_hash: txHash }).eq("id", orbId);
    }

    return new Response(JSON.stringify({
      success: true,
      txHash,
      explorerUrl,
      chain,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
