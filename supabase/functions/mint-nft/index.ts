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
      orbId,
      chain, // "solana" | "ethereum" | "bitcoin"
      walletAddress,
      name,
      description,
      imageUrl, // Optional: URL to image (we'll re-upload to IPFS)
    } = await req.json();

    if (!orbId || !chain || !walletAddress || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields: orbId, chain, walletAddress, name" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const pinataJwt = Deno.env.get("PINATA_JWT")!;
    const pinataGateway = Deno.env.get("PINATA_GATEWAY_URL") || "gateway.pinata.cloud";

    // Fetch orb
    const { data: orb, error: orbErr } = await supabase
      .from("orbs")
      .select("*")
      .eq("id", orbId)
      .single();

    if (orbErr || !orb) {
      return new Response(JSON.stringify({ error: "Orb not found" }), {
        status: 404, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Upload metadata JSON to IPFS via Pinata
    const metadata = {
      name,
      description: description || `MishMesh Orb — ${orb.currency} ${orb.amount}`,
      image: imageUrl || "ipfs://QmPlaceholderReplaceWithRealImageCID",
      attributes: [
        { trait_type: "Currency", value: orb.currency },
        { trait_type: "Amount", value: orb.amount },
        { trait_type: "Rarity", value: orb.rarity },
        { trait_type: "Chain", value: chain },
        { trait_type: "Dropped By", value: orb.dropper_name || "Anonymous" },
        { trait_type: "Cracked By", value: walletAddress },
      ],
      external_url: "https://mishmesh.ai",
    };

    const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `mishmesh-orb-${orbId}.json` },
      }),
    });

    if (!pinRes.ok) {
      const err = await pinRes.text();
      return new Response(JSON.stringify({ error: `Pinata error: ${err}` }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { IpfsHash: metadataCid } = await pinRes.json();
    const metadataUri = `ipfs://${metadataCid}`;
    const gatewayUrl = `https://${pinataGateway}/ipfs/${metadataCid}`;

    // Bitcoin: stub Ordinalsbot (no account yet)
    if (chain === "bitcoin") {
      await supabase.from("orbs").update({
        nft_mint_status: "pending_inscription",
        ipfs_metadata_cid: metadataCid,
        nft_chain: chain,
      }).eq("id", orbId);

      return new Response(JSON.stringify({
        success: true,
        chain,
        metadataUri,
        gatewayUrl,
        status: "pending_inscription",
        message: "Metadata uploaded to IPFS. Bitcoin inscription will be processed when Ordinalsbot is configured.",
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Solana / Ethereum: update orb with IPFS metadata, return for client-side minting
    await supabase.from("orbs").update({
      nft_mint_status: "metadata_ready",
      ipfs_metadata_cid: metadataCid,
      nft_chain: chain,
    }).eq("id", orbId);

    return new Response(JSON.stringify({
      success: true,
      chain,
      metadataUri,
      gatewayUrl,
      orbId,
      message: "Metadata pinned to IPFS. Use metadataUri for on-chain minting.",
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
