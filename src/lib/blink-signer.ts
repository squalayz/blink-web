// ════════════════════════════════════════════════════════════════════════════
// BLINK — EIP-712 voucher signer (server-only)
//
// Signs Voucher messages for the BlinkRewards contract (mainnet). Restored
// from the Phase 5 implementation and extended so a pending voucher can be
// re-signed with its original nonce/deadline — the contract's nonce
// uniqueness makes re-issued vouchers single-use as a set.
//
// The signer private key is loaded from BLINK_SIGNER_PRIVATE_KEY at runtime.
// Never commit the key. Never log the key. Never expose this module to the
// browser — the "server-only" import will hard-fail any client bundle.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { privateKeyToAccount } from "viem/accounts";

const CHAIN_ID = 1; // Ethereum mainnet

export function voucherConfigured(): boolean {
  return Boolean(
    process.env.BLINK_SIGNER_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT,
  );
}

export function rewardsContractAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT;
  if (!addr) throw new Error("NEXT_PUBLIC_BLINK_REWARDS_CONTRACT missing");
  return addr as `0x${string}`;
}

function getAccount() {
  const pk = process.env.BLINK_SIGNER_PRIVATE_KEY;
  if (!pk) throw new Error("BLINK_SIGNER_PRIVATE_KEY missing");
  return privateKeyToAccount(pk as `0x${string}`);
}

export function randomNonce(): `0x${string}` {
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
  opts?: { nonce?: `0x${string}`; deadline?: number; ttlSeconds?: number },
): Promise<SignedRewardVoucher> {
  const account = getAccount();
  const rewardsAddress = rewardsContractAddress();

  const nonce = opts?.nonce ?? randomNonce();
  const deadline = BigInt(
    opts?.deadline ?? Math.floor(Date.now() / 1000) + (opts?.ttlSeconds ?? 1800),
  );

  const signature = await account.signTypedData({
    domain: {
      name: "BlinkRewards",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: rewardsAddress,
    },
    types: {
      Voucher: [
        { name: "player", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "deadline", type: "uint256" },
        { name: "ref", type: "bytes32" },
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
