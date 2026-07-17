// Exercise src/lib/blink-balance.ts against mainnet (public RPC).
// Run: npx tsx scripts/test-blink-balance.ts
//
// Known fixtures:
//   - BlinkPayoutVault holds the airdrop pool → balance > 0
//   - a fresh random-looking address → balance == 0
//   - the cache serves repeat reads without a second RPC round-trip

import {
  BLINK_TOKEN,
  formatBlinkBalance,
  getBlinkBalance,
  getBlinkBalances,
} from "../src/lib/blink-balance";

const VAULT = "0x98D01006f6d5A3a438bD7178baabd59Afd092258"; // holds BLINK
const EMPTY = "0x00000000000000000000000000000000dEaD0716"; // vanishingly unlikely to hold any

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  console.log(`BLINK token: ${BLINK_TOKEN}\n`);

  // Batch path (multicall) — mixed-case input, lowercase keys out.
  const batch = await getBlinkBalances([VAULT, EMPTY]);
  const vaultWei = batch[VAULT.toLowerCase()];
  const emptyWei = batch[EMPTY.toLowerCase()];
  check(
    "vault holds BLINK",
    vaultWei != null && BigInt(vaultWei) > 0n,
    vaultWei == null ? "RPC returned null" : `${formatBlinkBalance(vaultWei)} BLINK`,
  );
  check(
    "fresh address holds zero",
    emptyWei != null && BigInt(emptyWei) === 0n,
    emptyWei == null ? "RPC returned null" : `${emptyWei} wei`,
  );

  // Single-address path + cache hit (no RPC → must match instantly).
  const t0 = Date.now();
  const cached = await getBlinkBalance(VAULT);
  const cacheMs = Date.now() - t0;
  check(
    "cached read matches batch read",
    cached != null && vaultWei != null && cached === BigInt(vaultWei),
    `${cacheMs}ms`,
  );
  check("cached read is instant (<50ms, no RPC)", cacheMs < 50, `${cacheMs}ms`);

  // fresh:true bypasses the cache and still agrees.
  const fresh = await getBlinkBalance(VAULT, { fresh: true });
  check("fresh read agrees", fresh != null && cached != null && fresh === cached);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
