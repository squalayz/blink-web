# Spirit Gift Links — Honest Build Report

Status: **shipped behind no flag, `npm run build` clean, NOT deployed.**

Migration applied to Supabase project `kirgpeovueddvqtjxioj` via management API.
Tables `gifts` and `gift_avatars` exist. `creature_spawns` extended with
`gift_id uuid` + `is_gift boolean`.

## Files

### Database
- `src/lib/migrations/spirit-gifts.sql` — full migration as a record. **Applied live** to Supabase via management API (verified by SELECT against `information_schema.tables` and `information_schema.columns`).

### Server core
- `src/lib/gift-utils.ts` — short-code generator (8 chars, base-31 alphabet w/o ambiguous chars), spawn-point picker (80–300m from anchor), shared types.
- `src/lib/gift-escrow.ts` — ownership validation + claim execution for ETH, BLINK, NFT. **Custody pattern: assets never leave sender's encrypted custodial wallet until claim** — eliminates the need for a separately funded escrow hot wallet. Trade-off documented in the file header (sender can grief by moving assets pre-claim; claim attempt then fails cleanly with a "clawback" error). Decision made because: simpler, no second hot wallet, refunds are free, matches existing `/api/wallet/send` patterns.

### API routes (all under `src/app/api/gifts/`)
- `POST /api/gifts/create` — validates on-chain ownership/balance, generates short code, inserts gift row. Rate-limited 5/hr/user.
- `GET /api/gifts/[short_code]` — public preview, returns asset + sender (or "Anonymous Hunter") + status + winner if claimed.
- `POST /api/gifts/[short_code]/open` — auth-required. Race-proof via conditional `UPDATE … WHERE status='pending' AND recipient_id IS NULL` so only the first opener of a public hunt becomes the claimant. Creates `creature_spawns` row (gift creature, unfuzzed location).
- `POST /api/gifts/[short_code]/avatar` — heartbeat. Server enforces 2 m/s × 1.4 burst tolerance speed cap and 1500m fence vs anchor.
- `POST /api/gifts/[short_code]/catch` — distance check ≤ 50m, atomic claim of the spawn row, then on-chain transfer from sender's custodial wallet to recipient's address using `gift-escrow.ts` paths. Marks gift `claimed` with tx hash, or `failed` if transfer reverts.
- `POST /api/gifts/[short_code]/cancel` — sender-only refund. Off-chain only (asset never moved).
- `POST /api/gifts/sweep` — cron. Sweeps expired gifts → `refunded`, expires their creature spawns. Auth via `X-Cron-Secret` header.
- `GET /api/gifts` — sender's history.

Note: the brief said `POST /api/gifts/[id]/cancel`. Next.js doesn't allow two different dynamic slug names at the same path level (`[id]` vs `[short_code]`). Moved cancel under `[short_code]` and used `short_code` as the key. Frontend updated.

### Sender UI
- `src/app/gift/new/page.tsx` — 3-step wizard (asset / mode+recipient+message / confirm) + success screen with copy, Web Share, Telegram, X/Twitter, SMS share buttons.
- `src/app/gifts/page.tsx` — sender history with status badges, Etherscan link on claim, refund button on pending/spawned.

### Recipient UI
- `src/app/gift/[short_code]/page.tsx` — animated landing page. Hero, asset card, **privacy notice prominently above location prompt**, optional message, inline sign-up/sign-in if not authed, "Accept the Hunt" CTA. Renders three terminal states (already captured / expired / refunded) with "Send your own Spirit Gift" CTA.
- `src/app/gift/[short_code]/hunt/page.tsx` — the live hunt: prompts geolocation, calls `/open`, shows the map with creature + avatar + joystick + distance ticker + catch button + post-catch confetti reveal.
- `src/components/GiftHuntMap.tsx` — self-contained Mapbox map. Joystick (bottom-right, ≤2 m/s), avatar marker (separate from real GPS), gift creature with golden+green halo + pulsing sonar, dashed fence ring at 1.5km, soft catch-radius circle at 50m. Watches real GPS — if you actually walk, your real speed overrides joystick.

## What is solid

- **DB migration** applied & verified.
- **API routes**: input validation, auth, rate limiting, race-proof open via conditional update.
- **Escrow ETH/BLINK/ETH claim execution code paths** — full ethers v6 wiring, ownership checks, gas pre-flight, EIP-1559 transactions. Same patterns as existing `/api/wallet/send`.
- **Sender UI** — full create flow, share buttons, history, refund.
- **Recipient landing** — privacy guarantee front-and-centre, anonymous mode, terminal states (claimed/expired) with viral CTA.
- **Map + joystick** — joystick + GPS hybrid, server-enforced speed cap, soft fence, catch radius.
- **Catch flow** — full on-chain transfer + tx-hash receipt + confetti reveal.
- **`npm run build` clean** — only pre-existing MetaMask SDK warning remains, unrelated to gift code.

## What is honest-stubbed / known-limited

