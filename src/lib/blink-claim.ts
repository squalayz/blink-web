// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5 — Client-side claim helpers
//
// Thin wrappers around wagmi/core writeContract for the two voucher flows:
//   - claimReward(): BlinkRewards.claim(amount, nonce, deadline, ref, sig)
//   - catchDrop():   BlinkDrops.catch(dropId, deadline, nonce, sig) (payable)
//
// The browser only ever sees the signed voucher returned by the server.
// Never receives the signer private key.
// ════════════════════════════════════════════════════════════════════════════

import { writeContract } from "@wagmi/core";
import { wagmiConfig } from "./wagmi-config";

const REWARDS_ABI = [
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "ref", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const DROPS_ABI = [
  {
    name: "catch",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "dropId", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export interface RewardVoucher {
  rewardsContract: `0x${string}`;
  amount: string;
  nonce: `0x${string}`;
  deadline: number;
  ref: `0x${string}`;
  signature: `0x${string}`;
}

export async function claimReward(voucher: RewardVoucher) {
  return writeContract(wagmiConfig, {
    address: voucher.rewardsContract,
    abi: REWARDS_ABI,
    functionName: "claim",
    args: [
      BigInt(voucher.amount),
      voucher.nonce,
      BigInt(voucher.deadline),
      voucher.ref,
      voucher.signature,
    ],
  });
}

export interface CatchVoucher {
  dropsContract: `0x${string}`;
  dropId: string;
  nonce: `0x${string}`;
  deadline: number;
  signature: `0x${string}`;
  catchPrice: string;
}

export async function catchDrop(voucher: CatchVoucher) {
  return writeContract(wagmiConfig, {
    address: voucher.dropsContract,
    abi: DROPS_ABI,
    functionName: "catch",
    args: [
      BigInt(voucher.dropId),
      BigInt(voucher.deadline),
      voucher.nonce,
      voucher.signature,
    ],
    value: BigInt(voucher.catchPrice),
  });
}
