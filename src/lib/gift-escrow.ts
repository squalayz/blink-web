// ════════════════════════════════════════════════════════════════════════════
// BLINK Spirit Gifts — escrow + claim logic (server-only)
//
// Design notes:
//
//   - SENDER asset custody never leaves the sender's encrypted custodial wallet
//     until the moment of CLAIM. On gift creation we lock the asset off-chain
//     (status='pending' row + amount tracked in gift.asset_payload). At claim
//     time we decrypt the sender's private key in-memory, sign the transfer
//     direct to the RECIPIENT, broadcast.
//
//   - This avoids needing a separate funded "escrow wallet" with its own gas
//     budget. Refunds-on-expiry are a no-op on-chain — we just flip the gift
//     to 'refunded' and the asset is already where it started.
//
//   - For NFTs the same pattern: server-signed transferFrom(sender -> recipient)
//     at claim time, executed by the sender's own custodial wallet. Sender
//     remains the on-chain owner during the gift's pending window. If the
//     sender moves the NFT elsewhere before claim, the claim transfer will
//     revert and we mark the gift 'failed'.
//
// Trade-off vs full escrow:
//
//   + Simpler, no extra wallet to fund with gas
//   + Refunds are free
//   - Sender could grief by moving the asset after gift creation (claim fails,
//     recipient sees "this gift has been clawed back"). Acceptable for v1.
//
// The brief said: PICK WHICHEVER YOU JUDGE MORE SECURE. We picked the in-place
// custody pattern because it minimises moving parts, eliminates a hot wallet
// with broad permissions, and matches how /api/wallet/send already works.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { ethers } from "ethers";
import { decryptAES } from "@/lib/production";
import { supabaseAdmin } from "@/lib/supabase-admin";

const RPC_URL = (process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim();

export const BLINK_TOKEN_CONTRACT = "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B";

// Full 20-byte BLINK NFT contract addresses. Sourced from env where set so the
// allow-list stays in lockstep with the rest of the app (wallet-nfts.ts uses
// the same vars). Hard-coded canonical fallbacks keep server-side checks safe
// even if env vars are missing.
export const BLINK_GENESIS_NFT = (
  process.env.NEXT_PUBLIC_BLINK_GENESIS_CONTRACT ||
  "0x85e7CB56fA10f26fEAe20449e71AD1503867799A"
).toLowerCase();
export const MYTHICS_NFT = (
  process.env.NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT ||
  "0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592"
).toLowerCase();

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
];

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export interface SenderWallet {
  address: string;
  privateKey: string;
}

async function loadSenderWallet(userId: string): Promise<SenderWallet | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("eth_address, eth_encrypted_key")
    .eq("id", userId)
    .single();
  if (!profile?.eth_address || !profile?.eth_encrypted_key) return null;
  const raw = decryptAES(profile.eth_encrypted_key);
  return {
    address: profile.eth_address,
    privateKey: raw.startsWith("0x") ? raw : `0x${raw}`,
  };
}

