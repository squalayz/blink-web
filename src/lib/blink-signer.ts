// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5 — Voucher signer (server-only)
//
// Signs EIP-712 vouchers for the two deployed mainnet contracts:
//   - BlinkRewards: minted-on-claim $BLINK for catching creatures
//   - BlinkDrops:   geo-escrow ETH/ERC20/NFT drops
//
// The signer private key is loaded from BLINK_SIGNER_PRIVATE_KEY at runtime.
// Never commit the key. Never log the key. Never expose this module to the
// browser — the "server-only" import will hard-fail any client bundle.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { privateKeyToAccount } from "viem/accounts";

const CHAIN_ID = 1; // Ethereum mainnet

function getAccount() {
  const pk = process.env.BLINK_SIGNER_PRIVATE_KEY;
  if (!pk) throw new Error("BLINK_SIGNER_PRIVATE_KEY missing");
  return privateKeyToAccount(pk as `0x${string}`);
}

function randomNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}` as `0x${string}`;
}

export interface SignedRewardVoucher {
  signature: `0x${string}`;
  nonce: `0x${string}`;
  deadline: number;
  amount: string;
  ref: `0x${string}`;
}

export async function signRewardVoucher(
  player: `0x${string}`,
  amountWei: bigint,
  ref: `0x${string}`,
  ttlSeconds = 600,
): Promise<SignedRewardVoucher> {
  const account = getAccount();
  const rewardsAddress = process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT;
  if (!rewardsAddress) throw new Error("NEXT_PUBLIC_BLINK_REWARDS_CONTRACT missing");

  const nonce = randomNonce();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + ttlSeconds);

  const signature = await account.signTypedData({
    domain: {
      name: "BlinkRewards",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: rewardsAddress as `0x${string}`,
    },
    types: {
      Voucher: [
        { name: "player",   type: "address" },
        { name: "amount",   type: "uint256" },
        { name: "nonce",    type: "bytes32" },
        { name: "deadline", type: "uint256" },
        { name: "ref",      type: "bytes32" },
      ],
    },
    primaryType: "Voucher",
    message: { player, amount: amountWei, nonce, deadline, ref },
  });

  return {
    signature,
    nonce,
    deadline: Number(deadline),
    amount: amountWei.toString(),
    ref,
  };
}

export interface SignedCatchVoucher {
  signature: `0x${string}`;
  nonce: `0x${string}`;
  deadline: number;
  dropId: string;
}

export async function signCatchVoucher(
  dropId: bigint,
  catcher: `0x${string}`,
  ttlSeconds = 300,
): Promise<SignedCatchVoucher> {
  const account = getAccount();
  const dropsAddress = process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT;
  if (!dropsAddress) throw new Error("NEXT_PUBLIC_BLINK_DROPS_CONTRACT missing");

  const nonce = randomNonce();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + ttlSeconds);

  const signature = await account.signTypedData({
    domain: {
      name: "BlinkDrops",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: dropsAddress as `0x${string}`,
    },
    types: {
      CatchVoucher: [
        { name: "dropId",   type: "uint256" },
        { name: "catcher",  type: "address" },
        { name: "deadline", type: "uint256" },
        { name: "nonce",    type: "bytes32" },
      ],
    },
    primaryType: "CatchVoucher",
    message: { dropId, catcher, deadline, nonce },
  });

  return {
    signature,
    nonce,
    deadline: Number(deadline),
    dropId: dropId.toString(),
  };
}
