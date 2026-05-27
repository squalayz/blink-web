# BLINK Flawless Experience — Map + Catch + Wallet/Chat Polish Pass

## Mission

Make the **map → spawn → approach → catch → reward** sequence feel like the most polished mobile game ever shipped, while keeping wallet/chat/profile fully accessible via a persistent bottom dock. Everything else is secondary. This is the killer demo.

## Current State (DO NOT REBUILD)

- `src/app/map/page.tsx` exists (2286 lines) — enhance, don't replace
- `src/app/catch/[id]` exists — enhance catch flow
- `src/app/wallet`, `src/app/messages`, `src/app/profile` — exist, ensure they're reachable from dock
- Mapbox GL JS v3 already installed
- Framer Motion already installed
- Zustand for state already installed
- Three.js + R3F installed (use for 3D creature pins above map if performant)

## North Star Principles

1. **60fps always.** If a feature drops below 60fps on iPhone 12 baseline, cut visual complexity, not the feature.
2. **The map never closes.** Wallet, chat, profile = bottom-sheet drawers that slide up over the map. Map keeps rendering underneath (dimmed but alive).
3. **Haptics on every touch.** Use `navigator.vibrate()` with calibrated patterns. iOS Safari has limited support — fallback gracefully.
4. **Loading is invisible.** Pre-fetch spawns, creature images, NFT metadata. No spinners visible to user.
5. **Sound design matters.** Rarity-specific tones, soft hums on approach, catch fanfares. Use Web Audio API for low-latency. Mute toggle in profile.
6. **No menu screens.** App opens directly to map. No login wall — embedded wallet (Privy/Magic) auto-generates on first use if user wants to skip wallet connect.

## The Core Experience to Nail

### 1. App Open (0–2s)
- Black screen → neon-green lightning bolt SVG draws itself (1.2s path animation, framer-motion)
- Bolt explodes into particles that form the map
- Camera Z-axis push from space → city → street (1.5s)
- Subtle low hum building, soft *thmm* on map settle
- User sees map. Never sees a button or menu.

### 2. The Map Layer
- Mapbox style: custom dark navy base (#0a0a14), neon-green road lines (#00FF88) with slow sine-wave opacity pulse
- 60° tilt by default, gyro-driven parallax (subtle, ~3° max sway)
- Player avatar: glowing green dot, pulsing 50m catch-zone halo
- Comet trail behind player (last 30s of GPS path)
- Map breathes — particles drift, pins pulse, grid shimmers every 8s

### 3. Spawn Pin Quality
- 3D creature floating ABOVE the map (not pinned to ground) — use R3F for low-poly creature or animated sprite
- Rarity-tier auras:
  - **Common:** soft green glow
  - **Uncommon:** brighter + sparkles
  - **Rare:** electric arcs to ground
  - **Legendary:** column of light to sky (visible from far map zoom)
  - **Mythic:** sky color shifts in 200m radius around it, distant lightning
- Distance ring under pin with "47m" + arrow if off-screen
- Off-screen spawns: edge-arrows pointing toward them, distance + rarity color

### 4. Approach Mechanic
- 100m: soft hum starts (rarity tone)
- 50m: hum intensifies, green screen-edge vignette
- 25m: creature head turns to look at you
- 10m: screen flash, soft shake, CATCH button materializes, single sharp haptic
- Despawn countdown ring around pin

### 5. The Catch (3-second masterpiece)
- Tap CATCH → map zooms into pin → cinematic black bars iris in
- Creature full-screen, dark gradient bg, floating particles, gyro parallax
- Mini-game variants based on rarity:
  - **Common/Uncommon — The Pulse:** ring contracts, tap in green zone, sub-second
  - **Rare — The Trace:** drag finger along lightning bolt path, ~3s
  - **Legendary/Mythic — The Hold:** progressive vibration build, release at right charge, ~6–8s
- Success: white flash 1 frame → particle explosion → NFT card materializes
- Mythic catch: chrome shatter effect, deep bass thud, screen desaturates everything else briefly
- Card flips → creature art → stats type out (60ms/char) → reward slot-roll
- ETH bonus card descends from top if triggered
- Sharp success haptic punch

### 6. Aftermath Hook
- Card collapses to icon, flies to wallet dock icon
- Wallet icon glows brighter than anything for 3s
- "Streak: 3 catches" flame chip top-left
- A new spawn materializes on the map (mid-rarity, ~200m away) — engineered re-engagement
- Share button floats 5s: "Show off [creature]" — one-tap to TG/X with auto-card image

## Bottom Dock (Persistent Navigation)

Glassmorphic bar at bottom (frosted-blur over map), 4 icons:

| Icon | Action |
|---|---|
| 🗺️ Map | Tap once: recenter. Double-tap: reset zoom+tilt. |
| 💬 Chat | Slide up 75% bottom sheet — global + nearby + DMs |
| 👛 Wallet | Slide up 75% bottom sheet — balance, collection, hex plots |
| 👤 Profile | Slide up 75% bottom sheet — stats, streak, settings |

**Sheets slide up. Map keeps rendering underneath, dimmed to 40–60% opacity.** Never navigate away from map.

## Wallet Sheet (3 tabs)

1. **Balance** — ETH + $BLINK + USD equiv, Send/Receive/Swap/Bridge buttons, recent tx list
2. **Collection** — grid of caught NFT cards, filter by rarity/location/date, tap → full Bestiary card view + Trade/Fuse/List/Share
3. **Hex Plots** — your owned hexes, earnings, manage rent/sell

## Chat Sheet (3 layers)

1. **Global** — community firehose, live legendary catch feed, pinned events
2. **Nearby** — auto-joined room with anyone within 2km, location pins drop into chat → map
3. **DMs / Squads** — direct + 5-person squad chats, in-chat NFT trade UI

## Wallet Onboarding (3 paths)

- **A) Embedded wallet (default):** Privy or Dynamic, generated silently on first catch attempt. Email/phone backup. 95% of users.
- **B) Connect existing:** WalletConnect, MetaMask, Coinbase Smart Wallet
- **C) Hardware (whales):** Ledger/Trezor support for view + on-demand sign

