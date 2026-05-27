# BLINK Audit Report — 2026-05-17

## Executive Summary

BLINK is closer to Pokémon GO than it has any right to be for a project of this size — the eye-orb cinematic, joystick walk, on-chain Spirit Gifts, custodial wallet onboarding, and gift-link share loop are an *original* take that GO doesn't have. But the codebase is one bad night on Vercel away from disaster: **on-chain claims are fire-and-forget (no `tx.wait()` anywhere in `gift-escrow.ts`), the gift's own status machine has a regex bug that swallows "stolen" errors and marches users into an unrecoverable dead-end, the catch button can be double-fired and ends in a "fatal" state on top of a successful claim, half the Settings toggles are decorative placebos, and the AR/PWA/push surfaces advertised in copy do not exist as code.** The gameplay loop is fun; the safety nets aren't there. Ship a 7-day P0 patch and BLINK is genuinely better than GO for early adopters. Don't, and the next claimed-but-not-delivered NFT becomes the only thing the community talks about. Mainnet contracts are live — flag for `gift-escrow.ts:238/270/298` and `catch/route.ts:122-162`.

---

## P0 — Critical bugs (blockers)

### P0-1. On-chain claim is fire-and-forget. A reverted tx still flips the gift to `claimed`.
- **Files:** `src/lib/gift-escrow.ts:238, 270, 298` (all three `execute*Claim` paths); `src/app/api/gifts/[short_code]/catch/route.ts:124-162`.
- **Root cause:** `executeETHClaim` / `executeBlinkClaim` / `executeNFTClaim` all return `{ ok: true, txHash: tx.hash }` immediately after `signer.sendTransaction(...)` / `erc20.transfer(...)` / `nft.safeTransferFrom(...)` — **none of them call `tx.wait(1)`**. The route then runs `update gifts set status='claimed', on_chain_claim_tx = result.txHash` (line 154-162). If the tx reverts (sender out of gas after pre-check, NFT moved mid-flight, RPC drops the broadcast, chain reorg), the DB says "claimed", the user sees the confetti, the asset never arrived. **No reconciliation job exists.** Compare with `src/app/api/wallet/send-eth/route.ts:66` which correctly does `await tx.wait(1)` and with `src/app/api/spawns/catch/route.ts:274, 295, 347, 407` which all await. The gift path is the outlier — and it's the path that moves the most user-visible value.
- **Repro:** Send an ETH gift with the sender's balance *exactly* equal to gift+gas. Let recipient claim. Race a second send-eth from the sender's wallet (or set custom gas low). The claim tx will revert on-chain; the gift UI will show success.
- **Exact fix:**
  ```ts
  // gift-escrow.ts executeETHClaim — replace the bare return with:
  const tx = await signer.sendTransaction({ ... });
  const receipt = await tx.wait(1);
  if (!receipt || receipt.status !== 1) {
    return { ok: false, error: "Transfer reverted on-chain", txHash: tx.hash };
  }
  return { ok: true, txHash: tx.hash };
  ```
  Apply identically to `executeBlinkClaim` (line 269) and `executeNFTClaim` (line 297). Add a `tx_status: 'broadcast'|'confirmed'|'failed'` column and a Vercel cron at `/api/gifts/sweep-tx` that re-checks any row in `broadcast` older than 5 minutes.
- **Mainnet alert.** Until this is fixed, every "claimed" gift is provisional.

### P0-2. WalkClient regex swallows the "someone else stole it" error and pushes the user into "Not your gift" purgatory.
- **File:** `src/app/gift/[short_code]/walk/WalkClient.tsx:922-928`.
- **Root cause:**
  ```ts
  if (!openRes.ok) {
    const alreadyMine =
      openData?.already_open === true ||
      (typeof openData?.error === "string" && /already.*opened|status:\s*spawned/i.test(openData.error));
    if (!alreadyMine) throw new Error(openData?.error || "Failed to open gift");
  }
  ```
  The server **only** returns `already_open: true` with HTTP 200 (`open/route.ts:74-83`). On HTTP 410 the payload is `{ error: "Gift already opened" }` (line 86) — that string matches the regex. The client therefore *swallows* the loss, proceeds to `/catch`, which responds `"Not your gift"` (catch/route.ts:51), and dumps the user into `step.kind === 'fatal'` with a single "Back" button (lines 1488+). The fatal screen's Back button bounces to `/gift/[code]` where the landing's preview *still shows the gift as catchable*, so the user can loop forever.
