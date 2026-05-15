# BLINK Phase 5 — Changelog

Two mainnet contracts (BlinkRewards + BlinkDrops) are now wired into the app.
Phase 5 ships the **claim loop end-to-end**: catch a creature, receive a
signed voucher, claim $BLINK on Ethereum mainnet. Part C (drop-creation UI)
is intentionally deferred to Phase 5b — the priority for this cut was the
reward loop.

## Mainnet contracts referenced (already deployed — not touched here)

| Contract | Address |
|---|---|
| $BLINK ERC-20 | `0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B` |
| BlinkRewards | `0x44F6C60880f42B1e8798E1Df4312A3b99F00c335` |
| BlinkDrops | `0xd6d52aDC05e981800723e62BBdE012BA3045bFf9` |

Signer key + addresses are read from Vercel env at runtime. No keys, addresses,
or test values were added to any committed file or to `.env.local`.

---

## Part A — Backend voucher signing (commit `3bf255a`)

### `src/lib/blink-signer.ts` (new, server-only)
EIP-712 typed-data signer for both contracts. Two exports:
- `signRewardVoucher(player, amountWei, ref, ttlSeconds = 600)` →
  `BlinkRewards.Voucher` (chainId 1, domain `BlinkRewards` v1).
- `signCatchVoucher(dropId, catcher, ttlSeconds = 300)` →
  `BlinkDrops.CatchVoucher` (chainId 1, domain `BlinkDrops` v1).

Random 32-byte nonces via `crypto.getRandomValues`. Private key is **lazy-loaded**
inside the helpers so builds without `BLINK_SIGNER_PRIVATE_KEY` still succeed
(only an actual voucher request hard-fails).

### `src/lib/blink-rewards-math.ts` (new, server-only)
Deterministic bigint basis-point reward math. Multipliers stack in this order:

| Tier | Base ($BLINK) | Multipliers |
|---|---:|---|
| common | 10 | — |
| uncommon | 50 | — |
| rare | 250 | — |
| legendary | 1,500 | — |
| mythic | 10,000 | — |

- NFT holdings: **Mythic 5×** wins, otherwise **Genesis 2×** (uses existing
  `getBlinkHoldings()` — note the helper exposes `mythics` plural).
- Streak: **+10 % per day**, capped at +100 %.
- First catch of UTC day: **2×**.
- Witching hour (3-4 am UTC): **3×**.
- Global cap: **50×**.
- Daily catch cap: **50** → returns `0n` once exceeded.

### `src/app/api/rewards/voucher/route.ts` (new)
SIWE-gated (`readSiweSession` from existing Phase 3 cookie). Validates `rarity`
+ `catchId`, computes reward, signs voucher. Returns
`{rewardsContract, player, signature, nonce, deadline, amount, ref}`.

Per the brief, `catchesToday`/`streakDays`/`isFirstCatchOfDay` are **safe
hardcoded defaults** (0/0/true) for the Phase 5 launch — wiring those to
Supabase `catches` is a Phase 5b job. The on-chain nonce uniqueness check
prevents double-claim regardless.

### `src/app/api/drops/voucher/route.ts` (new)
SIWE-gated + GPS-gated. Reads `getDrop(dropId)` from mainnet via `viem`, asserts
`status === 0` (Active) and `expiresAt` not yet passed, computes haversine
distance between user and drop, rejects if > **50 m**. Signs `CatchVoucher` and
returns `{dropsContract, catcher, catchPrice, signature, nonce, deadline, dropId}`.

### `src/app/api/drops/list/route.ts` (new, public)
GET `?lat=&lng=&radius=` (radius default 5 000 m). Polls `totalDrops` + each
`getDrop(i)` from mainnet, keeps active + non-expired only, 30-second in-memory
cache. Filters to `radius` with haversine. Degrades to empty (or stale cache)
on RPC error so the map keeps rendering.

---

## Part B — Frontend claim flow (commit `2f466e3` / current HEAD)

### `src/lib/blink-claim.ts` (new, client)
Thin wagmi/core `writeContract` wrappers — the browser only ever holds the
voucher returned by the server.
- `claimReward(voucher)` → `BlinkRewards.claim(amount, nonce, deadline, ref, sig)`.
- `catchDrop(voucher)` → `BlinkDrops.catch(dropId, deadline, nonce, sig)` with
  `value = voucher.catchPrice`.

### `src/app/catch/[id]/page.tsx` (modified)
The existing **CONFIRMATION** phase now renders a new "Bonus reward" card
beneath the SOL/ETH/BTC confirmation:

1. Once `confirmed === true`, POST `{rarity, catchId}` to `/api/rewards/voucher`.
2. On 200: render the card with `+N BLINK` + "Ready" pill.
   - If wallet not connected via wagmi → "Connect your wallet to claim".
   - Otherwise → "Claim N BLINK" CTA that calls `claimReward()`.
3. On tx submit: button switches to "Confirming…", we watch with
   `useWaitForTransactionReceipt`.
4. On `status === "success"`: card flips to "BLINK Claimed" with the truncated
   Etherscan tx link.

Failure modes are non-blocking — a 401 (no SIWE) or any other voucher error
falls through to a small muted-text hint and the existing "Continue Watching"
button still works. The original collect flow is unchanged.

Rarity mapping: app's `"Common" | "Rare" | "Legendary"` → math tier
`"common" | "rare" | "legendary"`. (The math file also defines `uncommon` +
`mythic` for future tier expansion.)

---

## Part C — Drop creation UI

**Deferred to Phase 5b** per the brief's explicit guidance. The reward loop
(catch → voucher → claim) is the launch priority and is now end-to-end.
`/api/drops/list` and `/api/drops/voucher` already exist server-side, so a
follow-up only needs the `/drop` page that lets users *create* drops on the
map.

---

## Build & verification

- `npm run build` ran clean before each commit (Part A and Part B).
- Two separate commits, one per part, per the brief.
- No emojis, cyan, or purple in UI. Inline styles + BLINK palette only.
- Mobile breakpoints (480 / 768 / 1024) preserved — the bonus card is a
  vertical-stack design that fits the existing 380 px confirmation column.

## Not in this phase (Phase 5b candidates)

1. Supabase `catches` → real `catchesToday` / `streakDays` /
   `isFirstCatchOfDay` queries inside `/api/rewards/voucher`.
2. `/drop` UI for creating drops (Part C of the brief).
3. Surfacing live drops on `/map` via `/api/drops/list` + the catch CTA that
   submits a `CatchVoucher`.

## Hard rules respected

- Never logged, committed, or hardcoded `BLINK_SIGNER_PRIVATE_KEY`.
- SIWE check is the *first* line of both voucher routes — unauthenticated
  requests return 401 before any contract read.
- Did not touch the deployed contracts.
- Did not generate audio. Existing `sounds.play(catchSoundFor(rarity))` still
  fires from the orb collect path.
