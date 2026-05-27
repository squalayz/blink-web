# BLINK Audit Fix Brief — Days 1 & 2 (P0s + Critical P1s)

**Source of truth:** `BLINK_AUDIT_REPORT.md` in this same repo. Read it first.

**Mission:** Fix every P0 (mainnet-safety + dead-end UX bugs) plus the highest-leverage P1s for recovery UX. **Be careful, methodical, and commit each fix separately so reviews and rollbacks are clean.**

**Mainnet is LIVE.** Contracts: BLINK Mythics `0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592`, BLINK ERC-20, BLINK Genesis `0x85e7CB56fA10f26fEAe20449e71AD1503867799A`, BlinkRewards, BlinkDrops. **Do not redeploy or modify any contract code.** Only application code.

## Pre-flight (run before any edit)
- `git status` — confirm clean working tree; there's a lot of pre-existing untracked work, do not stage anything I didn't author.
- Read each P0 finding in BLINK_AUDIT_REPORT.md fully before touching the file.
- After every commit, run `npm run build` and `npx tsc --noEmit` on the touched files; if either regresses on a file I edited, fix before moving on.

## Commit list (ordered, one commit per item)

### Commit 1 — `fix(escrow): await tx.wait(1) on all gift claim paths`
**P0-1.** In `src/lib/gift-escrow.ts`:
- `executeETHClaim` (around line 238): after `const tx = await signer.sendTransaction(...)`, add:
  ```ts
  const receipt = await tx.wait(1);
  if (!receipt || receipt.status !== 1) {
    return { ok: false, error: "ETH transfer reverted on-chain", txHash: tx.hash };
  }
  ```
- `executeBlinkClaim` (around line 270): same pattern after `const tx = await erc20.transfer(...)`. Return `error: "BLINK transfer reverted on-chain"` on revert.
- `executeNFTClaim` (around line 298): same pattern after `const tx = await nft.safeTransferFrom(...)`. Return `error: "NFT transfer reverted on-chain"` on revert.
- Also: in `executeBlinkClaim` and `executeNFTClaim`, pass an explicit `nonce` like `executeETHClaim` already does (P2 note — read the existing nonce-fetch pattern and replicate).

**Acceptance:** Each function now awaits a receipt and rejects on `status !== 1`. The catch route at `src/app/api/gifts/[short_code]/catch/route.ts:124-162` does not need to change yet — when these return `{ ok: false }` it already short-circuits before the DB update.

### Commit 2 — `feat(gifts): tx_status column + sweeper`
**P0-1 follow-up.** This is a Supabase + new API route change. **Do not run the SQL migration yourself.** Instead:
- Write the migration SQL to `src/lib/migrations/gift-tx-status.sql`:
  ```sql
  ALTER TABLE gifts ADD COLUMN IF NOT EXISTS tx_status text;
  CREATE INDEX IF NOT EXISTS gifts_tx_status_idx ON gifts (tx_status, claimed_at) WHERE tx_status IS NOT NULL;
  ```
- In `catch/route.ts:154-162`, set `tx_status: 'confirmed'` when the claim succeeds (since we now wait for the receipt before reaching this point, "confirmed" is correct). If the escrow returns `{ ok: false, txHash }`, set `tx_status: 'failed'` so the sweeper can investigate.
- Create `src/app/api/gifts/sweep-tx/route.ts` — GET handler (rate-limited, cron-only via header check) that:
  1. Selects up to 50 gifts where `status='claimed' AND tx_status IN ('broadcast', 'failed')` older than 5 min
  2. For each, fetches the receipt via `getProvider().getTransactionReceipt(on_chain_claim_tx)`
  3. If status=1 → mark `tx_status='confirmed'`. If status=0 or null after >30 min → mark `tx_status='failed'` and notify (console.error for now). Optionally, if `tx_status='failed'`, reset the gift to `spawned` so the recipient can re-attempt.
- Add the cron to `vercel.json`:
  ```json
  { "path": "/api/gifts/sweep-tx", "schedule": "*/5 * * * *" }
  ```
- Note in commit message: SQL migration in `src/lib/migrations/gift-tx-status.sql` must be applied manually via Supabase SQL editor before this sweeper runs cleanly. Until then the new column simply doesn't exist and the inserts will fail loudly — that's an acceptable temporary state since the receipt-wait in commit 1 is the actual safety net.

