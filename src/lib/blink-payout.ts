// ════════════════════════════════════════════════════════════════════════════
// BlinkPayoutVault client — SERVER ONLY.
//
// Sends $BLINK to approved airdrop registrations via the BlinkPayoutVault
// contract (payout-vault/ in the blink-token repo). The operator hot key can
// ONLY call payout(), bounded on-chain by a daily cap, a per-tx cap, a pause
// flag and one-payout-per-ref idempotency (ref = keccak of the registration
// row id — the chain itself rejects double-sends).
//
// Env (server-only — NEVER in client bundles):
//   CLAIM_PAYOUT_OPERATOR_KEY    hot operator private key (0x…)
//   CLAIM_PAYOUT_VAULT_ADDRESS   deployed BlinkPayoutVault address
//   CLAIM_PAYOUT_RATIO           BLINK tokens per Blink point (default 1)
//   CLAIM_PAYOUT_MAX_TOKENS      per-player sanity cap in whole BLINK (default 1,000,000)
//   CLAIM_PAYOUT_RPC_URL         optional RPC override (falls back to ETH_RPC_URL)
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  keccak256,
  parseGwei,
  parseUnits,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

export const VAULT_ABI = [
  {
    type: "function",
    name: "payout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "ref", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "paidRefs",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "poolBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "remainingToday",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function rpcUrl(): string {
  return (
    process.env.CLAIM_PAYOUT_RPC_URL ||
    process.env.ETH_RPC_URL ||
    "https://ethereum-rpc.publicnode.com"
  );
}

export function payoutConfig() {
  const key = process.env.CLAIM_PAYOUT_OPERATOR_KEY || "";
  const vault = process.env.CLAIM_PAYOUT_VAULT_ADDRESS || "";
  const ratio = Number(process.env.CLAIM_PAYOUT_RATIO || "1");
  const maxTokens = Number(process.env.CLAIM_PAYOUT_MAX_TOKENS || "1000000");
  const configured =
    /^0x[0-9a-fA-F]{64}$/.test(key) &&
    /^0x[0-9a-fA-F]{40}$/.test(vault) &&
    Number.isFinite(ratio) &&
    ratio > 0 &&
    Number.isFinite(maxTokens) &&
    maxTokens > 0;
  return { configured, vault: vault as Address, ratio, maxTokens };
}

/// Deterministic on-chain idempotency key for ONE payout of a registration.
/// `seq` is the number of payouts already confirmed for the player (the
/// airdrop_payouts history count): each incremental payout gets its own ref,
/// so repeat payouts are possible while the vault still rejects any replay of
/// the SAME payout. seq 0 keeps the legacy pre-history format — refs already
/// consumed on-chain stay recognizable to the recovery check.
export function payoutRef(registrationId: string, seq = 0): Hex {
  const key =
    seq === 0
      ? `blinkworld-airdrop:${registrationId}`
      : `blinkworld-airdrop:${registrationId}:${seq}`;
  return keccak256(toBytes(key));
}

/// Blink points → BLINK wei (18 dec) at the configured ratio.
/// Throws if the result is zero or exceeds the sanity cap.
export function computePayoutWei(basis: number, ratio: number, maxTokens: number): bigint {
  if (!Number.isFinite(basis) || basis <= 0) {
    throw new Error("Registration has no positive airdrop basis.");
  }
  const tokens = basis * ratio;
  if (tokens > maxTokens) {
    throw new Error(
      `Payout of ${tokens.toLocaleString()} BLINK exceeds the ${maxTokens.toLocaleString()} BLINK per-player sanity cap.`,
    );
  }
  // toFixed(6) keeps parseUnits happy if ratio introduces float dust
  const wei = parseUnits(tokens.toFixed(6), 18);
  if (wei <= 0n) throw new Error("Computed payout amount is zero.");
  return wei;
}

/// Inverse of computePayoutWei: a recorded on-chain amount (wei) → the basis
/// delta it covered at the given ratio. Used to finalize a payout whose
/// confirmation was lost (crash between send and history insert).
export function basisFromWei(amountWei: string, ratio: number): number {
  return Number(formatUnits(BigInt(amountWei), 18)) / ratio;
}

export function getPublicClient() {
  return createPublicClient({ chain: mainnet, transport: http(rpcUrl()) });
}

function getOperatorClient() {
  const account = privateKeyToAccount(process.env.CLAIM_PAYOUT_OPERATOR_KEY as Hex);
  return createWalletClient({ account, chain: mainnet, transport: http(rpcUrl()) });
}

/// True if this ref was already paid on-chain (recovers rows that were sent
/// but whose confirmation was lost, e.g. server restart mid-payout).
export async function isRefPaid(vault: Address, ref: Hex): Promise<boolean> {
  return getPublicClient().readContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: "paidRefs",
    args: [ref],
  });
}

