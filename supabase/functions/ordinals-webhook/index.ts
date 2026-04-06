import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "ordinals-webhook" }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Ordinalsbot sends: { id, status, files, charge, ... }
    const { id: orderId, status, files } = body;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing order id" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Find orb by inscription order id
    const { data: orb } = await supabase
      .from("orbs")
      .select("id")
      .eq("inscription_order_id", orderId)
      .single();

    if (!orb) {
      // Not an error — might be from a different service
      return new Response(JSON.stringify({ ok: true, message: "Order not linked to any orb" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Map Ordinalsbot status to our nft_mint_status
    const statusMap: Record<string, string> = {
      pending: "pending_inscription",
      waiting_payment: "pending_inscription",
      queued: "pending_inscription",
      processing: "minting",
      minting: "minting",
      completed: "minted",
      failed: "failed",
    };

    const nftStatus = statusMap[status] || status;

    // Get inscription tx if completed
    const inscriptionId = files?.[0]?.inscriptionId || null;
    const inscriptionTxHash = files?.[0]?.txid || null;

    await supabase.from("orbs").update({
      nft_mint_status: nftStatus,
      ...(inscriptionId && { nft_token_id: inscriptionId }),
      ...(inscriptionTxHash && { nft_tx_hash: inscriptionTxHash }),
      ...(inscriptionId && { nft_explorer_url: `https://ordinals.com/inscription/${inscriptionId}` }),
    }).eq("id", orb.id);

    return new Response(JSON.stringify({ ok: true, orbId: orb.id, nftStatus }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
