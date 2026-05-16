// POST /api/spawn/burn-mint
//
// Burns $BLINK from the caller's custodial ETH wallet to 0x...dEaD, then
// ownerMint()s a fresh Mythics-contract NFT to that same wallet with metadata
// drawn from the BLINK Bestiary spawn pool. Finally inserts an "orbs" row
// (asset_type='nft') at the requested GPS.
//
// Server-only. Returns clean JSON errors with status codes — never lets the
// function throw uncaught (we learned this from /api/gifts/create).

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  requireAuth,
  rateLimitByUser,
  sanitizeText,
  isValidLat,
  isValidLng,
} from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptAES } from "@/lib/production";
import {
  BURN_TIER_COSTS,
  BURN_TIER_LABELS,
  buildMetadata,
  isBurnTier,
  pickFromPool,
  type BurnTier,
} from "@/lib/spawn-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_URL = (
  process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com"
).trim();

const BLINK_TOKEN_CONTRACT = "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B";
const MYTHICS_NFT_CONTRACT = (
  process.env.NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT ||
  "0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592"
).trim();

const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// ownerMint signature varies between contracts; the BLINK Mythics deployment
// uses (address to, string tokenURI). If the live contract returns a tokenId,
// we read it from the Transfer event; otherwise we fall back to totalMinted().
const MYTHICS_ABI = [
  "function ownerMint(address to, string memory tokenURI)",
  "function totalMinted() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

interface BurnMintBody {
  tier?: unknown;
  lat?: unknown;
  lng?: unknown;
  message?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rl = rateLimitByUser(user!.id, "spawn-burn-mint", 5, 60 * 60_000);
    if (rl) return rl;

    let body: BurnMintBody;
    try {
      body = (await req.json()) as BurnMintBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { tier, lat, lng, message } = body;
    if (!isBurnTier(tier)) {
      return NextResponse.json({ error: "Bad tier" }, { status: 400 });
    }
    if (!isValidLat(lat) || !isValidLng(lng)) {
      return NextResponse.json(
        { error: "Invalid GPS coordinates" },
        { status: 400 }
      );
    }
    const cleanMessage = sanitizeText(message, 280);

    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
    if (!deployerKey) {
      return NextResponse.json(
        {
          error:
            "Burn-mint coming online soon. Server signer not yet configured.",
        },
        { status: 503 }
      );
    }

    // Load sender's custodial ETH wallet.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("eth_address, eth_encrypted_key")
      .eq("id", user!.id)
      .single();
    if (!profile?.eth_address || !profile?.eth_encrypted_key) {
      return NextResponse.json(
        { error: "No ETH wallet on account" },
        { status: 400 }
      );
    }
    const senderAddress: string = profile.eth_address;
    let senderPrivateKey: string;
    try {
      const raw = decryptAES(profile.eth_encrypted_key);
      senderPrivateKey = raw.startsWith("0x") ? raw : `0x${raw}`;
    } catch {
      return NextResponse.json(
        { error: "Could not decrypt wallet" },
        { status: 500 }
      );
    }

    const burnTier = tier as BurnTier;
    const cost = BURN_TIER_COSTS[burnTier];

    // 1. Burn step
    let burnTxHash = "";
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = new ethers.Wallet(senderPrivateKey, provider);
      const erc20 = new ethers.Contract(BLINK_TOKEN_CONTRACT, ERC20_ABI, signer);

      let decimals = 18;
      try {
        decimals = Number(await erc20.decimals());
      } catch {}
      const amountWei = ethers.parseUnits(cost.toString(), decimals);

      const balance: bigint = await erc20.balanceOf(senderAddress);
      if (balance < amountWei) {
        return NextResponse.json(
          {
            error: `Insufficient BLINK. Need ${cost.toLocaleString()} BLINK to summon ${BURN_TIER_LABELS[burnTier]}.`,
          },
          { status: 400 }
        );
      }

      // Sanity gas check — sender pays for the burn tx.
      const ethBal = await provider.getBalance(senderAddress);
      if (ethBal < ethers.parseEther("0.0008")) {
        return NextResponse.json(
          { error: "Sender needs ~0.0008 ETH for burn gas" },
          { status: 400 }
        );
      }

      const burnTx = await erc20.transfer(BURN_ADDRESS, amountWei);
      const receipt = await burnTx.wait();
      if (!receipt || receipt.status !== 1) {
        return NextResponse.json(
          { error: "Burn transaction failed on-chain" },
          { status: 502 }
        );
      }
      burnTxHash = burnTx.hash;
    } catch (err: unknown) {
      console.error("burn-mint burn step failed", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Burn failed: ${err.message}`
              : "Burn failed (RPC error)",
        },
        { status: 502 }
      );
    }

    // 2. Pick image + build metadata
    const pick = pickFromPool(burnTier);
    const metadata = buildMetadata({
      tier: burnTier,
      name: pick.name,
      imageCid: pick.imageCid,
      burnTxHash,
    });

    // For v1 we use a `data:` URI so the metadata is fully on-chain (no IPFS
    // upload pipeline required). OpenSea + indexers support data: tokenURIs.
    const tokenURI =
      "data:application/json;base64," +
      Buffer.from(JSON.stringify(metadata), "utf8").toString("base64");

    // 3. Owner-mint via deployer
    let mintTxHash = "";
    let mintedTokenId: number | null = null;
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const deployerSigner = new ethers.Wallet(
        deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`,
        provider
      );
      const mythics = new ethers.Contract(
        MYTHICS_NFT_CONTRACT,
        MYTHICS_ABI,
        deployerSigner
      );

      const mintTx = await mythics.ownerMint(senderAddress, tokenURI);
      const receipt = await mintTx.wait();
      if (!receipt || receipt.status !== 1) {
        return NextResponse.json(
          {
            error:
              "Mint transaction failed on-chain (burn already executed — contact support)",
            burnTxHash,
          },
          { status: 502 }
        );
      }
      mintTxHash = mintTx.hash;

      // Parse Transfer event to extract tokenId. Falls back to totalMinted.
      try {
        for (const log of receipt.logs ?? []) {
          try {
            const parsed = mythics.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (parsed && parsed.name === "Transfer") {
              mintedTokenId = Number(parsed.args.tokenId);
              break;
            }
          } catch {
            /* skip non-matching logs */
          }
        }
      } catch {}
      if (mintedTokenId === null) {
        try {
          const minted = await mythics.totalMinted();
          mintedTokenId = Number(minted);
        } catch {}
      }
    } catch (err: unknown) {
      console.error("burn-mint mint step failed", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Mint failed: ${err.message}`
              : "Mint failed (RPC error)",
          burnTxHash,
        },
        { status: 502 }
      );
    }

    // 4. Insert orb row
    const droppedAt = new Date().toISOString();
    const assetPayload = {
      contract: MYTHICS_NFT_CONTRACT,
      tokenId: mintedTokenId,
      salePrice: 0,
      mintedFromBurn: true,
      burnTier,
      burnTxHash,
      mintTxHash,
      image: pick.imageCid,
      name: pick.name,
    };

    const insertPayload: Record<string, unknown> = {
      type: "nft",
      currency: "ETH",
      chain: "ethereum",
      amount: 0,
      amount_usd: 0,
      claim_fee_usd: 0,
      message: cleanMessage || `[NFT] ${pick.name}`,
      lat,
      lng,
      dropper_id: user!.id,
      dropper_wallet: senderAddress,
      rarity: burnTier === "common" ? "common" : burnTier,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      radius_meters: 100,
      media_url: pick.imageCid,
      media_type: "image",
      nft_mint_status: "minted",
      nft_reward: true,
      asset_type: "nft",
      asset_payload: assetPayload,
    };

    const { data: insertedOrb, error: insertError } = await supabaseAdmin
      .from("orbs")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !insertedOrb) {
      // Burn + mint already happened. Surface details so support can recover.
      return NextResponse.json(
        {
          error: "DB insert failed after burn+mint",
          details: insertError?.message,
          burnTxHash,
          mintTxHash,
          tokenId: mintedTokenId,
        },
        { status: 500 }
      );
    }

    // 5. Activity row (best-effort, never fails the request).
    await supabaseAdmin
      .from("activity")
      .insert({
        user_id: user!.id,
        type: "burn-mint",
        title: `Summoned ${BURN_TIER_LABELS[burnTier]} Creature`,
        subtitle: `Burned ${cost.toLocaleString()} BLINK to mint ${pick.name}`,
        amount_text: `${cost.toLocaleString()} BLINK`,
        orb_id: insertedOrb.id,
        amount: cost,
        currency: "BLINK",
        chain: "ethereum",
        created_at: droppedAt,
      })
      .then(() => undefined, () => undefined);

    return NextResponse.json({
      spawnId: insertedOrb.id,
      tokenId: mintedTokenId,
      burnTxHash,
      mintTxHash,
      image: pick.imageCid,
      name: pick.name,
      tier: burnTier,
    });
  } catch (err: unknown) {
    console.error("burn-mint unhandled", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Unexpected error: ${err.message}`
            : "Unexpected error",
      },
      { status: 500 }
    );
  }
}
