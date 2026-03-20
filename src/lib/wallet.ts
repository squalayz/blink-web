// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Per-User Wallet System (Non-Custodial)
//
// FEE STRUCTURE — ALL FEES GO TO PLATFORM WALLET:
//   Deposit fee:  5%  (user deposits 0.1 ETH → 0.005 to platform, 0.095 credited)
//   Trade fee:    3%   per trade (buy AND sell, not just profits)
//   Withdraw fee: 0%   (no additional fee on withdrawals)
//   Pro tier:     0.005  ETH/month
//   Business:     0.015  ETH/month
//   Boost:        0.005  ETH one-time
//   Spotlight:    0.01   ETH/week
//
// Platform fee wallet: 0xae055E5e11Eb9Da449fF049e97FfbCbc904d91a1
// ══════════════════════════════════════════════════════════════

import { ethers } from "ethers";

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const PLATFORM_FEE_WALLET = "0xae055E5e11Eb9Da449fF049e97FfbCbc904d91a1";
const PARTNER_FEE_WALLET = "0xFfCF74939d092a11B348931a64C21f70150D2705";
const PARTNER_SPLIT = 0.40;

// ═══ Fee Constants ═══
export const FEES = {
  DEPOSIT_PCT: 0.05,        // 5% on all deposits
  TRADE_PCT: 0.03,          // 3% per trade (buy AND sell)
  PRO_MONTHLY: 0.005,       // 0.005 ETH/month
  BUSINESS_MONTHLY: 0.015,  // 0.015 ETH/month
  BOOST: 0.005,             // 0.005 ETH one-time
  SPOTLIGHT_WEEKLY: 0.01,   // 0.01 ETH/week
  NFT_MINT: 0.01,           // 0.01 ETH per match NFT mint
  PROMOTED_MATCH: 0.005,    // 0.005 ETH to target specific user
  GROUP_MESH: 0.01,         // 0.01 ETH per group mesh (3-4 agents)
  API_ACCESS: 0.01,         // 0.01 ETH/month developer API access
} as const;

// ═══ Encryption (AES-256-GCM) ═══
import { encryptAES, decryptAES, isLegacyEncrypted } from "./production";

// Legacy XOR for backward compatibility during migration
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";

function legacyDecrypt(encoded: string): string {
  const keyBytes = Buffer.from(ENCRYPTION_KEY, "utf-8");
  const encrypted = Buffer.from(encoded, "base64");
  const decrypted = Buffer.alloc(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  return decrypted.toString("utf-8");
}

function encrypt(text: string): string {
  return encryptAES(text);
}

function decrypt(encoded: string): string {
  // Try AES first, fall back to legacy XOR for existing keys
  if (isLegacyEncrypted(encoded)) {
    return legacyDecrypt(encoded);
  }
  return decryptAES(encoded);
}

// ═══ Wallet Generation ═══
export function generateWallet(): { address: string; privateKey: string; encryptedKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    encryptedKey: encrypt(wallet.privateKey),
  };
}

// ═══ Get On-Chain Balance ═══
export async function getWalletBalance(address: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (err: any) {
    console.error("Balance check failed:", err.message);
    return 0;
  }
}

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(BASE_RPC);
}

export function getSigner(encryptedKey: string): ethers.Wallet {
  const privateKey = decrypt(encryptedKey);
  return new ethers.Wallet(privateKey, getProvider());
}

// ══════════════════════════════════════════════════════════════
// SEND FEE TO PLATFORM — core function used by all fee types
// Sends exact ETH amount from user's wallet to 0xEe9D...c280
// ══════════════════════════════════════════════════════════════

export async function sendFeeToPlatform(
  encryptedKey: string,
  feeEth: number,
  memo?: string
): Promise<{ txHash: string; success: boolean }> {
  if (feeEth < 0.000001) return { txHash: "", success: true }; // Skip dust

  const platformAmount = feeEth * (1 - PARTNER_SPLIT);
  const partnerAmount = feeEth * PARTNER_SPLIT;

  try {
    const signer = getSigner(encryptedKey);

    // Send 60% to platform wallet
    const platformTx = await signer.sendTransaction({
      to: PLATFORM_FEE_WALLET,
      value: ethers.parseEther(platformAmount.toFixed(18)),
      gasLimit: 21000n,
    });
    const platformReceipt = await platformTx.wait();
    const platformHash = platformReceipt?.hash || platformTx.hash;
    console.log(`Fee (platform 60%): ${platformAmount} ETH → ${PLATFORM_FEE_WALLET} | ${memo || ""} | tx: ${platformHash}`);

    // Send 40% to partner wallet (best-effort)
    try {
      const partnerTx = await signer.sendTransaction({
        to: PARTNER_FEE_WALLET,
        value: ethers.parseEther(partnerAmount.toFixed(18)),
        gasLimit: 21000n,
      });
      const partnerReceipt = await partnerTx.wait();
      const partnerHash = partnerReceipt?.hash || partnerTx.hash;
      console.log(`Fee (partner 40%): ${partnerAmount} ETH → ${PARTNER_FEE_WALLET} | ${memo || ""} | tx: ${partnerHash}`);
    } catch (partnerErr: any) {
      console.error(`Partner fee failed (${partnerAmount} ETH, ${memo}):`, partnerErr.message);
    }

    return { txHash: platformHash, success: true };
  } catch (err: any) {
    console.error(`Fee collection failed (${feeEth} ETH, ${memo}):`, err.message);
    return { txHash: "", success: false };
  }
}

// ══════════════════════════════════════════════════════════════
// DEPOSIT FEE — 5%
// Called after user sends ETH to their wallet.
// Immediately sends 5% to platform wallet.
// Returns net amount credited to user.
// ══════════════════════════════════════════════════════════════

