// POST /api/spawns/catch
//
// Body: { spawnId: uuid, lat: number, lng: number }
//
// Mint flow:
//   1. 50m proximity check (haversine catcher ↔ spawn).
//   2. Atomic claim: UPDATE wild_spawns SET caught_by=$user WHERE id=$spawn
//      AND caught_by IS NULL AND expires_at > NOW(). 0 rows → 409.
//   3. Fee charge (skipped if free catch remaining):
//        - sender pays 0.1 ETH from custodial wallet
//        - 0.08 → deployer (covers mint gas + buyback), 0.02 → treasury
//        - TODO: Uniswap buyback for the 10% buyback portion
//        - On failure: rollback the claim (set caught_by=NULL) and 402.
//   4. Deployer ownerMint() on Mythics → parse Transfer event for tokenId.
//   5. Deployer BLINK.transfer(catcher, reward).
//   6. Persist mint_tx_hash, nft_token_id, blink_reward_tx_hash.
//   7. Decrement free_catches_remaining if used.

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  requireAuth,
  rateLimitByUser,
  isValidLat,
  isValidLng,
} from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptAES } from "@/lib/production";
import {
  buildMetadata,
  buildMetadataFromCreatureId,
  ipfsToGatewayUrl,
  TIER_BLINK_REWARD,
  BURN_TIER_LABELS,
  type BurnTier,
} from "@/lib/spawn-pool";
import {
  CREATURE_REGISTRY,
  legacyResolveCreature,
} from "@/lib/creature-registry";
import { haversineMeters } from "@/lib/wild-spawns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_URL = (
  process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com"
).trim();

const BLINK_TOKEN_CONTRACT = (
  process.env.NEXT_PUBLIC_BLINK_TOKEN_CONTRACT ||
  "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B"
).trim();
const MYTHICS_NFT_CONTRACT = (
  process.env.NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT ||
  "0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592"
).trim();

const TREASURY_ADDR = "0x00468c1B22451ed9Fabc9DA32E6aEa28DC03a216";
const PROXIMITY_M = 50;
const CATCH_FEE_ETH = "0.1";
const FEE_TO_DEPLOYER_ETH = "0.08";
const FEE_TO_TREASURY_ETH = "0.02";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