- **Repro:** Two devices on the same anonymous gift link. Device A walks to within 5m. Device B opens the link, signs in, walks faster, catches. Device A presses Catch — flow continues into auth modal → wallet creation → "Not your gift" red screen.
- **Exact fix:**
  ```ts
  if (!openRes.ok) {
    // Server returns already_open ONLY with 200. Any !ok is a real terminal.
    router.replace(`/gift/${code}?status=410`);
    return;
  }
  ```
  And in `GiftLandingClient.tsx`, when `status` query is `410` or the fetched gift's `status` is `spawned` but `recipient_id !== me`, render a polite "this gift was just caught by another hunter — send your own?" with deep links to `/gift/new` and `/watch`.

### P0-3. Double-tap on Catch races itself; success state is then overwritten by "fatal".
- **File:** `src/app/gift/[short_code]/walk/WalkClient.tsx:896-943` (`runClaim`), `945-956` (`attemptCatch`).
- **Root cause:** `attemptCatch` guards only on `step.kind !== "navigating"`. A fast double-tap fires two `runClaim`s before React commits `setStep({kind:"catching"})`. Server-side the second `/catch` returns 410 ("Already caught" — line 113 of catch/route.ts) which the client interprets as a fatal. The fatal `setStep` then overwrites the *first* call's `setStep({kind: "claimed"})`. Net: successful claim, confetti for ~80ms, then red error screen. The user thinks the claim failed and may try again — leading to support tickets and possibly even chargeback panic.
- **Exact fix:** Add a ref guard before any setState:
  ```ts
  const submittingRef = useRef(false);
  const attemptCatch = useCallback(async () => {
    if (submittingRef.current) return;
    if (step.kind !== "navigating" || !withinCatch) return;
    submittingRef.current = true;
    try { await runClaim(); } finally { submittingRef.current = false; }
  }, [step.kind, withinCatch, runClaim]);
  ```
  Also: in `runClaim`'s catch branch, only set fatal if `step.kind !== 'claimed'`.

