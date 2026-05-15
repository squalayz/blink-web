# BLINK Phase 5b — Real Catch State (Supabase wired)

Phase 5 shipped with hardcoded `catchesToday=0`, `streakDays=0`. This phase wires those to a real Supabase `blink_catches` table so the daily cap, streak multiplier, and first-catch-of-day bonus actually work.

---

## What exists
- Migration file: `src/lib/migrations/blink-catches.sql`
- Voucher route: `src/app/api/rewards/voucher/route.ts` (currently uses hardcoded defaults)
- Reward math: `src/lib/blink-rewards-math.ts`

## Tasks

### 1. Run the migration

Apply `src/lib/migrations/blink-catches.sql` against the live Supabase project.

**Two options:**
- (a) Via `psql` if SUPABASE_DB_URL is exposed in env — likely is
- (b) Via Supabase REST: stop and ask user to paste in dashboard SQL editor

Use (a) if available. Verify by querying `\dt blink_catches` after.

### 2. Backend service-role Supabase client

If `src/lib/supabase-admin.ts` doesn't exist, create one that uses `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` to insert rows.

### 3. Update `/api/rewards/voucher/route.ts`

After SIWE auth, BEFORE signing the voucher:

1. Insert a `blink_catches` row with `wallet`, `rarity`, `ref`, `caught_at=now()`, `lat/lng` if provided. **Use UPSERT on `ref`** so duplicate posts (network retries) don't double-charge.
2. Query the user's catches **in the last 24 hours** (`caught_at > now() - interval '24 hours'`) — count is `catchesToday`.
3. Compute `streakDays`:
   - For each of the last 30 days, check if user has ≥1 catch
   - Count consecutive days ending today
   - Cap at 10 (since multiplier caps at +100%)
4. `isFirstCatchOfDay` = `catchesToday === 1` (after the insert above)
5. Pass these REAL values into `computeReward(...)`
6. If `catchesToday > DAILY_CATCH_CAP`, return 429 BEFORE signing — but the row should still be there (catches still count for stats, just don't earn).

After voucher is signed, update the row with `voucher_nonce` and `reward_wei`. (Claim tx hash added in a separate phase via webhook from `Claimed` event listener.)

### 4. Update `/api/drops/voucher/route.ts`

Optional — Drops don't need streak/daily-cap. Just keep as-is.

### 5. Add `/api/me/stats` route

Returns the SIWE user's current stats:
- `totalCatches`
- `catchesToday`
- `streakDays`
- `lifetimeBlinkEarned` (sum of `reward_wei` where `claimed_at is not null`)

Used by the future "My BLINK" pill in the nav.

### 6. Verify

- `npm run build` green
- Curl the voucher route with a real SIWE cookie — should work
- Curl twice with the SAME `catchId` — second call should not double-insert (UPSERT on `ref`)
- Curl 51 times with different `catchId` — 51st should return 429

### 7. Commit + changelog
- `feat(phase5b): blink_catches table + real daily cap / streak tracking`
- `feat(phase5b): /api/me/stats for player stats`
- Write `BLINK_PHASE5B_CHANGELOG.md`

## Constraints
- Don't touch contracts
- Don't change reward math, only feed it real numbers
- Service role key stays server-side
- Always upsert on `ref` to prevent duplicate-catch farming
