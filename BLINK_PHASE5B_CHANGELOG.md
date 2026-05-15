# BLINK Phase 5b — Changelog

Phase 5 shipped the catch → voucher → claim loop with **hardcoded** anti-farm
inputs (`catchesToday=0`, `streakDays=0`, `isFirstCatchOfDay=true`). Phase 5b
backs those by a real Supabase `blink_catches` table so the daily cap, streak
multiplier, and first-catch-of-day bonus all reflect actual player state.

Mainnet contracts were **not** touched. The reward math itself was not changed
— it now just receives real numbers.

---

## Migration — `src/lib/migrations/blink-catches.sql`

Already on disk from the prior phase. Schema recap:

| column | notes |
|---|---|
| `id` uuid PK | `gen_random_uuid()` |
| `wallet` text | lowercased EVM address |
| `rarity` text | check constraint: common / uncommon / rare / legendary / mythic |
| `reward_wei` numeric(78,0) | filled after voucher sign |
| `ref` text **unique** | the catchId — UPSERT target |
| `voucher_nonce` text | 32-byte hex, filled after voucher sign |
| `claim_tx` text | filled by on-chain `Claimed` event listener in a later phase |
| `caught_at`, `claimed_at` timestamptz | |
| `spawn_id` text, `lat`/`lng` double | optional |

Indexes on `(wallet, caught_at desc)` and `(wallet, claimed_at)`. Unique index
on `ref`. RLS enabled with `service_role` write policy and public read for the
future leaderboard.

### Applying the migration

No `SUPABASE_DB_URL` / postgres connection string is exposed in `.env.local`
(only the URL + service role key, which talk to PostgREST and cannot run DDL).

**Action required from a maintainer:** paste `src/lib/migrations/blink-catches.sql`
into the Supabase dashboard SQL editor and run it once. After that the
voucher route and `/api/me/stats` will start writing/reading rows. They
already deploy safely without the table — calls will 500 with a "catch persist
failed" / "stats query failed" detail until the migration is applied.

---

## `/api/rewards/voucher` — real anti-farm inputs

`src/app/api/rewards/voucher/route.ts` rewritten to drive `computeReward()`
from live DB state. Flow post-SIWE auth:

1. **UPSERT** a `blink_catches` row keyed on `ref` (= `catchId`). Idempotent:
   network retries with the same `catchId` no-op the second time and earn no
   second voucher. `spawn_id`, `lat`, `lng` are persisted when supplied.
2. **`catchesToday`** = `count(*) where wallet = me and caught_at > now() - interval '24 hours'`.
3. **Daily cap**: if `catchesToday > 50` (`DAILY_CATCH_CAP`), return `429` with
   `{error, catchesToday}`. Row stays — catches still count for stats /
   leaderboard, just don't earn.
4. **`streakDays`** computed from `caught_at` over the last 30 UTC days,
   capped at 10. Counts consecutive UTC days ending today with ≥1 catch.
5. **`isFirstCatchOfDay`** = `catchesToday === 1` after the UPSERT.
6. `computeReward()` runs with those real values + the existing UTC-hour and
   NFT-holdings logic, unchanged.
7. Voucher signed; row updated with `voucher_nonce` and `reward_wei`. Update
   failure is non-fatal (logged, voucher still returned — the on-chain nonce
   uniqueness check still prevents double-claim).

`/api/drops/voucher` is left as-is per the brief — drops are geo-gated, no
streak/cap semantics needed.

---

## `/api/me/stats` — new player-stats endpoint

`src/app/api/me/stats/route.ts`. SIWE-gated GET. Returns:

```json
{
  "wallet": "0x…",
  "totalCatches": 42,
  "catchesToday": 3,
  "streakDays": 5,
  "lifetimeBlinkEarned": "1234500000000000000000"
}
```

`lifetimeBlinkEarned` is a wei string (numeric(78,0) overflows JS Number) summed
from rows with `claimed_at is not null`. Streak math is shared with the voucher
route. Four queries run in parallel (`Promise.all`).

Intended consumer: the "My BLINK" nav pill noted in the brief.

---

## Unrelated fix — `/api/mythics` build timeout

Pre-existing on `main`: `npm run build` died with
"Static page generation for /api/mythics is still timing out after 3 attempts."
Next.js was trying to statically prerender the route at build time, which fans
out to an Ethereum RPC plus several IPFS gateways for the live Mythics
collection — easily over the 60-second build worker budget.

Fix: added `export const dynamic = "force-dynamic"` to
`src/app/api/mythics/route.ts`. The route still has its 5-minute in-memory
cache, so runtime cost is unchanged; we just don't try to render it during
`next build`.

---

## Build & verification

- `npm run build` → green, all 67 routes including the new `/api/me/stats` and
  the updated `/api/rewards/voucher` show up as `ƒ` (server-rendered on
  demand).
- Reward math untouched — same `computeReward()`, same multipliers, same cap.
- Service role key stays server-side; only used via `supabaseAdmin` inside
  `src/app/api/`.

## Manual smoke test (post-migration)

Per the brief — to run once the table exists:

1. `curl -X POST /api/rewards/voucher -H "Cookie: blink_siwe=…" -d '{"rarity":"common","catchId":"smoke-1"}'`
   → 200 + voucher. DB has one row.
2. Repeat with the same `catchId` → 200 again, but DB still has only one row
   (UPSERT no-op) and `catchesToday` stayed at 1.
3. Loop 51 distinct `catchId`s → the 51st returns `429 {error:"daily cap reached", catchesToday:51}` and the row is still inserted.
4. `curl /api/me/stats -H "Cookie: blink_siwe=…"` → counts match the rows
   inserted above; `lifetimeBlinkEarned: "0"` until the on-chain `Claimed`
   listener flips `claimed_at`.

## Phase 5c candidates

- `Claimed` event listener that backfills `claim_tx` + `claimed_at`.
- Public leaderboard from `blink_catches` (RLS already allows read).
- "My BLINK" nav pill consuming `/api/me/stats`.
- Switch `read_own_catches` policy from `using (true)` to a real
  `auth.uid()` mapping once we link wallets to Supabase auth users.
