# SHIP.md — BlinkWorld airdrop auto-payout go-live checklist

Everything below is built, tested and committed but **deliberately not
executed** (no mainnet deploy, no prod migration, no Vercel env changes).
Work through it top to bottom.

What exists:

- **Contract** — `BlinkPayoutVault` in `blink-token/payout-vault/`
  (owner = cold deployer, operator = hot backend key, 100k BLINK/day cap,
  1M BLINK/tx cap, pause, rescue, on-chain one-payout-per-registration).
  24 unit tests + mainnet-fork test pass; `dry-run.sh` rehearsed the full
  deploy + funding + payout + double-send-revert on an anvil fork.
- **Site** — Approve in `/claim/admin` now auto-sends via
  `POST /api/claim/admin/payout` (viem, server-only), stores the tx hash,
  flips the row to `sent`, shows the Etherscan link; failures stay `approved`
  with the error visible and a Retry button. Idempotent at three layers
  (DB lock, on-chain `paidRefs` recovery check, vault ref guard).

## 1. Generate the operator key

A fresh hot key that will live ONLY in Vercel env. It signs payout txs and
pays their gas; it can never do anything but `payout()` within the caps.

```bash
cast wallet new   # note address + private key; store in password manager
```

## 2. Fund the deployer

Send **~0.05 ETH** to the deployer `0xc928da9EE5b739B2EF01c07e0895d534dBe087E6`
(key in `blink-claim/.env.deployer`). It deploys and owns the vault.

## 3. Deploy + verify the vault (Ethereum mainnet)

```bash
cd ~/Projects/blink-token/payout-vault
export PRIVATE_KEY=<deployer private key>          # from blink-claim/.env.deployer
export OPERATOR_ADDRESS=<operator address from step 1>
forge script script/DeployBlinkPayoutVault.s.sol \
  --rpc-url https://ethereum-rpc.publicnode.com --broadcast
```

Note the printed vault address, then verify on Etherscan:

```bash
forge verify-contract <VAULT_ADDRESS> src/BlinkPayoutVault.sol:BlinkPayoutVault \
  --chain mainnet --etherscan-api-key <ETHERSCAN_API_KEY> --watch \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256,uint256)" \
    0xf1D3Fbe00aF8185add548E84d77075bc98f18cE0 $OPERATOR_ADDRESS \
    100000000000000000000000 1000000000000000000000000)
```

## 4. Fund the vault and the operator

- Transfer **1,000,000 BLINK** (plain ERC-20 transfer) from the treasury to
  the vault address.
- Send **~0.05 ETH** to the operator address (it pays payout gas, roughly
  0.0005–0.002 ETH per payout depending on gas prices).

Sanity check: `cast call <VAULT> "poolBalance()(uint256)" --rpc-url https://ethereum-rpc.publicnode.com`

## 5. Run the DB migration (BlinkWorld game project)

Paste `supabase/migrations/20260716_airdrop_payout_columns.sql` into
https://supabase.com/dashboard/project/lutlnwshbbhbwszpzxks/sql and run it.
(Adds payout tx-hash/amount/error/lock columns to `airdrop_registrations`.
The admin panel degrades gracefully if the site deploys first, but do the
migration before the first real payout.)

## 6. Set Vercel env vars (production)

```
CLAIM_PAYOUT_VAULT_ADDRESS=<vault address from step 3>
CLAIM_PAYOUT_OPERATOR_KEY=<operator private key from step 1>
CLAIM_PAYOUT_RATIO=1
CLAIM_PAYOUT_MAX_TOKENS=1000000
```

(Optional: `CLAIM_PAYOUT_RPC_URL` for a paid RPC; defaults to
`ETH_RPC_URL` → publicnode.)

## 7. Deploy the site

Push / redeploy mishmesh on Vercel as usual.

## 8. End-to-end test plan (one real registration, small amount)

1. Pick a test registration you control (or register a test code with your
   own wallet address) — ideally one with a small `airdrop_basis`.
2. `/claim/admin` → the row shows **Approve + send**. Click it once.
3. Button shows *Sending…* (~15–60 s). Row flips to **SENT** with
   `<amount> BLINK · 0x…↗` — open the Etherscan link, confirm 1 confirmation
   and that the recipient got the exact amount.
4. Click nothing twice? Try anyway: re-clicking during sending is blocked;
   after sent there is no send button. (The vault would revert a double-send
   regardless — `RefAlreadyPaid`.)
5. Failure drill (optional): pause the vault
   (`cast send <VAULT> "setPaused(bool)" true --private-key <owner>`),
   approve another row → it stays APPROVED with the revert reason shown →
   unpause → **Retry send** succeeds.
6. Check `/claim` as the player: status shows `sent`.
7. Watch the vault: `remainingToday()` decreases per payout; top up ETH on
   the operator and BLINK on the vault as needed.

## Ongoing ops / safety

- **Operator key leaks?** Worst case = daily cap (100k BLINK) per day.
  Immediately: `setPaused(true)` then `setOperator(<new hot key>)` as owner,
  and rotate the Vercel env.
- **Raise/lower caps:** `setDailyCap` / `setMaxPerPayout` (owner, 18-dec wei).
- **Drain/migrate:** `rescueToken(<BLINK>, <to>, <amount>)` (owner).
- The deployer/owner key stays cold — it is never needed for day-to-day sends.
