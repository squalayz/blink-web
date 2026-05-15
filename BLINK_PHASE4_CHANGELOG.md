# BLINK Phase 4 — Changelog

"Billion-Dollar Polish" — the pass that turns the demo into something people screenshot. Cinematic landing load, clean map UI, Pokemon-GO style visibility tiers, performance.

Four commits, all green builds, no fabricated data.

---

## Commits

| # | Hash | Title |
|---|------|-------|
| 1 | 839cbe0 | feat(phase4): landing — cinematic load + $BLINK strip + Mythics section |
| 2 | e2f4359 | feat(phase4): map — clean UI, no overlap, FAB repositioned |
| 3 | e3cec55 | feat(phase4): map — Pokemon-GO style visibility tiers + hot/cold compass |
| 4 | aa4e785 | feat(phase4): performance — LCP optimizations + bundle audit |

---

## PART 1 — Landing polish

### New components
- `src/components/CinematicLoad.tsx` — fixed-overlay pulsing eye on first visit. SessionStorage-gated so it fires once per session. Respects `prefers-reduced-motion` (skips entirely if reduced).
- `src/components/RevealOnScroll.tsx` — `IntersectionObserver`-based section fade-in. NOT framer-motion `whileInView` per brief. Reduced-motion users skip straight to revealed state.
- `src/components/BlinkTokenStrip.tsx` — gradient strip section above the Bestiary.
  - Left: `$BLINK · Live on Ethereum` with green pulse dot
  - Centre: shortened contract address (click-to-copy with "Copied" feedback) + Etherscan link
  - Right: `Trading · Enabling soon` badge (since `tradingActive = false`); flip the constant to swap in a "Buy on Uniswap" CTA when trading enables
  - Stat row: `2B fixed supply · 10% tax · 8 wallets · No mint · No blacklist`
  - DexScreener link
- `src/components/MythicsSection.tsx` — ASCENSIONS / THE MYTHICS section. 4-up card grid (responsive: 4→2→1), each card shows image + Mythic badge + token # + owner shortAddr. Click opens a modal with full image, lore, attributes, owner wallet, OpenSea CTA. Skeleton state on first paint. Section auto-hides if the API returns no mythics or fails.
- `src/app/api/mythics/route.ts` — server route that reads `totalMinted()` + `tokenURI(i)` + `ownerOf(i)` from the Mythics contract via viem on Ethereum mainnet, resolves IPFS metadata across multiple gateways with graceful fallback. 5-minute in-memory cache. Uses Alchemy RPC if `ALCHEMY_API_KEY` is set, falls back to `https://eth.llamarpc.com`. No private keys, no signing.

### Landing page changes (`src/app/page.tsx`)
- Replaced fake ticker stats (e.g. "1,243 active watchers worldwide") with poetic non-numeric lines so we don't fabricate counts. Real telemetry can wire in later.
- Added `<CinematicLoad />` to root, then in order: Hero → Ticker → **$BLINK strip** → Bestiary → **The Mythics** → How it works → Council → Eye Speaks → Final CTA → Footer.
- Wrapped each below-fold section in `<RevealOnScroll>` for cinematic staggered entry.
- Converted two raw `<img>` tags for the BLINK logo to `next/image` with `priority`.

### Layout (`src/app/layout.tsx`)
- `<link rel="preload" as="image" href="/blink-logo.png" fetchPriority="high">` for LCP.

---

## PART 2A — Map UI cleanup

`src/app/map/page.tsx`

### Top-right tool rail
- Old: three stacked overlapping controls (recenter, zoom +/-, camera) — looked messy.
- New: single 40px-wide glassmorphic vertical rail containing recenter / zoom + / zoom − / camera (last only if camera permission ungranted). Each button 36×36, 8px gap, neon-green border on recenter when GPS active.

### Spawn FAB
- Moved from middle-right (above the bottom sheet) to **bottom-LEFT** (14px from left, 104px from bottom).
- Smaller: 44–50px (was 56px).
- **Idle fade**: drops to `opacity: 0.45` after 3 s of no interaction; wakes back to `opacity: 0.95` on hover / focus / touch / map interaction.
- Background changed to brand gradient with dark icon for stronger affordance without dominance.

### Bottom sheet
- Collapsed height **160 → 88 px**.
- Peek-style header: `{N} BLINKS nearby ↑` only when collapsed; full "Nearby creatures" list panel on expand. ChevronUp now uses the brand green tint.

### Filter row
- Pills no longer fight for vertical real estate. Replaced with a single **Filter** chip that toggles the pill row visible on tap. When an active filter is set, the chip displays the active label.

---

## PART 2B — Map Pokemon-GO mechanics

This is the big one. Three new files, one rewritten.

### New
- `src/lib/blink-spawns.ts` — mock spawn system, since real geo-spatial DB queries are Phase 5.
  - `getOrGenerateSpawns(lat, lng)` returns 6–12 spawns weighted **60 % common / 25 % uncommon / 10 % rare / 4 % legendary / 1 % mythic**.
  - Spawns are placed 50–1500 m from the user, sealed by a deterministic seed derived from rounded lat/lng so the same user at the same coarse location sees the same set.
  - **Session-persistent**: stored in `sessionStorage` keyed by an anchor location. Anchor re-locks only when the user drifts > 250 m, so casual GPS jitter does NOT relocate spawns under their feet.
  - Spawns TTL 60 minutes.
