import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { ethers } from "ethers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isValidAddress } from "@/lib/production";
import { getAuthUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const RPC_URL = (process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim();
const TOKEN_ADDRESS = (
  process.env.BLINK_TOKEN_ADDRESS ||
  process.env.NEXT_PUBLIC_BLINK_TOKEN_CONTRACT ||
  "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B"
).trim();
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    try {
      // Optional dep: avoid static type resolution when bcryptjs isn't installed.
      const mod = "bcryptjs";
      const bcrypt: any = await import(/* webpackIgnore: true */ mod).catch(() => null);
      if (bcrypt && typeof bcrypt.compare === "function") {
        return await bcrypt.compare(password, hash);
      }
      return false;
    } catch {
      return false;
    }
  }
  const sha = createHash("sha256").update(password).digest("hex");
  return sha === hash.toLowerCase();
}

export async function POST(req: NextRequest) {
  let profileId: string | null = null;
  let claimCode = "";
  let ethAddress = "";
  let tokens = 0;
  let points = 0;

  try {
    const body = await req.json().catch(() => null);
    claimCode = (body?.claim_code || "").toString().trim().toUpperCase();
    const password: string = (body?.password || "").toString();
    ethAddress = (body?.eth_address || "").toString().trim();

    if (!ethAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isValidAddress(ethAddress)) {
      return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
    }

    // Two ways in: a logged-in web session (Authorization bearer), or the
    // legacy claim-code + password pair issued by the iOS app. Both resolve
    // to the same profile row and share the transfer/ledger logic below.
    let profile:
      | { id: string; claimable_points: number | null; claim_password_hash?: string | null; total_claimed_tokens: number | null }
      | null = null;

    if (claimCode && password) {
      const { data, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("id, claimable_points, claim_password_hash, total_claimed_tokens")
        .eq("claim_code", claimCode)
        .maybeSingle();

      if (profErr || !data) {
        return NextResponse.json({ error: "Invalid code or password" }, { status: 401 });
      }

      const ok = await verifyPassword(password, data.claim_password_hash || "");
      if (!ok) {
        return NextResponse.json({ error: "Invalid code or password" }, { status: 401 });
      }
      profile = data;
    } else {
      const authUser = await getAuthUser(req);
      if (!authUser) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const { data, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("id, claimable_points, total_claimed_tokens")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profErr || !data) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      profile = data;
    }

    profileId = profile.id;
    points = Number(profile.claimable_points || 0);

    if (points < 1000) {
      return NextResponse.json(
        { error: "Minimum 1,000 points required to claim" },
        { status: 400 }
      );
    }

    // Double-claim guard: same eth address sent within last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("claim_ledger")
      .select("id")
      .eq("eth_address", ethAddress)
      .eq("status", "sent")
      .gte("created_at", since)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { error: "This address already claimed within the last 24 hours" },
        { status: 429 }
      );
    }

    tokens = Math.floor(points / 1000);

    if (!DEPLOYER_KEY) {
      throw new Error("Deployer key not configured");
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
    const contract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);

    const amount = ethers.parseUnits(tokens.toString(), 18);
    const tx = await contract.transfer(ethAddress, amount);
    const receipt = await tx.wait();
    const txHash: string = tx.hash;

    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction reverted");
    }

    const newTotal = Number(profile.total_claimed_tokens || 0) + tokens;
    await supabaseAdmin
      .from("profiles")
      .update({
        claimable_points: 0,
        total_claimed_tokens: newTotal,
        last_claim_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    await supabaseAdmin.from("claim_ledger").insert({
      profile_id: profileId,
      claim_code: claimCode,
      points_redeemed: points,
      tokens_sent: tokens,
      eth_address: ethAddress,
      tx_hash: txHash,
      status: "sent",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      tokens_sent: tokens,
      eth_address: ethAddress,
    });
  } catch (e: any) {
    const message = e?.shortMessage || e?.message || "Claim failed";
    if (profileId && tokens > 0) {
      await supabaseAdmin
        .from("claim_ledger")
        .insert({
          profile_id: profileId,
          claim_code: claimCode,
          points_redeemed: points,
          tokens_sent: tokens,
          eth_address: ethAddress,
          status: "failed",
        })
        .then(() => {}, () => {});
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