First-catch "holy shit" moment: card flies to wallet icon → wallet auto-opens with "🎉 Your first NFT — you own it on Ethereum forever" → 30s explainer.

## Top Chips (Transient)

- Top-left: 🔥 streak counter, 🏆 active mission
- Top-right: 🔔 notifications, 📡 connection status (only if poor)

Never block map. Always at edges.

## Floating Action Layer (Contextual)

- Friend nearby → small avatar at screen edge, tap to wave/chat/Co-Hunt
- Active Trail → "Continue Trail" pill bottom-center
- Live Event → "Drop in 12 min nearby" countdown
- Co-Hunt available → accept button

Slide in, sit briefly, slide out. Never sticky.

## Mental Modes (UI adapts)

- **Hunting** (default): map + spawns + distance emphasized, chat muted, wallet collapsed
- **Catching** (mini-game): full-screen creature, black bars, everything else hidden
- **Social** (chat open): map dimmed 40%
- **Managing** (wallet/inventory): map dimmed 60%

Transitions <250ms always.

## Tech Requirements

- Mapbox GL JS v3, custom style JSON
- Framer Motion for all transitions
- Web Audio API for sound (no MP3 streaming, use AudioBuffer)
- Vibration API with iOS fallback
- Service Worker for offline catch queue
- Zustand stores: `mapStore`, `walletStore`, `chatStore`, `catchStore`
- Adaptive GPS poll: 1Hz when moving fast (>3 km/h), 0.1Hz when stationary
- Pre-fetch creature images on map load
- All animations GPU-accelerated (transform, opacity only)

## Battery Target

8%/hr drain max (Pokémon GO does 30%/hr). Adaptive frame rate when stationary.

## What to Build FIRST (2-week sprint)

### Week 1
1. App open animation (lightning bolt → map zoom-in)
2. Custom Mapbox style applied (navy + neon green, breathing roads)
3. Player avatar dot + 50m halo + comet trail
4. Spawn pins with 3D creature hovering + rarity auras + distance rings
5. Approach mechanic — proximity-driven audio, haptics, vignette, CATCH button materialization
6. Bottom dock visible (Map, Chat, Wallet, Profile icons — even if some are placeholders)

### Week 2
7. Catch mini-game (start with The Pulse — simplest)
8. Particle system on catch
9. NFT card reveal animation with stats typewriter + reward slot-roll
10. Card-flies-to-wallet animation (THE magic moment)
11. Wallet sheet opens, shows balance + new NFT
12. Embedded wallet (Privy) onboarding for first-time users
13. Sound design — at least 6 audio cues (open, approach hum, catch tap, success, mythic, error)

### Skip for v1 (add in v2)
- Chat sheet (placeholder icon ok)
- Trails, Co-Hunts, Hex Plots, Squads
- AR camera mode (already exists, leave as-is)
- Squads/Districts

## Quality Bar Checklist (per feature)

- [ ] 60fps on iPhone 12
- [ ] Haptic on every touch
- [ ] Audio cue if relevant
- [ ] Loading invisible (pre-fetched)
- [ ] Animation <300ms
- [ ] Works offline (queue, retry)
- [ ] Reduced-motion mode supported
- [ ] No console errors
- [ ] No layout shift
- [ ] Tested on real device

## Existing Files To Enhance (DO NOT REPLACE)

- `src/app/map/page.tsx` — main map
- `src/components/HuntMap.tsx` (or similar)
- `src/components/BlinkCompass.tsx`
- `src/app/catch/[id]/page.tsx` — catch flow
- `src/app/wallet/page.tsx` — wallet (turn into sheet too)
- `src/lib/bestiary.ts` — creature data

## Existing DB Tables To Use

- `wild_spawns` (s2_cell_id, lat, lng, tier, name, image_cid, fuzzy coords)
- `creature_spawns` (rarity, true/fuzzy lat-lng)
- `blink_catches`
- `users` (wallet_address)
- `hex_plots`
- `presence` (for nearby player layer)

## Rules

1. **All code changes via Claude Code (this session).** Never direct file edits — Pasquale's hard rule.
2. **Don't break existing functionality** — `/map` currently works, enhance don't rewrite.
3. **Inline styles only** — zero Tailwind (project rule).
4. **No emojis in UI** (Telegram messages exempt) — use Lucide icons.
5. **No mock data** — pull from Supabase, real spawns only.
6. **Brand colors:** bg #0a0a14, surface #0d0d14, neon green #00FF88, accent cyan #06b6d4 (sparingly).
7. **Test on `npm run dev`** after each major component. Visit http://localhost:3000/map to verify.

## First Action

1. Read `src/app/map/page.tsx` and inventory what's already built
2. Read `src/components/HuntMap.tsx` and related
3. Check current Mapbox style — is it customized or default?
4. Identify the highest-impact polish wins (in this order: approach mechanic → catch animation → bottom dock → app open sequence)
5. Start with whichever gives the biggest "wow" with smallest change

GO.
