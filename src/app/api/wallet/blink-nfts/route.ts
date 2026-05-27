// GET /api/wallet/blink-nfts
//
// Auth-required. Returns the BLINK Genesis + Mythics NFTs currently held by
// the calling user's custodial ETH wallet, in a flat shape suitable for the
// Spirit Gift NFT picker:
//
//   { nfts: [{ contract, tokenId, name, image, collection: 'genesis'|'mythics' }] }
//
// Implementation: we use Alchemy as the primary source (already wired in
// src/lib/wallet-nfts.ts with the correct BLINK contract addresses and a
// 60-second in-memory cache). Per the brief, OpenSea v2 is a noted fallback;
// in practice Alchemy is more reliable and returns metadata + image URLs
// directly. If ALCHEMY_API_KEY is absent the helper returns empty arrays and
// this route degrades to an empty list (UI shows the empty state with the
// mint CTA).

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBlinkHoldings } from "@/lib/wallet-nfts";
import { BLINK_GENESIS_NFT, MYTHICS_NFT } from "@/lib/gift-escrow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PickerNFT {
  contract: string;
  tokenId: string;
  name: string;
  image: string | null;
  collection: "genesis" | "mythics";
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("eth_address")
    .eq("id", user!.id)
    .single();

  const wallet = profile?.eth_address;
  if (!wallet) {
    return NextResponse.json({ nfts: [], wallet: null });
  }

  try {
    const holdings = await getBlinkHoldings(wallet);

    const genesisNfts: PickerNFT[] = holdings.genesis.map((snap) => ({
      contract: BLINK_GENESIS_NFT,
      tokenId: String(snap.tokenId),
      name: snap.name,
      image: snap.image || null,
      collection: "genesis" as const,
    }));

    const mythicsNfts: PickerNFT[] = holdings.mythics.map((snap) => ({
      contract: MYTHICS_NFT,
      tokenId: String(snap.tokenId),
      name: snap.name,
      image: snap.image || null,
      collection: "mythics" as const,
    }));

    return NextResponse.json({
      wallet: wallet.toLowerCase(),
      nfts: [...genesisNfts, ...mythicsNfts],
    });
  } catch {
    // Upstream NFT indexer flapped (Alchemy 5xx / rate limit). Return an
    // empty list with a hint so the client can show the empty state without
    // implying the user owns nothing.
    return NextResponse.json(
      { wallet: wallet.toLowerCase(), nfts: [], retry: true },
      { status: 200 }
    );
  }
}