/// Simulates then submits payout(to, amount, ref). Returns the tx hash.
/// Simulation surfaces vault reverts (cap exceeded, paused, ref already paid)
/// as readable errors BEFORE any gas is spent.
export async function sendPayout(
  vault: Address,
  to: Address,
  amountWei: bigint,
  ref: Hex,
): Promise<Hex> {
  const wallet = getOperatorClient();
  const pub = getPublicClient();
  const { request } = await pub.simulateContract({
    account: wallet.account,
    address: vault,
    abi: VAULT_ABI,
    functionName: "payout",
    args: [to, amountWei, ref],
  });
  // Fee headroom: 2× the current estimate (min 0.1 gwei priority) so the tx
  // survives base-fee ticks instead of getting dropped from the mempool.
  // At sub-gwei gas this costs fractions of a cent.
  const fees = await pub.estimateFeesPerGas();
  const floor = parseGwei("0.1");
  const maxPriorityFeePerGas =
    fees.maxPriorityFeePerGas && fees.maxPriorityFeePerGas * 2n > floor
      ? fees.maxPriorityFeePerGas * 2n
      : floor;
  const maxFeePerGas =
    fees.maxFeePerGas && fees.maxFeePerGas * 2n > maxPriorityFeePerGas
      ? fees.maxFeePerGas * 2n
      : maxPriorityFeePerGas * 2n;
  return wallet.writeContract({ ...request, maxFeePerGas, maxPriorityFeePerGas });
}

/// True if the network still knows this tx (mempool or mined). False = dropped.
export async function isTxKnown(hash: Hex): Promise<boolean> {
  try {
    const tx = await getPublicClient().getTransaction({ hash });
    return tx !== null;
  } catch {
    return false;
  }
}

export async function waitForPayout(hash: Hex) {
  return getPublicClient().waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 150_000,
  });
}

/// Error → short human string, guaranteed free of key material.
export function payoutErrorMessage(e: unknown): string {
  const raw =
    (e as any)?.shortMessage || (e as any)?.message || (typeof e === "string" ? e : "Unknown error");
  const s = String(raw);

  // Decode common vault / ERC-20 reverts into admin-friendly copy
  // 0xe450d38c = ERC20InsufficientBalance(address,uint256,uint256) — vault out of BLINK
  if (
    /0xe450d38c|0xe450558c|ERC20InsufficientBalance|transfer amount exceeds balance|insufficient balance/i.test(
      s,
    )
  ) {
    return (
      "Vault does not hold enough $BLINK for this payout. " +
      "Transfer more BLINK into the BlinkPayoutVault, then Retry send."
    );
  }
  if (/0xd98ff382|RefAlreadyPaid/i.test(s)) {
    return "This payout was already recorded on-chain (ref already paid). Refresh the admin list.";
  }
  if (/0x97d3a5c0|ExceedsDailyCap/i.test(s)) {
    return "Daily payout cap reached on the vault. Raise dailyCap or wait until next UTC day.";
  }
  if (/0x84ade258|ExceedsMaxPerPayout/i.test(s)) {
    return "Payout exceeds maxPerPayout on the vault. Raise the per-tx cap or split the amount.";
  }
  if (/0x9e87fac8|Paused\(\)|execution reverted: Paused/i.test(s)) {
    return "Payout vault is paused. Owner must unpause before sending.";
  }
  if (/0x7c214f04|NotOperator/i.test(s)) {
    return "Operator key is not authorized on the vault. Check CLAIM_PAYOUT_OPERATOR_KEY matches vault.operator().";
  }

  return s.replace(/0x[0-9a-fA-F]{64,}/g, "0x…").slice(0, 300);
}