### Commit 3 — `fix(walk): stop swallowing stolen-gift 410s`
**P0-2.** In `src/app/gift/[short_code]/walk/WalkClient.tsx:922-928`:
- Replace the existing `if (!openRes.ok) { ... already_open regex ... }` block with:
  ```ts
  if (!openRes.ok) {
    // The server returns already_open: true ONLY with HTTP 200.
    // Any non-2xx response is a real terminal — route back to landing.
    router.replace(`/gift/${code}?status=410`);
    return;
  }
  ```
- In `src/app/gift/[short_code]/GiftLandingClient.tsx`: when `useSearchParams().get('status') === '410'` OR the fetched gift `status === 'spawned'` and the viewer is not the owner, render a polite recovery state: "This gift was just caught by another hunter. Want to send your own?" with links to `/gift/new` and `/watch`. Keep it under ~20 lines of JSX.

**Acceptance:** Two-device race: device A doesn't get the "Not your gift" red screen after device B catches.

### Commit 4 — `fix(walk): submittingRef guard on attemptCatch`
**P0-3.** In `WalkClient.tsx:896-956`:
- Add `const submittingRef = useRef(false);` near other refs.
- Wrap `attemptCatch` body:
  ```ts
  const attemptCatch = useCallback(async () => {
    if (submittingRef.current) return;
    if (step.kind !== "navigating" || !withinCatch) return;
    submittingRef.current = true;
    try { await runClaim(); } finally { submittingRef.current = false; }
  }, [step.kind, withinCatch, runClaim]);
  ```
- In `runClaim`'s catch branch, only call `setStep({ kind: 'fatal', message: ... })` if `step.kind !== 'claimed'`. Use a ref snapshot since `step` may be stale inside the closure: capture `const wasClaimed = lastStepRef.current === 'claimed'` before setStep; or simpler: read latest via a `stepRef` you maintain.

**Acceptance:** Fast double-tap on Catch does not overwrite the success card with a fatal screen.

