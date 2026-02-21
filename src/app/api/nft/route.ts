import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { getWalletBalance } from "@/lib/wallet";
import { mintMatchNFT, generatePreviewSVG, getScoreTier, NFT_MINT_FEE } from "@/lib/nft";

// POST /api/nft — mint a match NFT
export async function POST(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  const { match_id } = await req.json();
  if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  // Verify match exists, is accepted by both, and not already minted
  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("*, user_a_profile:users!matches_user_a_fkey(name, wallet_address), user_b_profile:users!matches_user_b_fkey(name, wallet_address)")
    .eq("id", match_id).single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.user_a !== userId && match.user_b !== userId) {
    return NextResponse.json({ error: "Not your match" }, { status: 403 });
  }
  if (match.status_a !== "accepted" || match.status_b !== "accepted") {
    return NextResponse.json({ error: "Both users must accept before minting" }, { status: 400 });
  }
  if (match.nft_minted) {
    return NextResponse.json({ error: "Already minted", nft_token_id: match.nft_token_id }, { status: 400 });
  }

  // Get minter's wallet
  const { data: minter } = await supabaseAdmin
    .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
  if (!minter?.wallet_encrypted_key) {
    return NextResponse.json({ error: "No wallet found" }, { status: 404 });
  }

  // Check balance (need 0.01 ETH + gas)
  const balance = await getWalletBalance(minter.wallet_address);
  if (balance < NFT_MINT_FEE + 0.001) {
    return NextResponse.json({
      error: `Insufficient balance. Need ${NFT_MINT_FEE} ETH + gas. You have ${balance.toFixed(4)} ETH.`
    }, { status: 400 });
  }

  const userAName = match.user_a_profile?.name || "User A";
  const userBName = match.user_b_profile?.name || "User B";
  const userAWallet = match.user_a_profile?.wallet_address;
  const userBWallet = match.user_b_profile?.wallet_address;

  if (!userAWallet || !userBWallet) {
    return NextResponse.json({ error: "Both users need wallets to mint" }, { status: 400 });
  }

  const score = Math.round(match.score * 100);
  const matchDate = new Date(match.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const result = await mintMatchNFT(minter.wallet_encrypted_key, {
    userAName, userBName, score,
    reasoning: match.agent_reasoning || match.synergy || "AI agents connected these builders.",
    matchDate, matchId: match_id,
    userAWallet, userBWallet,
  });

  if (result.success) {
    // Update match with NFT info
    await supabaseAdmin.from("matches").update({
      nft_minted: true,
      nft_token_id: result.tokenIdA !== undefined ? `${result.tokenIdA},${result.tokenIdB}` : null,
      nft_tx_hash: result.txHash,
      nft_minted_by: userId,
      nft_minted_at: new Date().toISOString(),
    }).eq("id", match_id);

    // Notify the other user
    const otherId = match.user_a === userId ? match.user_b : match.user_a;
    try {
      const { supabaseAdmin: sb } = await import("@/lib/supabase");
      await sb.from("notifications").insert({
        user_id: otherId,
        type: "system",
        title: "Your match was minted as an NFT!",
        body: `${userAName} × ${userBName} — ${score}% match. Check your wallet.`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      tokenIdA: result.tokenIdA,
      tokenIdB: result.tokenIdB,
      txHash: result.txHash,
      score, tier: getScoreTier(score).tier,
    });
  } else {
    return NextResponse.json({ error: result.error || "Mint failed" }, { status: 500 });
  }
}

// GET /api/nft — get user's minted match NFTs + preview data
export async function GET(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  // Get all matches where NFT was minted
  const { data: mintedMatches } = await supabaseAdmin
    .from("matches")
    .select("*, user_a_profile:users!matches_user_a_fkey(name, avatar_url), user_b_profile:users!matches_user_b_fkey(name, avatar_url)")
    .eq("nft_minted", true)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("nft_minted_at", { ascending: false });

  // Build NFT gallery data with preview SVGs
  const nfts = (mintedMatches || []).map(m => {
    const score = Math.round(m.score * 100);
    const { tier, color } = getScoreTier(score);
    const userAName = m.user_a_profile?.name || "User A";
    const userBName = m.user_b_profile?.name || "User B";
    const matchDate = new Date(m.created_at).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    return {
      matchId: m.id,
      userAName, userBName,
      userAAvatar: m.user_a_profile?.avatar_url,
      userBAvatar: m.user_b_profile?.avatar_url,
      score, tier, tierColor: color,
      reasoning: m.agent_reasoning || m.synergy || "",
      matchDate,
      nftTokenId: m.nft_token_id,
      txHash: m.nft_tx_hash,
      mintedAt: m.nft_minted_at,
      previewSvg: generatePreviewSVG(userAName, userBName, score, matchDate),
    };
  });

  // Also get accepted but unminted matches (for "mint this" prompts)
  const { data: mintableMatches } = await supabaseAdmin
    .from("matches")
    .select("id, score, synergy, created_at, user_a_profile:users!matches_user_a_fkey(name), user_b_profile:users!matches_user_b_fkey(name)")
    .eq("nft_minted", false).eq("status_a", "accepted").eq("status_b", "accepted")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false });

  const mintable = (mintableMatches || []).map((m: any) => ({
    matchId: m.id,
    userAName: Array.isArray(m.user_a_profile) ? m.user_a_profile[0]?.name : m.user_a_profile?.name || "?",
    userBName: Array.isArray(m.user_b_profile) ? m.user_b_profile[0]?.name : m.user_b_profile?.name || "?",
    score: Math.round(m.score * 100),
    tier: getScoreTier(Math.round(m.score * 100)).tier,
    synergy: m.synergy,
    matchDate: new Date(m.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  }));

  return NextResponse.json({
    nfts,
    mintable,
    mint_fee: NFT_MINT_FEE,
    contract_address: process.env.NFT_CONTRACT_ADDRESS || null,
  });
}