const MYTHICS_ABI = [
  "function ownerMint(address to, string memory tokenURI)",
  "function totalMinted() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

interface CatchBody {
  spawnId?: unknown;
  lat?: unknown;
  lng?: unknown;
}

interface SpawnRow {
  id: string;
  s2_cell_id: string;
  spawn_index: number;
  lat: number;
  lng: number;
  tier: BurnTier;
  name: string;
  image_cid: string;
  creature_id: number | null;
  expires_at: string;
  caught_by: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rl = rateLimitByUser(user!.id, "spawns-catch", 10, 60 * 60_000);
    if (rl) return rl;

    let body: CatchBody;
    try {
      body = (await req.json()) as CatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const spawnId = typeof body.spawnId === "string" ? body.spawnId : "";
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!/^[0-9a-f-]{36}$/i.test(spawnId)) {
      return NextResponse.json({ error: "Invalid spawnId" }, { status: 400 });
    }
    if (!isValidLat(lat) || !isValidLng(lng)) {
      return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
    }

    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
    if (!deployerKey) {
      return NextResponse.json(
        { error: "Catch server signer not configured" },
        { status: 503 },
      );
    }

    // 1. Load spawn row to check proximity BEFORE atomic claim — so we can
    // reject 'too far' without burning the row.
    const { data: preview, error: previewErr } = await supabaseAdmin
      .from("wild_spawns")
      .select("id, s2_cell_id, lat, lng, tier, name, image_cid, creature_id, expires_at, caught_by")
      .eq("id", spawnId)
      .maybeSingle();
    if (previewErr) {
      return NextResponse.json(
        { error: "DB read failed", details: previewErr.message },
        { status: 500 },
      );
    }
    if (!preview) {
      return NextResponse.json({ error: "Spawn not found" }, { status: 404 });
    }
    if (preview.caught_by) {
      return NextResponse.json({ error: "Spawn already caught" }, { status: 409 });
    }
    if (new Date(preview.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Spawn expired" }, { status: 410 });
    }
    const distance = haversineMeters(lat, lng, preview.lat, preview.lng);
    if (distance > PROXIMITY_M) {
      return NextResponse.json(
        {
          error: `Too far from spawn — ${Math.round(distance)}m away. Walk within ${PROXIMITY_M}m to catch.`,
          distance_m: Math.round(distance),
        },
        { status: 400 },
      );
    }

    // 2. Load catcher profile (incl. wallet + free-catch counter).
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, eth_address, eth_encrypted_key, free_catches_remaining")
      .eq("id", user!.id)
      .single();
    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 400 },
      );
    }
    if (!profile.eth_address || !profile.eth_encrypted_key) {
      return NextResponse.json(
        { error: "No ETH wallet on account — set one up in /wallet first" },
        { status: 400 },
      );
    }
    const freeRemaining = Number(profile.free_catches_remaining ?? 0);
    // Special drops (sentinel spawn_index = -1) are always free catches — no ETH fee.
    let isFreeCatch = freeRemaining > 0;

    // 3. Atomic claim — only one catcher wins.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("wild_spawns")
      .update({ caught_by: user!.id, caught_at: new Date().toISOString() })
      .eq("id", spawnId)
      .is("caught_by", null)
      .gt("expires_at", new Date().toISOString())
      .select("id, s2_cell_id, spawn_index, lat, lng, tier, name, image_cid, creature_id, expires_at")
      .maybeSingle();
    if (claimErr) {
      return NextResponse.json(
        { error: "Claim DB write failed", details: claimErr.message },
        { status: 500 },
      );
    }
    if (!claimed) {
      return NextResponse.json(
        { error: "Spawn already caught or expired" },
        { status: 409 },
      );
    }

    const claimedRow = claimed as SpawnRow;
    const tier: BurnTier = claimedRow.tier;
    const blinkRewardTokens = TIER_BLINK_REWARD[tier];
    // Special drops (sentinel spawn_index = -1) waive the catch fee.
    if (claimedRow.spawn_index === -1) {
      isFreeCatch = true;
    }

    // Helper to roll back the claim if any later step fails.
    const rollbackClaim = async () => {
      await supabaseAdmin
        .from("wild_spawns")
        .update({ caught_by: null, caught_at: null })
        .eq("id", spawnId);
    };

    // Decrypt catcher's custodial wallet.
    let catcherAddress = profile.eth_address as string;
    let catcherPrivateKey: string;
    try {
      const raw = decryptAES(profile.eth_encrypted_key as string);
      catcherPrivateKey = raw.startsWith("0x") ? raw : `0x${raw}`;
    } catch {
      await rollbackClaim();
      return NextResponse.json(
        { error: "Could not decrypt catcher wallet" },
        { status: 500 },
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // 4. Charge catch fee (if not free).
    let feeToDeployerTxHash: string | null = null;
    let feeToTreasuryTxHash: string | null = null;
    if (!isFreeCatch) {
      try {
        const catcherSigner = new ethers.Wallet(catcherPrivateKey, provider);
        const [balance, feeData, nonceStart, network] = await Promise.all([
          provider.getBalance(catcherAddress),
          provider.getFeeData(),
          provider.getTransactionCount(catcherAddress, "pending"),
          provider.getNetwork(),
        ]);
        if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
          await rollbackClaim();
          return NextResponse.json(
            { error: "RPC missing EIP-1559 fees — try again" },
            { status: 502 },
          );
        }
        const gasLimit = 21_000n;
        const perTxGas = feeData.maxFeePerGas * gasLimit;
        const totalFeeWei =
          ethers.parseEther(CATCH_FEE_ETH) + perTxGas * 2n;
        if (balance < totalFeeWei) {
          await rollbackClaim();
          return NextResponse.json(
            {
              error: `Insufficient ETH. Need at least ${ethers.formatEther(totalFeeWei)} ETH (catch fee + gas).`,
              required_eth: ethers.formatEther(totalFeeWei),
            },
            { status: 402 },
          );
        }

        // Send 0.08 → deployer
        const deployerWallet = new ethers.Wallet(
          deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`,
          provider,
        );
        const tx1 = await catcherSigner.sendTransaction({
          to: deployerWallet.address,
          value: ethers.parseEther(FEE_TO_DEPLOYER_ETH),
          gasLimit,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          nonce: nonceStart,
          chainId: network.chainId,
          type: 2,
        });
        const rcpt1 = await tx1.wait();
        if (!rcpt1 || rcpt1.status !== 1) {
          await rollbackClaim();
          return NextResponse.json(
            { error: "Catch fee tx (deployer) failed on-chain" },
            { status: 502 },
          );
        }
        feeToDeployerTxHash = tx1.hash;

        // Send 0.02 → treasury
        const tx2 = await catcherSigner.sendTransaction({
          to: TREASURY_ADDR,
          value: ethers.parseEther(FEE_TO_TREASURY_ETH),
          gasLimit,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          nonce: nonceStart + 1,
          chainId: network.chainId,
          type: 2,
        });
        const rcpt2 = await tx2.wait();
        if (!rcpt2 || rcpt2.status !== 1) {
          // Deployer was already paid — leave the row claimed and surface the
          // half-paid state. Support can refund manually.
          return NextResponse.json(
            {
              error: "Catch fee tx (treasury) failed on-chain — partial payment made",
              feeToDeployerTxHash,
            },
            { status: 502 },
          );
        }
        feeToTreasuryTxHash = tx2.hash;
      } catch (err: unknown) {
        await rollbackClaim();
        return NextResponse.json(
          {
            error:
              err instanceof Error
                ? `Catch fee failed: ${err.message}`
                : "Catch fee failed",
          },
          { status: 502 },
        );
      }
    }

    // 5. IDENTITY CALIBRATION — build metadata from creature_id whenever
    // possible so the minted NFT matches what the user saw in AR. Falls back
    // to name-based resolution only for legacy rows that pre-date the
    // registry, and logs a warning so we can backfill those.
    let identityCreatureId: number | null = claimedRow.creature_id;
    let identityName = claimedRow.name;
    let identityImageCid = claimedRow.image_cid;
    if (identityCreatureId == null) {
      const legacy = legacyResolveCreature(claimedRow.name, claimedRow.image_cid);
      if (legacy) {
        identityCreatureId = legacy.id;
        console.warn(
          `[catch] Legacy spawn ${spawnId} resolved by name → creature_id=${legacy.id}`,
        );
      } else {
        console.warn(
          `[catch] Legacy spawn ${spawnId} could not be resolved to a creature_id — minting from raw row`,
        );
      }
    }

    let metadata: Record<string, unknown>;
    if (identityCreatureId != null) {
      const entry = CREATURE_REGISTRY[identityCreatureId];
      identityName = entry.name;
      identityImageCid = entry.visual.card;
      metadata = buildMetadataFromCreatureId(identityCreatureId, {
        catchOrigin: "wild",
        cellId: claimedRow.s2_cell_id,
      });
    } else {
      metadata = buildMetadata({
        tier,
        name: claimedRow.name,
        imageCid: claimedRow.image_cid,
        catchOrigin: "wild",
        cellId: claimedRow.s2_cell_id,
      });
    }
    const tokenURI =
      "data:application/json;base64," +
      Buffer.from(JSON.stringify(metadata), "utf8").toString("base64");

    let mintTxHash = "";
    let mintedTokenId: string | null = null;
    try {
      const deployerSigner = new ethers.Wallet(
        deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`,
        provider,
      );
      const mythics = new ethers.Contract(
        MYTHICS_NFT_CONTRACT,
        MYTHICS_ABI,
        deployerSigner,
      );
      const mintTx = await mythics.ownerMint(catcherAddress, tokenURI);
      const rcpt = await mintTx.wait();
      if (!rcpt || rcpt.status !== 1) {
        return NextResponse.json(
          {
            error: "Mint tx failed on-chain (fee already paid — contact support)",
            feeToDeployerTxHash,
            feeToTreasuryTxHash,
          },
          { status: 502 },
        );
      }
      mintTxHash = mintTx.hash;
      for (const log of rcpt.logs ?? []) {
        try {
          const parsed = mythics.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed && parsed.name === "Transfer") {
            mintedTokenId = String(parsed.args.tokenId);
            break;
          }
        } catch {
          /* skip non-matching logs */
        }
      }
      if (mintedTokenId === null) {
        try {
          const minted = await mythics.totalMinted();
          mintedTokenId = String(minted);
        } catch {}
      }
    } catch (err: unknown) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Mint failed: ${err.message}`
              : "Mint failed (RPC error)",
          feeToDeployerTxHash,
          feeToTreasuryTxHash,
        },
        { status: 502 },
      );
    }

    // 6. BLINK reward transfer (deployer → catcher).
    let blinkRewardTxHash: string | null = null;
    try {
      const deployerSigner = new ethers.Wallet(
        deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`,
        provider,
      );
      const erc20 = new ethers.Contract(BLINK_TOKEN_CONTRACT, ERC20_ABI, deployerSigner);
      let decimals = 18;
      try {
        decimals = Number(await erc20.decimals());
      } catch {}
      const amountWei = ethers.parseUnits(blinkRewardTokens.toString(), decimals);
      const rewardTx = await erc20.transfer(catcherAddress, amountWei);
      const rcpt = await rewardTx.wait();
      if (rcpt && rcpt.status === 1) {
        blinkRewardTxHash = rewardTx.hash;
      }
    } catch (err) {
      // Don't fail the whole catch if reward transfer fails — NFT is already
      // minted. Log + surface in response so we can manually backfill.
      console.error("blink reward transfer failed", err);
    }

    // 7. Persist tx hashes on the spawn row.
    await supabaseAdmin
      .from("wild_spawns")
      .update({
        mint_tx_hash: mintTxHash,
        nft_token_id: mintedTokenId,
        blink_reward_tx_hash: blinkRewardTxHash,
      })
      .eq("id", spawnId);

    // 7b. If this spawn was anchored to a Genesis Drop, mark the drop claimed.
    // Conditional update on caught_by IS NULL preserves the first-catcher.
    try {
      await supabaseAdmin
        .from("genesis_drops")
        .update({ caught_by: user!.id, caught_at: new Date().toISOString() })
        .eq("spawn_id", spawnId)
        .is("caught_by", null);
    } catch (err) {
      console.error("genesis_drops claim sync failed", err);
    }

    // 7a. Log activity rows so the catch shows up in the wallet feed.
    // Non-fatal — if the insert fails we still return success below.
    try {
      const rows: Array<Record<string, unknown>> = [
        {
          user_id: user!.id,
          type: "catch",
          title: `Caught ${identityName}`,
          subtitle: BURN_TIER_LABELS[tier],
          amount_text: mintedTokenId ? `#${mintedTokenId}` : null,
          tx_hash: mintTxHash,
          created_at: new Date().toISOString(),
        },
      ];
      if (blinkRewardTxHash && blinkRewardTokens > 0) {
        rows.push({
          user_id: user!.id,
          type: "reward",
          title: `+${blinkRewardTokens} BLINK`,
          subtitle: `Catch reward · ${identityName}`,
          amount_text: `+${blinkRewardTokens} BLINK`,
          tx_hash: blinkRewardTxHash,
          created_at: new Date().toISOString(),
        });
      }
      await supabaseAdmin.from("activity").insert(rows);
    } catch (logErr) {
      console.error("catch activity log failed", logErr);
    }

    // 8. Decrement free-catch counter if this was free.
    // Skip the decrement for special drops (sentinel spawn_index = -1) — they're always free.
    const didDecrementFreeCatch =
      isFreeCatch && claimedRow.spawn_index !== -1 && freeRemaining > 0;
    if (didDecrementFreeCatch) {
      await supabaseAdmin
        .from("profiles")
        .update({ free_catches_remaining: Math.max(0, freeRemaining - 1) })
        .eq("id", user!.id);
    }

    const openseaUrl = mintedTokenId
      ? `https://opensea.io/assets/ethereum/${MYTHICS_NFT_CONTRACT}/${mintedTokenId}`
      : null;

    return NextResponse.json({
      spawnId,
      tier,
      tierLabel: BURN_TIER_LABELS[tier],
      creatureId: identityCreatureId,
      name: identityName,
      image_url: ipfsToGatewayUrl(identityImageCid),
      tokenId: mintedTokenId,
      mintTxHash,
      feeToDeployerTxHash,
      feeToTreasuryTxHash,
      blinkRewardTxHash,
      blinkRewarded: blinkRewardTokens,
      wasFreeCatch: isFreeCatch,
      freeCatchesRemaining: didDecrementFreeCatch
        ? Math.max(0, freeRemaining - 1)
        : freeRemaining,
      openseaUrl,
    });
  } catch (err: unknown) {
    console.error("spawns catch unhandled", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Unexpected error: ${err.message}`
            : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