### Commit 5 — `fix(catch): server-side proximity check applies regardless of via_toggle`
**P0-4.** In `src/app/api/gifts/[short_code]/catch/route.ts:75-102`:
- Move the haversine distance check OUT of the `if (!viaToggle)` block so it runs for every catch.
- Use `body.avatar_lat / body.avatar_lng` (always required from client).
- If distance > `CATCH_RADIUS_M` (5), return 400 `"Move closer to the spirit"`.
- Also: validate `body.avatar_lat` / `body.avatar_lng` with `isValidLat` / `isValidLng` even when `viaToggle` is true (right now they're skipped in that branch).

**Acceptance:** A modified client that POSTs `{ via_toggle: true, avatar_lat: <fake> }` from anywhere is rejected server-side.

### Commit 6 — `feat(error-boundary): wire ErrorBoundary, add gift error.tsx, ship /api/errors`
**P0-5.** Three changes in one commit:
1. Create `src/app/gift/error.tsx` (Next.js error UI convention) that renders a brief "Something went wrong with this gift" + a link back to `/gift/${params.short_code}` if available, else `/`. Use `'use client'` and the standard `(error, reset)` props.
2. Wrap `<HuntMap>` in `<ErrorBoundary fallback={<MapDownState />}>` in `src/app/watch/page.tsx:892` and `src/app/map/page.tsx:814`. Define `MapDownState` inline or in `src/components/MapDownState.tsx` — a small "Map unavailable — refresh to retry" card with brand styling.
3. Either create `src/app/api/errors/route.ts` (POST handler that logs + writes to a new `client_errors` table — read the existing log/console patterns in other routes) **OR** strip the `fetch('/api/errors')` call from `src/components/error-boundary.tsx`. Choose remove if Sentry is on the roadmap; choose ship if not. Pick *ship* with a no-op-but-200 response so the boundary doesn't double-log a network error on top of the real error.

**Acceptance:** Force a Mapbox token to a bad value locally, refresh `/watch` — see the `MapDownState` card instead of a white screen.

### Commit 7 — `fix(gifts): conditional status updates close cancel/catch race`
**P1-30.** Two SQL conditions:
- In `src/app/api/gifts/[short_code]/cancel/route.ts:42-45`, add `.eq('status', 'pending')` or `.in('status', ['pending', 'spawned'])` to the UPDATE so a cancel can't overwrite a `claimed` row.
- In `src/app/api/gifts/[short_code]/catch/route.ts:154-162`, add `.eq('status', 'spawned')` to the UPDATE that sets `status='claimed'`. If the update returns 0 rows, the gift was canceled mid-catch — refund the chain effect: the receipt-confirmed tx already moved the asset, so log the inconsistency and respond with 500 `"Gift was canceled — please contact support"`. (We accept the rare edge: tx confirmed → DB rejected. Better to surface than silently lose.)

### Commit 8 — `fix(friends): conditional update closes race in respond`
**P1-31.** `src/app/api/friends/respond/route.ts:24-49`: convert the read+update pattern to a single conditional UPDATE with `.eq('status', 'pending')`. If 0 rows updated, return 409 `"Already responded"`.

### Commit 9 — `feat(gifts): sender preflight on landing — you_are_sender`
**P1-1.** Two changes:
- `src/app/api/gifts/[short_code]/route.ts`: add `you_are_sender: boolean` to the response, computed server-side from the bearer token's user.id vs gift.sender_id. **Never echo `sender_id` itself.** If the request is unauthenticated, omit the field (false default on client).
- `src/app/gift/[short_code]/GiftLandingClient.tsx`: when `you_are_sender === true`, render a "This is your gift — copy link, cancel & refund, or share" panel instead of the recipient hero. The copy-link + cancel UI already exists in scattered form; consolidate or duplicate cleanly.

### Commit 10 — `fix(walk): persist + restore avatar position across reloads`
**P1-2.** `WalkClient.tsx:482-515`: when the server's open response returns `avatar.lat/lng` (already there at `open/route.ts:80`), seed `virtualPosRef.current = { lat: avatar.lat, lng: avatar.lng }` instead of always using the anchor. Confirm this doesn't break the first-open case where `avatar.lat/lng` falls back to anchor server-side.

### Commit 11 — `chore(walk): deprecate /hunt CTA for anon users, remove duplicate inline auth form`
**P1-15 + P1-16.** 
- In `GiftLandingClient.tsx`: remove the inline signup/signin form (lines ~376-431). Instead, keep `WalkThereButton` (anon-friendly) prominent, and trigger `AuthModal` at the catch moment as already wired post-anon-fix.
- The "Allow Location & Walk to It" button for signed-in users keeps GPS path; for anon, hide it OR route to `/walk` (the GPS path requires auth anyway, so hiding is fine).
- If you delete the inline auth form, confirm no other component references its handlers. Search for any leftover state vars.

## After all commits
1. Run `npm run build` one final time. Must be green.
2. Run `npx tsc --noEmit`. Must show no NEW errors on touched files. Pre-existing errors in unrelated files are fine.
3. Deploy to production: `vercel --prod`.
4. Run smoke tests on the live URL:
   - `curl -I https://blinkworld.xyz/` — expect 200, `x-vercel-cache: HIT` after warmup
   - `curl -s https://blinkworld.xyz/api/gifts/jwg7y39t | head -c 400` — expect a JSON body with the Voidpup gift data, status `pending`
5. Report back with:
   - Commit list and SHAs
   - Deploy URL
   - Smoke-test results
   - Any P0 that was *not* fixed in this batch, with reason

## Rules (READ)
- **One commit per item.** No combined commits except where I explicitly grouped.
- **Inline styles only**, no Tailwind.
- **Do not** modify contract code, mint scripts, or `scripts/*`.
- **Do not** touch `src/app/gift/[short_code]/walk/WalkClient.tsx` joystick math, walk-speed constants, or game-feel loop. Only the bugs listed.
- **Do not** stage any of the existing untracked files in the repo. Only commit files you touch.
- If a fix would require a Supabase schema change beyond the one in Commit 2, **stop and add a note to the report instead** — do not run migrations yourself.
- If any acceptance step fails, fix it before moving to the next commit.
- Mainnet contracts LIVE. If anything you write would change on-chain calldata, flag and stop.