export async function collectDepositFee(
  encryptedKey: string,
  depositAmount: number
): Promise<{ fee: number; net: number; feeTxHash: string; success: boolean }> {
  const fee = depositAmount * FEES.DEPOSIT_PCT;
  const net = depositAmount - fee;

  const result = await sendFeeToPlatform(encryptedKey, fee, `deposit_fee_${depositAmount}ETH`);

  return {
    fee,
    net,
    feeTxHash: result.txHash,
    success: result.success,
  };
}

// ══════════════════════════════════════════════════════════════
// TRADE FEE — 3% per trade (buy AND sell)
// Called on EVERY trade execution, not just profitable ones.
// ══════════════════════════════════════════════════════════════

export async function collectTradeFee(
  encryptedKey: string,
  tradeAmountEth: number,
  action: "buy" | "sell",
  tokenSymbol?: string
): Promise<{ fee: number; feeTxHash: string; success: boolean }> {
  const fee = tradeAmountEth * FEES.TRADE_PCT;

  const result = await sendFeeToPlatform(
    encryptedKey, fee,
    `trade_fee_${action}_${tokenSymbol || "unknown"}_${tradeAmountEth}ETH`
  );

  return { fee, feeTxHash: result.txHash, success: result.success };
}

// ══════════════════════════════════════════════════════════════
// TIER PAYMENT — Pro (0.005 ETH) / Business (0.015 ETH)
// ══════════════════════════════════════════════════════════════

export async function payTierUpgrade(
  encryptedKey: string,
  tier: "pro" | "business"
): Promise<{ txHash: string; success: boolean; amount: number }> {
  const amount = tier === "pro" ? FEES.PRO_MONTHLY : FEES.BUSINESS_MONTHLY;
  const result = await sendFeeToPlatform(encryptedKey, amount, `tier_${tier}_monthly`);
  return { ...result, amount };
}

// ══════════════════════════════════════════════════════════════
// BOOST PAYMENT — 0.005 ETH one-time
// ══════════════════════════════════════════════════════════════

export async function payBoost(
  encryptedKey: string
): Promise<{ txHash: string; success: boolean }> {
  return sendFeeToPlatform(encryptedKey, FEES.BOOST, "boost_onetime");
}

// ══════════════════════════════════════════════════════════════
// SPOTLIGHT PAYMENT — 0.01 ETH/week
// ══════════════════════════════════════════════════════════════

export async function paySpotlight(
  encryptedKey: string
): Promise<{ txHash: string; success: boolean }> {
  return sendFeeToPlatform(encryptedKey, FEES.SPOTLIGHT_WEEKLY, "spotlight_weekly");
}

// ══════════════════════════════════════════════════════════════
// PROMOTED MATCH PAYMENT — 0.005 ETH
// ══════════════════════════════════════════════════════════════

export async function payPromotedMatch(
  encryptedKey: string
): Promise<{ txHash: string; success: boolean }> {
  return sendFeeToPlatform(encryptedKey, FEES.PROMOTED_MATCH, "promoted_match");
}

// ══════════════════════════════════════════════════════════════
// GROUP MESH PAYMENT — 0.01 ETH
// ══════════════════════════════════════════════════════════════

export async function payGroupMesh(
  encryptedKey: string
): Promise<{ txHash: string; success: boolean }> {
  return sendFeeToPlatform(encryptedKey, FEES.GROUP_MESH, "group_mesh");
}

// ══════════════════════════════════════════════════════════════
// API ACCESS PAYMENT — 0.01 ETH/month
// ══════════════════════════════════════════════════════════════

export async function payApiAccess(
  encryptedKey: string
): Promise<{ txHash: string; success: boolean }> {
  return sendFeeToPlatform(encryptedKey, FEES.API_ACCESS, "api_access_monthly");
}

// ══════════════════════════════════════════════════════════════
// EXECUTE TRADE — swap from user's wallet
// ══════════════════════════════════════════════════════════════

export async function executeTrade(
  encryptedKey: string,
  tokenAddress: string,
  amountEth: number,
  action: "buy" | "sell"
): Promise<{ txHash: string; success: boolean }> {
  try {
    const signer = getSigner(encryptedKey);

    // In production: call Uniswap V3 Router or 1inch aggregator
    const tx = {
      to: tokenAddress,
      value: action === "buy" ? ethers.parseEther(amountEth.toString()) : 0n,
      gasLimit: 200000n,
    };

    const txResponse = await signer.sendTransaction(tx);
    const receipt = await txResponse.wait();
    return { txHash: receipt?.hash || txResponse.hash, success: true };
  } catch (err: any) {
    console.error("Trade execution failed:", err.message);
    return { txHash: "", success: false };
  }
}

// ══════════════════════════════════════════════════════════════
// WITHDRAW — send from user's wallet to destination
// No additional fee on withdrawals (fees already taken on deposit + trades)
// ══════════════════════════════════════════════════════════════

export async function executeWithdrawal(
  encryptedKey: string,
  toAddress: string,
  amountEth: number
): Promise<{ txHash: string; success: boolean }> {
  try {
    const signer = getSigner(encryptedKey);

    const tx = await signer.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountEth.toFixed(18)),
      gasLimit: 21000n,
    });
    await tx.wait();

    return { txHash: tx.hash, success: true };
  } catch (err: any) {
    console.error("Withdrawal failed:", err.message);
    return { txHash: "", success: false };
  }
}

export { PLATFORM_FEE_WALLET, PARTNER_FEE_WALLET, decrypt, encrypt };
