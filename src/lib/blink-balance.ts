// ════════════════════════════════════════════════════════════════════════════
// $BLINK holder checks — live balanceOf() reads against Ethereum mainnet.
//
// Players must HOLD $BLINK in their registered wallet to receive payouts.
// Used by:
//   - POST /api/claim/balance          (player-side eligibility warning)
//   - GET  /api/claim/admin/registrations (holder badge per row)
//   - POST /api/claim/admin/payout     (refuse zero-balance sends sans override)
//
// Public chain data only — no keys, no secrets (safe without "server-only",
// which also lets the tsx test script exercise it directly). Balances are
// cached in-memory for 60 s; pass { fresh: true } to force a live read
// (the payout guard does). RPC failures resolve to null — callers treat
// null as "couldn't verify" and NEVER block on it.
// ════════════════════════════════════════════════════════════════════════════

import { createPublicClient, formatUnits, http, type Address } from "viem";
import { mainnet } from "viem/chains";

export const BLINK_TOKEN: Address = "0xf1D3Fbe00aF8185add548E84d77075bc98f18cE0";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
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

function client() {
  return createPublicClient({ chain: mainnet, transport: http(rpcUrl(), { timeout: 10_000 }) });
}

// ── 60 s in-memory cache (per server instance) ──────────────────────────────

const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 5_000; // bound memory — the public route sees arbitrary addresses
const cache = new Map<string, { wei: bigint; at: number }>();

function cacheGet(addr: string): bigint | undefined {
  const hit = cache.get(addr);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(addr);
    return undefined;
  }
  return hit.wei;
}

function cacheSet(addr: string, wei: bigint) {
  if (cache.size >= CACHE_MAX) {
    // evict oldest-inserted entries (Map preserves insertion order)
    for (const key of cache.keys()) {
      cache.delete(key);
      if (cache.size < CACHE_MAX) break;
    }
  }
  cache.set(addr, { wei, at: Date.now() });
}

// ── Batch balanceOf via multicall3 ──────────────────────────────────────────

/// Live $BLINK balances for a set of addresses, keyed by LOWERCASE address.
/// Value is the balance in wei as a decimal string, or null if the read
/// failed (RPC down, bad response) — null means "unknown", never "zero".
export async function getBlinkBalances(
  addresses: string[],
  opts: { fresh?: boolean } = {},
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  const toFetch: string[] = [];

  for (const raw of addresses) {
    const addr = raw.toLowerCase();
    if (addr in result) continue;
    const cached = opts.fresh ? undefined : cacheGet(addr);
    if (cached !== undefined) {
      result[addr] = cached.toString();
    } else {
      result[addr] = null;
      toFetch.push(addr);
    }
  }
  if (toFetch.length === 0) return result;

  try {
    // multicall3 batches all reads into few eth_calls; viem auto-chunks.
    const reads = await client().multicall({
      contracts: toFetch.map((addr) => ({
        address: BLINK_TOKEN,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf" as const,
        args: [addr as Address] as const,
      })),
      allowFailure: true,
    });
    toFetch.forEach((addr, i) => {
      const r = reads[i];
      if (r.status === "success") {
        const wei = r.result as bigint;
        cacheSet(addr, wei);
        result[addr] = wei.toString();
      }
    });
  } catch (e) {
    // RPC unreachable — leave nulls; callers fail open.
    console.warn(
      "[blink-balance] multicall failed:",
      e instanceof Error ? e.message.slice(0, 200) : e,
    );
  }
  return result;
}

/// Single-address convenience. null = couldn't verify (fail open).
export async function getBlinkBalance(
  address: string,
  opts: { fresh?: boolean } = {},
): Promise<bigint | null> {
  const balances = await getBlinkBalances([address], opts);
  const wei = balances[address.toLowerCase()];
  return wei == null ? null : BigInt(wei);
}

/// Wei → human string ("1,234.56") for UI/API responses.
export function formatBlinkBalance(wei: bigint | string): string {
  const n = Number(formatUnits(typeof wei === "bigint" ? wei : BigInt(wei), 18));
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