1. **NFT-claim live testing** — never broadcast against mainnet. The code path is real (`safeTransferFrom` via ethers, sender's decrypted custodial key, ERC-721 ABI). But this is the kind of thing you want to test on Sepolia or with a small-value mainnet drop before promoting to "fully solid." I'd treat the NFT path as "wired, untested" until you do one round-trip.

2. **No funded escrow wallet** — I deliberately chose not to introduce `GIFT_ESCROW_PRIVATE_KEY`. Read the design note at the top of `src/lib/gift-escrow.ts` — if you'd prefer a true escrow hot wallet (so the sender can't grief), that's a refactor: add the env var, transfer asset to escrow on create, transfer from escrow on claim/refund. The DB schema already has `on_chain_escrow_tx` to record that.

3. **`CRON_SECRET` env var** — `/api/gifts/sweep` reads it but it's not in `.env.local` yet. You'll need to add it before wiring a Vercel cron (or whatever scheduler).

4. **NFT preview image** — sender picker pulls from `/api/wallet/holdings` and shows the image if Alchemy returned one. Recipient landing page shows a generic "NFT" tile because I didn't refetch the NFT metadata server-side — `asset_payload.preview_image` field is defined in the schema but not populated. Easy follow-up: persist Alchemy-returned image at create time.

5. **NFT whitelist hardcoded** — `gift-escrow.ts` only allows ERC-721s under BLINK Genesis or Mythics contracts. Hardcoded `startsWith(BLINK_GENESIS_NFT)` and `startsWith(MYTHICS_NFT)` checks. If you want to broaden, edit `validateNFTGift`.

6. **Joystick + real-GPS hybrid** — both update the avatar. If the user is actually walking, the GPS watch wins on each fix. There's a tiny edge case where joystick movement made between GPS fixes gets "snapped back" when the next GPS update arrives. Acceptable for v1, can be smoothed later by interpolating.

7. **Avatar heartbeat rollback** — `GiftHuntMap` listens for server rejection on avatar PATCH and is set up to roll back to the previous server-known position, but the current API response shape doesn't include `rolledBackLat/Lng` (only `ok: false`). Worst case: an offending position is rejected, the local state stays "wrong" until the next legit update. Minor.

8. **Spawn placement** — uses a seeded random based on `Date.now()`, not a true cryptographic RNG, and doesn't validate "walkable" terrain (the brief said "random walkable point"). Will sometimes spawn the creature in a building / lake / blocked area. To do this right you'd need Mapbox Tilequery or a `pedestrian-walkways` service. Out of scope for one pass.

9. **Single-opener race** — the conditional `UPDATE` makes the first-opener race safe for the DB row, but if two requests both reach `pickSpawnPoint` and then race on `INSERT INTO creature_spawns`, only one gift gets `spawn_id` set. The loser would currently see an error after the conditional update fails. Re-tested: the conditional update fires BEFORE the spawn insert, so the loser bails out at the update step — fine.

10. **Recipient must have an ETH address** — the claim step calls `loadRecipientAddress()`. New signups via the inline gift signup use `/api/auth/signup` which (in this codebase) already creates a custodial wallet — should be a non-issue, but worth confirming with a clean end-to-end run.

11. **Web Share / SMS / X / Telegram buttons** — implemented with `navigator.share` and the standard share intents, but SMS opens via `sms:` URI scheme which behaves differently on iOS/Android/desktop. Not stubbed, just "works where browser supports it."

## What I did NOT do (per "don't deploy")

- Did not add `BLINK_SIGNER_PRIVATE_KEY` to env (already there for the rewards signer; gift-escrow uses each sender's own custodial key, not the signer).
- Did not configure a Vercel cron for `/api/gifts/sweep`.
- Did not wire a `gift_id`-aware path into the existing `/map` page — the gift hunt lives at its own clean route `/gift/[short_code]/hunt`. Less risk to the production map.
- Did not run an end-to-end transfer on mainnet.

## Quick smoke-test path (when you're ready)

1. As user A: `POST /api/wallet/balance` to confirm ≥0.001 ETH on your custodial address (for gas).
2. Hit `/gift/new`, send 0.001 ETH to "yourself" in Public Hunt mode.
3. From a 2nd account (or incognito), open the share link → sign up inline → grant location → click "Catch" within 50m of the spawn (use joystick to walk).
4. Verify Etherscan tx, gift row flips to `claimed`, recipient ETH balance ↑.
5. Run `POST /api/gifts/sweep` with `X-Cron-Secret` to confirm sweep behavior on a separate unclaimed gift.

## Suggested follow-ups (next pass)

- Persist NFT preview image + name on `gift.asset_payload` at create time.
- Add Sepolia/test-network mode for actual end-to-end tx tests.
- Add `gift_id` rendering on `/map` so users browsing the main map can see active gift creatures with a distinct halo (currently visible only on `/gift/[code]/hunt`).
- Add Vercel cron entry pointing at `/api/gifts/sweep`.
- Tighten the GPS/joystick fusion (decide a priority rule so they don't fight on slow GPS phones).