export async function loadRecipientAddress(userId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("eth_address")
    .eq("id", userId)
    .single();
  return profile?.eth_address ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ownership / balance pre-checks at gift creation time.
// We do NOT move any asset here. The sender retains custody. We just verify
// they actually hold what they're claiming to gift.
// ─────────────────────────────────────────────────────────────────────────────

export async function validateETHGift(
  senderId: string,
  amountEth: number
): Promise<{ ok: boolean; error?: string }> {
  if (!isFinite(amountEth) || amountEth <= 0 || amountEth > 100) {
    return { ok: false, error: "Invalid ETH amount" };
  }
  const wallet = await loadSenderWallet(senderId);
  if (!wallet) return { ok: false, error: "No ETH wallet on sender account" };

  const provider = getProvider();
  const [balance, feeData] = await Promise.all([
    provider.getBalance(wallet.address),
    provider.getFeeData(),
  ]);
  const gasLimit = 21_000n;
  const maxFee = feeData.maxFeePerGas ?? ethers.parseUnits("50", "gwei");
  const estimatedGas = maxFee * gasLimit;
  const needWei = ethers.parseEther(amountEth.toString()) + estimatedGas;
  if (balance < needWei) {
    return {
      ok: false,
      error: `Insufficient ETH. Need ~${ethers.formatEther(needWei)} ETH including gas.`,
    };
  }
  return { ok: true };
}

export async function validateBlinkGift(
  senderId: string,
  amountTokens: number
): Promise<{ ok: boolean; error?: string }> {
  if (!isFinite(amountTokens) || amountTokens <= 0) {
    return { ok: false, error: "Invalid BLINK amount" };
  }
  const wallet = await loadSenderWallet(senderId);
  if (!wallet) return { ok: false, error: "No ETH wallet on sender account" };

  const provider = getProvider();
  const erc20 = new ethers.Contract(BLINK_TOKEN_CONTRACT, ERC20_ABI, provider);
  let decimals = 18;
  try {
    decimals = Number(await erc20.decimals());
  } catch {}
  const balance: bigint = await erc20.balanceOf(wallet.address);
  const need = ethers.parseUnits(amountTokens.toString(), decimals);
  if (balance < need) {
    return { ok: false, error: "Insufficient BLINK balance" };
  }
  // Sender also needs some ETH for gas on claim — sanity check.
  const ethBal = await provider.getBalance(wallet.address);
  if (ethBal < ethers.parseEther("0.0008")) {
    return { ok: false, error: "Sender needs at least ~0.0008 ETH for claim gas" };
  }
  return { ok: true };
}

export async function validateNFTGift(
  senderId: string,
  contract: string,
  tokenId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!ethers.isAddress(contract)) return { ok: false, error: "Bad NFT contract" };
  const lower = contract.toLowerCase();
  const isWhitelisted =
    lower === BLINK_GENESIS_NFT || lower === MYTHICS_NFT;
  if (!isWhitelisted) {
    return { ok: false, error: "Only BLINK Genesis or Mythics NFTs supported in v1" };
  }
  const wallet = await loadSenderWallet(senderId);
  if (!wallet) return { ok: false, error: "No ETH wallet on sender account" };

  const provider = getProvider();
  const nft = new ethers.Contract(contract, ERC721_ABI, provider);
  let owner = "";
  try {
    owner = (await nft.ownerOf(tokenId)).toLowerCase();
  } catch {
    return { ok: false, error: "NFT not found or invalid tokenId" };
  }
  if (owner !== wallet.address.toLowerCase()) {
    return { ok: false, error: "Sender does not own this NFT" };
  }
  const ethBal = await provider.getBalance(wallet.address);
  if (ethBal < ethers.parseEther("0.002")) {
    return { ok: false, error: "Sender needs ~0.002 ETH for NFT transfer gas" };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Claim execution — moves the asset from sender's wallet to recipient's wallet.
// ─────────────────────────────────────────────────────────────────────────────

export async function executeETHClaim(
  senderId: string,
  recipientAddr: string,
  amountEth: number
): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  try {
    const wallet = await loadSenderWallet(senderId);
    if (!wallet) return { ok: false, error: "Sender wallet not found" };
    if (!ethers.isAddress(recipientAddr)) return { ok: false, error: "Bad recipient" };

    const provider = getProvider();
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const value = ethers.parseEther(amountEth.toString());

    const [balance, feeData, nonce, network] = await Promise.all([
      provider.getBalance(signer.address),
      provider.getFeeData(),
      provider.getTransactionCount(signer.address, "pending"),
      provider.getNetwork(),
    ]);
    if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
      return { ok: false, error: "Network does not support EIP-1559 fees" };
    }
    const gasLimit = 21_000n;
    const estimatedFee = feeData.maxFeePerGas * gasLimit;
    if (balance < value + estimatedFee) {
      return { ok: false, error: "Sender no longer has enough ETH (clawback)" };
    }

    const tx = await signer.sendTransaction({
      to: recipientAddr,
      value,
      gasLimit,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      nonce,
      chainId: network.chainId,
      type: 2,
    });
    const receipt = await tx.wait(1);
    if (!receipt || receipt.status !== 1) {
      return { ok: false, error: "ETH transfer reverted on-chain", txHash: tx.hash };
    }
    return { ok: true, txHash: tx.hash };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "ETH claim failed" };
  }
}

export async function executeBlinkClaim(
  senderId: string,
  recipientAddr: string,
  amountTokens: number
): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  try {
    const wallet = await loadSenderWallet(senderId);
    if (!wallet) return { ok: false, error: "Sender wallet not found" };
    if (!ethers.isAddress(recipientAddr)) return { ok: false, error: "Bad recipient" };

    const provider = getProvider();
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const erc20 = new ethers.Contract(BLINK_TOKEN_CONTRACT, ERC20_ABI, signer);

    let decimals = 18;
    try {
      decimals = Number(await erc20.decimals());
    } catch {}
    const amountWei = ethers.parseUnits(amountTokens.toString(), decimals);

    const balance: bigint = await erc20.balanceOf(signer.address);
    if (balance < amountWei) {
      return { ok: false, error: "Sender no longer holds enough BLINK (clawback)" };
    }

    const nonce = await provider.getTransactionCount(signer.address, "pending");
    const tx = await erc20.transfer(recipientAddr, amountWei, { nonce });
    const receipt = await tx.wait(1);
    if (!receipt || receipt.status !== 1) {
      return { ok: false, error: "BLINK transfer reverted on-chain", txHash: tx.hash };
    }
    return { ok: true, txHash: tx.hash };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "BLINK claim failed" };
  }
}

export async function executeNFTClaim(
  senderId: string,
  recipientAddr: string,
  contract: string,
  tokenId: string
): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  try {
    const wallet = await loadSenderWallet(senderId);
    if (!wallet) return { ok: false, error: "Sender wallet not found" };
    if (!ethers.isAddress(recipientAddr)) return { ok: false, error: "Bad recipient" };
    if (!ethers.isAddress(contract)) return { ok: false, error: "Bad contract" };

    const provider = getProvider();
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const nft = new ethers.Contract(contract, ERC721_ABI, signer);

    const owner = (await nft.ownerOf(tokenId)).toLowerCase();
    if (owner !== signer.address.toLowerCase()) {
      return { ok: false, error: "Sender no longer holds this NFT (clawback)" };
    }

    const nonce = await provider.getTransactionCount(signer.address, "pending");
    const tx = await nft.safeTransferFrom(signer.address, recipientAddr, tokenId, { nonce });
    const receipt = await tx.wait(1);
    if (!receipt || receipt.status !== 1) {
      return { ok: false, error: "NFT transfer reverted on-chain", txHash: tx.hash };
    }
    return { ok: true, txHash: tx.hash };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "NFT claim failed" };
  }
}