### P0-4. Toggle-mode catch bypasses the server distance check entirely; client-side 5m gate is the only proximity defence.
- **Files:** `src/app/api/gifts/[short_code]/catch/route.ts:85-102`, `src/app/gift/[short_code]/walk/WalkClient.tsx:24`.
- **Root cause:** When the client sends `via_toggle: true`, the route skips the `haversineM(avatar, spawn) > CATCH_RADIUS_M` check (lines 85-102 are inside `if (!viaToggle)`). The only validation is that the *open* was also via toggle (lines 68-73). The avatar heartbeat at `gift_avatars` is **never POSTed during virtual walks** (grep confirms zero `fetch('/avatar`...)` calls in WalkClient). A modified client can `POST /catch` with any `avatar_lat/avatar_lng` and a true `via_toggle` immediately after `/open` — and pocket the asset. Mainnet ETH/BLINK/NFTs are on the line.
- **Exact fix (minimal):** In `catch/route.ts:75-83`, after the spawn select, compute `haversineM(body.avatar_lat, body.avatar_lng, spawn.true_lat, spawn.true_lng)` and reject if `> CATCH_RADIUS_M` regardless of `viaToggle`. The client already only sends coordinates when within 5m so this is invisible to honest players.
- **Better fix:** Require an avatar heartbeat history (≥3 GPS points within the last 60s and a total walked distance ≥ `pickSpawnPoint` distance - 20m). Wire `POST /avatar` from the WalkClient tick loop at ~5s cadence (server already supports 120/min at `avatar/route.ts:20`).

### P0-5. No `ErrorBoundary` and no `error.tsx` anywhere under `src/app/gift/**` or around `<HuntMap>`.
- **Files affected:** `src/app/gift/[short_code]/page.tsx`, `walk/page.tsx`, `hunt/page.tsx`; `src/app/watch/page.tsx:892`; `src/app/map/page.tsx:814`. `src/components/error-boundary.tsx` exists but is never used. `error-boundary.tsx:31` POSTs to `/api/errors` which **does not exist** (no route file in `src/app/api/errors/`) so even unwrapped crashes that bubble go nowhere.
- **Root cause:** Mapbox throwing during init (bad token, WebGL disabled, container removed mid-init), or any render crash in the gift walk, unmounts the whole route and yields a stock Next 500 with no recovery link. Recipients of a mainnet gift land on a white screen.
- **Exact fix:**
  1. Add `src/app/gift/error.tsx` that renders `<a href={`/gift/${params.short_code ?? ""}`}>Retry your gift</a>`.
  2. Wrap `<HuntMap>` in `<ErrorBoundary fallback={<MapDownState/>}>` on `watch/page.tsx:892` and `map/page.tsx:814`.
  3. Create `src/app/api/errors/route.ts` (POST handler that calls `console.error` and increments a Supabase `client_errors` row), or remove the call at `error-boundary.tsx:31`.

---

## P1 — High-impact polish / UX wins

### P1-1. Sender opens own gift → walks → wallet sign-up → 400. No preflight.
- `open/route.ts:53-55` returns 400 "You can't open your own gift". `GET /api/gifts/[short_code]/route.ts:60` explicitly hides `sender_id`, so the landing has no idea the viewer is the sender. **Fix:** include a server-derived `you_are_sender: boolean` in the public response (compute server-side from the bearer token; never echo `sender_id`). Landing should render "This is your gift — copy link / cancel & refund / view send history" instead of the recipient hero.

### P1-2. Walk progress lost on tab reload.
- `WalkClient.tsx:482-515`. On resume the server returns the original anchor in `avatar.anchor_lat/lng`, but the client throws away `avatar.lat/lng` and seeds `virtualPosRef` from the anchor. iOS Safari reaps tabs after ~30s; users restart at the IP geocode point every time.
- **Fix:** read `data.avatar.lat/lng` (already returned by the server at open/route.ts:80) and seed `virtualPosRef.current = { lat: avatar.lat, lng: avatar.lng }`. Periodically POST `/avatar` during the walk to update the server's `avatar_lat/lng`.

### P1-3. Settings → "Sound Effects" / "Haptic Feedback" / "Push Notifications" / "Distance in Miles" toggles are placebos.
- `src/components/SettingsSheet.tsx:580-646` writes to `mm_settings` localStorage. **Nothing reads it.** Real sound mute lives in `blink:sound:enabled` written only by the floating `SoundToggle.tsx:50-69`. `game-feel.ts:96 haptic()` fires vibrate unconditionally. There is no service worker (`grep navigator.serviceWorker` returns 0), no `Notification.requestPermission`, no `pushManager.subscribe`. Distance UI is always meters.
- **Fix:** Wire each toggle to its real consumer (sound → `sounds.setEnabled`; haptic → `game-feel.haptic` gate; remove push/miles until they ship; add a banner saying "Cross-device sync requires sign-in").

### P1-4. Privacy Center misroute. Users can't find Ghost Mode.
- `SettingsSheet.tsx:564` (and similar) routes "Privacy Center" → `/privacy` (the legal policy). The actual `PrivacyToggle` component is only mounted at `src/app/friends/page.tsx:87`. **Fix:** Route to a new `/profile/privacy` page that renders `<PrivacyToggle>` + intro copy.

### P1-5. CinematicLoad / Eye Orb capture animation is not used on the gift landing or walk.
- `src/components/CinematicLoad.tsx` is only invoked from `src/app/page.tsx`. The actual gift links — the most-shared deep-link in the product — show `"Unwrapping…"` plain text (GiftLandingClient.tsx:197) and `"Loading walk mode…"` (WalkClient.tsx:973). The eye-orb capture animation that *should* be the catch payoff is instead the *opening* intro (`WalkClient.tsx:1146-1359`).
- **Fix:** Move the orb cinematic to the catch moment (between Catch press and success card). On the landing, use `CinematicLoad` for the preview fetch. The 1.5s opening can become a 400ms fade.

### P1-6. Cinematic intro has no skip on repeat visits — total time-to-play ≈ 4.5s.
- `WalkClient.tsx:54` (`OPENING_CINEMATIC_MS = 1500`) + map intro `INTRO_FIT_MS=1500` + `INTRO_SETTLE_MS=800` (lines 542-593). Overlay has `pointerEvents: "none"` so user can't tap to skip.
- **Fix:** Record `localStorage.setItem(`blink:cin:${code}`, "1")` after first run; shorten subsequent to 350ms. Add an invisible `pointerEvents: "auto"` tap-to-skip layer.

### P1-7. No "first catch ever" celebration; no share prompt after catch.
- `WalkClient.tsx:1573-1672` (and `hunt/page.tsx:531-635`) show "Done" → `router.replace('/gifts')`. No share. Compare to `src/app/gift/new/page.tsx:207-216` which has telegram/x/sms/native share. **Fix:** Add share buttons to the success card; detect first-catch (count claimed gifts for the user) and trigger a full-screen "First Spirit captured" badge + ambient track.

### P1-8. Hardcoded `etherscan.io/tx/...` in success cards.
- `WalkClient.tsx:1655` and `hunt/page.tsx:613`. If you ever launch on Base/Optimism/Arbitrum, these links break silently. **Fix:** read from a `getExplorerTxUrl(chainId, hash)` helper.

### P1-9. iOS AR compass permission requested outside a user gesture.
- `src/app/ar/page.tsx:153-171` calls `DeviceOrientationEvent.requestPermission()` on mount. Safari iOS requires a user gesture; this silently fails and `heading` stays `null` forever.
- **Fix:** Add an "Enable Compass" button on AR mount that calls the permission request inside its onClick.

### P1-10. `setAvatarPos` fires every 60ms → React rerender chain rerenders Compass+Minimap+vignette every tick.
- `WalkClient.tsx:773` and the dependent renders at 1006-1015. Significant CPU cost on cheap Android.
- **Fix:** throttle `setAvatarPos` to 250ms, or move minimap/vignette to refs + imperative DOM updates.

### P1-11. WalkClient does no `document.hidden` pause.
- No `visibilitychange` listener anywhere in WalkClient. The 60ms tick keeps running on backgrounded tabs (iOS will throttle JS but Mapbox queues GPU work; the 900ms approach-loop interval at `game-feel.ts:265` keeps audio firing).
- **Fix:** Pause `tickHandleRef`, `watchPosition`, and `stopApproach()` on `visibilitychange === 'hidden'`; resume on visible.

### P1-12. Mapbox calls `m.easeTo(...)` every tick (60ms) even when avatar isn't moving.
- `WalkClient.tsx:722-735`. **Fix:** gate on `Math.abs(prevLat - eff.lat) > 1e-7 || prevLng != lng`.

### P1-13. Joystick deadzone is effectively zero.
- `JOYSTICK_DEADZONE = 0.04` of `maxR = 44px` ≈ 1.76px (`WalkClient.tsx:29, 810`). Industry norm 8-15%. **Fix:** `0.10`.

### P1-14. No skip / no haptic build-up at catch.
- Only `HAPTIC.TAP` and `HAPTIC.CATCH_SUCCESS` are used. `HAPTIC.WIND_UP` and `HAPTIC.PROXIMITY` are defined in `src/lib/game-feel.ts` but never called. **Fix:** Fire `HAPTIC.PROXIMITY` at 25m, `HAPTIC.WIND_UP` at 5m, then catch success.

### P1-15. `/hunt` redirects anonymous users to landing while `/walk` lets them play.
- `src/app/gift/[short_code]/hunt/page.tsx:99-101` bounces anon users. The landing offers both CTAs side-by-side for signed-in users; anon users have to know to pick "Walk to It" not "Allow Location & Walk to It". **Fix:** either deprecate `/hunt` in favor of `/walk` with optional real-GPS overlay (recommended), or retrofit anon support in `/hunt`.

### P1-16. Two competing inline auth forms.
- `GiftLandingClient.tsx:376-431` has its own signup/signin form duplicating `AuthModal.tsx`. Drift risk + cognitive clutter. **Fix:** Delete the inline form; rely on the modal triggered at catch time.

### P1-17. Mapbox token has no missing-token guard.
- `HuntMap.tsx:10`, `WalkClient.tsx:81-82`, `GiftHuntMap.tsx:17`. `process.env.NEXT_PUBLIC_MAPBOX_TOKEN!` will assign `undefined`; map silently 401s. **Fix:** runtime guard with a `<MapDownState>` and a console.error in dev.

### P1-18. CSP / Mapbox abuse risk: single global token, no URL allowlist enforced in code (must be done in Mapbox dashboard).
- Action item: verify Mapbox dashboard URL allowlist + scope tokens; consider per-surface tokens (landing/AR vs main map).

### P1-19. Map: no `minZoom` cap → world tiles fetched if user pinches out fully.
- `HuntMap.tsx:520-525`. **Fix:** add `minZoom: 9, maxZoom: 20`.

### P1-20. Map: hardcoded NYC fallback when GPS denied.
- `HuntMap.tsx:520` `[-74.006, 40.7128]`. Sydney users see Manhattan. **Fix:** use `navigator.language` heuristic or a Cloudflare-IP header lookup; or render a world view with no user dot.

### P1-21. `/map` fetches *all active orbs globally* with no bbox.
- `src/app/map/page.tsx:305-308`. Will not scale. **Fix:** add a bbox parameter computed from the current Mapbox viewport.

### P1-22. `/map` recomputes haversine + BESTIARY.find for every orb on every GPS update (1 Hz × N orbs × ~60 bestiary entries).
- `src/app/map/page.tsx:399-415`. **Fix:** Build a `Map<string, Creature>` once for BESTIARY; useMemo on `[orbs, userPosition?.lat]`.

### P1-23. HuntMap re-creates markers on every state update.
- `HuntMap.tsx:819-828, 903-910, 992-1000, 1027-1035, 1074-1082`. **Fix:** diff existing markers by id, call `setLngLat` only when moved.

### P1-24. No accuracy filter on GPS fixes.
- `/watch/page.tsx:706-719, 682-693` and `/map/page.tsx:262-274`. A 5km IP-cached fix lands the dot in the wrong city. **Fix:** `if (pos.coords.accuracy > 100) return;` before `setUserPosition`.

### P1-25. `next.config.js:3-4` — `ignoreBuildErrors: true` + `ignoreDuringBuilds: true`.
- The whole build ships known TS + ESLint errors. Refactors land with broken interfaces. **Fix:** flip both to `false`, fix the backlog, then keep them off.

### P1-26. No Sentry, no `/api/errors` route.
- `error-boundary.tsx:31` POSTs to `/api/errors` that doesn't exist. **Fix:** wire `@sentry/nextjs` (cheap tier) OR ship the missing route.

### P1-27. Catch button has no `env(safe-area-inset-bottom)`.
- `WalkClient.tsx:1820` `bottom: 48`. iOS Safari toolbar overlap. **Fix:** `bottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)'`.

### P1-28. WalkClient avatar heartbeat never POSTed.
- See P0-4 above. Avatar speed-cap + fence on the server (`avatar/route.ts:12-14, 77`) protect a code path the client never exercises. Dead anti-cheat infrastructure.

### P1-29. Client walk speed (3.0 m/s) > server avatar cap (2.8 m/s effective).
- `WalkClient.tsx:25` vs `avatar/route.ts:12-14`. Latent landmine: the moment heartbeat is wired up, every full-magnitude push gets HTTP 400 "Moving too fast". **Fix:** match speeds (2.5 m/s client / 3.5 server, or accept the truth that joystick is a *virtual* walk and bump server cap to 5 m/s).

### P1-30. Race between `/catch` and `/cancel` can leave gift "claimed" after sender saw "Refunded".
- `cancel/route.ts:42-45` updates `gifts.status = 'refunded'` without an `.eq('status','spawned')` guard. `catch/route.ts:154-162` updates `gifts.status = 'claimed'` without an `.eq('status','spawned')` guard. The atomic creature claim protects double-spend but not the gift row. **Fix:** both UPDATEs must be conditional on the prior status; the loser unwinds.

### P1-31. Friends `respond` route has read-then-update race.
- `src/app/api/friends/respond/route.ts:24-49`. Two simultaneous Accept POSTs both pass the `pending` check. **Fix:** conditional UPDATE with `.eq('status','pending')`.

### P1-32. Leaderboard endpoint is public, unrate-limited, returns every profile.
- `src/app/api/leaderboard/route.ts:32-36`. No pagination, no `private`-flag filter, no rate limit, no `requireAuth`. Exposes every signed-up user. **Fix:** add `.eq('private', false)`, paginate by `mm_score` cursor, rate-limit by IP.

### P1-33. `rateLimitByUser` is in-process memory only.
- Used everywhere in `gift-*` routes. Multiple Vercel lambda instances → no shared counter → users can quietly squeeze 10× through. **Fix:** Upstash Redis token-bucket via `@upstash/ratelimit`.

### P1-34. Wallet creation latency hidden inside catch-time signup modal.
- `AuthModal.tsx:305` shows "Working..." while signup creates wallet (~10s). The landing form warns about this (GiftLandingClient.tsx:429); the modal doesn't. Users perceive a hang. **Fix:** render "Creating your wallet — this takes ~10s" inline.

### P1-35. AuthModal closes on outside click — easy to dismiss mid-signup when iOS keyboard appears.
- `AuthModal.tsx:116`. **Fix:** require explicit close button; ignore outside click during `submitting`.

### P1-36. AuthModal default tab is signup; returning users have to switch.
- `AuthModal.tsx:1134`. **Fix:** check Supabase session in localStorage; default to whichever the user used last.

---

## P2 — Medium polish

- `/watch` runs **two** `watchPosition` registrations after permission grant; second one (`startGpsWatch`) is not cleaned up on unmount (`watch/page.tsx:677-693`).
- `/watch` realtime channel never gates on `document.visibilityState` (line 764-786). Drains battery in background tabs.
- Mapbox layer/style: `mm-hunt-styles` `<style>` element injected at `HuntMap.tsx:506-511` is never removed.
- Settings sheet has a load/save effect race that briefly writes defaults over user state (`SettingsSheet.tsx:419-449`). React 18 ordering masks it; fragile.
- Onboarding (`OnboardingWalkthrough`) only wired in `/watch`. First-time recipients arriving via gift link never see the 6-screen explainer.
- `/walk` and `/ar` hide BottomNav by *accident* (not in `SHOW_SHELL_PATHS`, not in `HIDE_SHELL_PREFIXES`). Adding a new route silently affects nav. Make explicit.
- Hex grid toggle (`watch/page.tsx:662`) is dead — no layer rendered. Either implement or remove.
- AR page (`ar/page.tsx:196-201`) fetches all orbs once, never refreshes; doesn't reproject on rotate; hardcoded 60° FOV.
- `lib/bestiary.ts` is a static 20-creature array. No "owned/20" progress meter, no completion celebration. Most-wanted micro-feature.
- `useBlinkHoldings` invoked separately by `BestiarySection` and `YourBestiary` — two round-trips. Wrap in React Query (already in the bundle for wagmi).
- Joystick sensitivity is linear; add an exponential curve (1.5-2.0) for fine control near deadzone.
- Approach-loop audio: oscillates at the 100m boundary (no hysteresis); cadence stays 900ms regardless of distance (`game-feel.ts:265`). Add a Geiger-counter ramp.
- Recently-panned pause is 3000ms (`WalkClient.tsx:30`); 1500ms more typical.
- 40 `console.log/error/warn` calls remain across 22 files — server-side ones include wallet PII paths.
- `package.json` carries both `leaflet` and `mapbox-gl`; `leaflet` is unused (~150kb). Drop it.
- `next.config.js` has no `output: 'standalone'` for smaller container image.
- BLINK token contract address (`gift-escrow.ts:41`) is hardcoded; should match `NEXT_PUBLIC_*` env vars like the NFT addresses do.
- Genesis token IDs >20 fall through to default name/image in `wallet-nfts.ts:94-96, 242-244`. Tighten to `if (id > 20) throw`.
- Sender pre-check at gift creation doesn't acquire a per-sender lock; a sender gifting twice near their balance ceiling can pass both validates but only one claim will land.
- No nonce coordination across concurrent claims on the same sender — second concurrent ETH claim picks the same `pending` nonce.
- `executeBlinkClaim` / `executeNFTClaim` don't pass explicit nonce (only `executeETHClaim` does).
- `/map` lacks `overscroll-behavior: none` on root; pulling map past top scrolls parent page on iOS.

---

## P3 — Future ideas (nice-to-haves)

- Push notifications via Web Push (or fall back to Telegram bot which is already wired in `lib/telegram.ts:145`).
- True service worker for offline map tile cache + cached gift-link previews.
- Friends-only leaderboard / weekly leaderboard reset.
- AR mode with WebXR + plane detection (the current bearing projector is a placeholder).
- Background-sync of `caught_at` timestamps + a passive "spirit nearby" notification when the user is within 50m of a spawn.
- Squad raids — multiple players co-walk a single high-value spawn.
- Gift-back / re-gift loop: after claim, prompt to send a Spirit Gift to a friend.
- Streak system tied to the Bestiary; visible "owned/20" progress.
- Procedural creature naming for the player's first capture.
- Telegram in-bot inline gift wrapping (already half-wired in `gift/new`).
- Cosmetic walk-trail customisation tied to NFT ownership.

---

## Pokémon GO gap analysis

| Dimension | GO | BLINK | Verdict |
|---|---|---|---|
| Map vibe | Static, slightly cartoon | Aurora overlays + iris pulses + Eye orb cinematic | **WIN** |
| Catch animation | Polished, multi-stage, AR ring | Confetti + sound, no haptic build-up, opening cinematic isn't reused for catch | **TIE** (theirs is more polished but BLINK's is more original) |
| AR | Real ARCore/ARKit | Camera + DOM-positioned orbs, iOS compass broken, no SLAM | **LOSE** |
| Notifications | Native push | None | **LOSE** |
| Friends/social | Friends, raids, trading | Friends list + presence (Ghost/Friends/Public) | **TIE** — BLINK's privacy UX is actually better; their raids/trades are way ahead |
| Onboarding | 4 screens, mascot | 6-screen walkthrough only on /watch, never seen by gift recipients | **LOSE** |
| "Pokédex" | 1000+ creatures + completion confetti | 20 static creatures, no progress meter | **LOSE** |
| First-catch celebration | Full-screen, mascot voice, music | Same modal every time | **LOSE** |
| Loot loop | Capture → evolve → battle → trade | Capture → claim NFT/ETH/BLINK → share gift back | **TIE** — different but real |
| Reward latency | Instant XP, candy | On-chain tx (no `tx.wait()` — sometimes silently doesn't arrive) | **LOSE** until P0-1 fixed |
| Wallet onboarding | N/A | Custodial server-generated wallet, ~10s | **WIN** vs forcing MetaMask |
| Gift links | N/A — needs install + login | URL → walk → catch, anon walk works | **MASSIVE WIN** |
| Offline | Partial (caches profile) | None (no SW) | **LOSE** |
| Battery | Heavy on hot day | Heavier — no visibility pause, 60ms tick, all animations always run | **LOSE** |
| Eye orb / brand | Generic Pokeball | Eye orb is iconic | **WIN** |

**Concrete deltas to win outright:** ship P0-1/2/3/4 (safety + correctness) + P1-5/7/11 (cinematic at catch, first-catch celebration, visibility pause). With those alone, BLINK has a shareable gift loop GO cannot match.

---

## Prioritized 7-day roadmap

### Day 1 — Stop the bleeding (mainnet safety)
- P0-1: `tx.wait(1)` in all three `execute*Claim` functions. Add `tx_status` column + sweeper.
- P0-2: Replace the regex in `WalkClient.tsx:922-928` with strict `already_open === true`; route 410s back to landing.
- P0-3: Add `submittingRef` to `attemptCatch`; don't let "fatal" overwrite "claimed".
- P0-4: Server-side distance check in `catch/route.ts` regardless of `via_toggle`.
- P0-5: `app/gift/error.tsx` + `ErrorBoundary` around `HuntMap` + ship `/api/errors` route OR remove the call.
- Conditional UPDATEs on `gift.status` in cancel + catch (P1-30).
- Conditional UPDATE on `friends.respond` (P1-31).

### Day 2 — Recovery UX & sender preflight
- P1-1: Add `you_are_sender` to `GET /api/gifts/[code]` and render sender variant on landing.
- P1-2: Persist + restore avatar position on `/walk` resume.
- P1-15: Deprecate `/hunt` (or hide its CTA for anon users on landing).
- P1-16: Delete inline auth form on landing.
- Cancel/Catch race conditional update fix (P1-30) verified end-to-end.

### Day 3 — First-impression polish
- P1-5: Move eye-orb cinematic to the catch moment. Use `CinematicLoad` on the landing preview spinner.
- P1-6: Tap-to-skip + first-visit recording on opening cinematic.
- P1-7: Share buttons on success card; first-catch detection + full-screen badge.
- P1-8: Replace hardcoded etherscan with chain-aware helper.
- P1-27: Add safe-area inset to catch button.

### Day 4 — Battery + perf
- P1-10: Throttle `setAvatarPos` to 250ms or move to refs.
- P1-11: `visibilitychange` pause for tick loop, GPS, audio.
- P1-12: Gate `m.easeTo` on actual movement.
- P1-22: Memoize `orbsWithDistance` with a BESTIARY Map.
- P1-23: Don't recreate markers; diff + `setLngLat`.
- P1-19: `minZoom: 9, maxZoom: 20` on Mapbox.
- P1-24: Reject low-accuracy GPS fixes.

### Day 5 — Toggles & settings honesty
- P1-3: Wire (or hide) all four placebo toggles in Settings.
- P1-4: New `/profile/privacy` page that mounts `PrivacyToggle`.
- P1-13: Joystick deadzone to 10%.
- P1-14: Wire `HAPTIC.PROXIMITY` + `HAPTIC.WIND_UP`.
- P1-34/35/36: Inline "wallet creation ~10s" copy in modal; no outside-click dismiss while submitting; remember last-used auth mode.

### Day 6 — Server hygiene
- P1-17/18: Token guards in `HuntMap`, `WalkClient`, `GiftHuntMap`; verify Mapbox dashboard allowlist.
- P1-21: Bbox parameter on `/map` orbs fetch.
- P1-32: Pagination + `private` filter + rate limit on `/api/leaderboard`.
- P1-33: Move rate-limiter to Upstash.
- P1-28/29: Wire avatar heartbeat from WalkClient; reconcile speed limits.
- P1-25: Flip `ignoreBuildErrors`/`ignoreDuringBuilds` to `false`, fix the resulting backlog (may overflow into Day 7).
- P1-26: Wire Sentry.

### Day 7 — Joy
- P1-9: User-gesture button for iOS compass on /ar.
- Bestiary completion meter ("owned/20") + first-completion celebration (P2).
- Approach-loop Geiger ramp (P2).
- Cull `leaflet` (P2).
- Onboarding walkthrough for gift-link recipients (P2).
- Decide on AR's future (WebXR vs polish current vs deprecate).

End-of-week deliverable: a Spirit Gift link that's faster, safer, and more delightful than GO at the catch moment — and a server side that won't quietly lose an NFT.