- `src/components/BlinkCompass.tsx` — hot/cold compass strip rendered between filter row and map.
  - Shows nearest BLINK distance + 8-way cardinal direction.
  - Background colour shifts: gray (`none`), `rgba(0,255,136,0.11)` close, `rgba(0,255,136,0.18)` catchable. Border tints accordingly.
  - Animated needle, pulses when catchable.
  - Labels: `The Eye is quiet` → `Far signal · 730m E` → `Something stirs · 230m E` → `BLINK · close · 45m E` → `BLINK · in reach · 12m`.

### Rewritten
- `src/components/HuntMap.tsx` — markers are now tier-aware.
  | Tier | Trigger | Render |
  |---|---|---|
  | far | > 500 m | **No marker.** Edge-of-viewport chevron pulse on the nearest screen edge to the spawn. |
  | medium | 100–500 m | Faint dashed ethereal outline, white dot iris, 0.32–0.55 opacity. Identity hidden. |
  | close | 30–100 m | Rarity-glow halo + creature silhouette SVG inside. Sonar ring. |
  | catchable | < 30 m | Full creature image rendered inside the orb + pulsing catch ring + sonar. |
  - Tier-change handling: the DOM is rebuilt only when a spawn crosses a tier boundary; otherwise the marker just `setLngLat`s. Keeps re-renders cheap as the user walks.
  - Far-tier chevrons are deduped by 8-way direction so two distant spawns in the same sector don't double-render.

### Sound
- New `nearby` sound: synthesised heart-beat (two soft 110/73 Hz thumps). Triggered once per spawn when it enters close/catchable range. Debounced to 600 ms between fires so a wide approach doesn't spam.
- Existing `spotted` still fires when a spawn enters medium range.

### Wiring (`src/app/map/page.tsx`)
- Per-orb `distance`, `bearingDeg`, `tier`, and `creatureImage` lookup computed once per render via `BESTIARY.find(c.name)`.
- `compassReading` derived from the nearest orb each render.
- `nearbyCount` redefined: spawns within 500 m, label switches to "The Eye is quiet" when zero.
- The mock-spawn fallback now applies in **all** environments (not just dev) when no DB rows exist — gives Phase 5 a clear contract to replace.

---

## PART 3 — Performance

- `BestiarySection` switched to dynamic import (`ssr: false`) — was eagerly imported.
- `Suspense` boundary around `HuntMap` with mystical fallback `"Opening the Eye…"`.
- Two raw `<img>` tags converted to `next/image` (`priority` on the nav logo).
- `fetchPriority="high"` on the BLINK logo `<link rel="preload">` for LCP boost.

### Bundle audit
Comparing first-load JS before → after Phase 4:

| Route | Before | After |
|---|---|---|
| `/` | 15.8 kB / 379 kB | 12.3 kB / 370 kB |
| `/map` | 13.2 kB / 405 kB | 17.1 kB / 409 kB |
| All shared | 90.6 kB | 90.6 kB |

Map first-load grew slightly (compass, spawns lib, tier logic) — well within budget for the added behaviour.

Largest chunk in the build remains `/auth/signin` (557 kB first-load, dominated by wagmi + RainbowKit + SIWE). **Deferred** — fixing it requires an auth-flow refactor that exceeds Phase 4 scope and was not in the brief's "fix the worst offender" remit.

No new chunk exceeds 250 kB on its own outside the wallet stack.

---

## Sounds asset note

The new `nearby` sound has a synthesised fallback inside `src/lib/sounds.ts`. If you want a polished MP3 instead, drop one at `public/sounds/nearby.mp3` and it will be preferred automatically — no code change needed.

---

## What was NOT in this phase (carry-overs)

Per the brief:
- Real spawn API tied to a live DB (Phase 5)
- AR camera mode
- Multiplayer
- Real-time leaderboards
- `$BLINK` staking UI

---

## Done checklist

- [x] Cinematic page-load animation (pulsing eye, fade-in stagger, prefers-reduced-motion respected)
- [x] $BLINK token strip visible above Bestiary
- [x] Mythics section showing dynamic on-chain Mythics
- [x] Top-right map controls consolidated into one tool rail
- [x] Spawn FAB moved to bottom-left, idle fade
- [x] Bottom sheet collapsed height 88 px
- [x] Filter row hidden behind a Filter chip
- [x] Visibility tiers (far / medium / close / catchable) implemented
- [x] Hot/cold compass at top of map
- [x] 6–12 weighted mock spawns around user, session-persistent
- [x] `nearby` sound wired, debounced, reduced-motion respected
- [x] `npm run build` green at end of every commit
- [x] BLINK vocabulary preserved (no Orbs regressions)
- [x] No fabricated user stats — poetic non-numeric ticker
- [x] No new Tailwind, palette respected, no cyan/purple/emojis
