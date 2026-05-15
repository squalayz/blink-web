# BLINK Phase 4 — "Billion-Dollar Polish"

The site loads choppy, the map has overlapping UI elements, and there's no real Pokemon-GO-style creature-hunting feel. This phase fixes all of that.

**This is the polish pass that takes BLINK from "decent demo" to "people screenshot this on Twitter."**

Study Pokemon GO's UX, then make it better. Cleaner. More mystical. Less cluttered.

---

## PART 1 — Landing page (`/`) — cleaner, faster, more cinematic

### Audit first
- Read `src/app/page.tsx` and components rendered there: `Hero`, `TopNav`, `FloatingCreatures`, `GenesisBanner`, `BestiarySection`, etc.
- Run `npm run build` first to confirm baseline.
- Use Chrome devtools (via OpenClaw browser tool) on https://blinkworld.xyz to inspect Network timing, LCP, layout shifts.

### Loading experience
- **Cinematic page-load animation**: black screen with a single pulsing BLINK eye (~800ms), then content fades in with stagger (~150ms between sections).
- **No layout shift** during font load (use `font-display: swap` + size adjust).
- **LCP target < 1.5s**: lazy-load below-fold sections, preload hero font + eye logo.
- **First-paint**: skeleton placeholders for bestiary cards while images load.
- Smooth fades in on scroll for each section (IntersectionObserver, NOT framer-motion `whileInView` on everything — performance).
- All animations respect `prefers-reduced-motion`.

### Section ordering (current is fine — just polish)
1. Hero — "Don't blink. The Eye is open." + AWAKEN button
2. Ticker (replace fake stats — see below)
3. **NEW:** $BLINK token strip (small banner) — "$BLINK is live on Ethereum mainnet. Trading enabling soon." with contract + Etherscan link
4. The Bestiary (existing 20)
5. **NEW:** The Mythics section (see below)
6. How it works
7. The Council
8. The Eye Speaks (Telegram bot)
9. Footer

### Replace fake ticker stats
The current ticker says fake stuff like "1,243 active watchers worldwide." Replace with REAL data or kill it:
- "{N} BLINKs caught today" — real count from Supabase
- "{N} watchers active" — real session count
- "{N} Genesis holders" — real count from Alchemy (or hardcode if we don't have key yet)
- "{N} Mythic holders" — real count from Alchemy
- If we don't have real data ready, replace with poetic non-numeric lines: "The Eye opens over Lagos · Sprites stirring in Tokyo · Council membership awakens"

### NEW: $BLINK Token Strip
A small section ABOVE the Bestiary:
- Eye-catching gradient strip, neon green border-glow
- Left: "$BLINK · Live on Ethereum"
- Middle: contract address (clickable, copies on click, shows Etherscan icon)
- Right: "Trading: enabling soon" badge OR "Buy on Uniswap" button (depending on tradingActive state — for now show "soon" since trading is OFF)
- Contract address: `0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B`
- Add subtle stat row underneath: "2B fixed supply · 10% tax · 8 wallets · No mint · No blacklist"
- Etherscan + DexScreener + Uniswap links

### NEW: The Mythics Section
Right after the Bestiary section, BEFORE How-it-works:
- Eyebrow: "ASCENSIONS"
- Heading: "THE MYTHICS"
- Subtext: "The Bestiary, awakened. Hand-curated 1-of-1 ascensions for council, holders, and partners."
- Show the 4 currently-minted Mythics:
  1. **Oracle Dragon — Omen Prime** (#1, recipient `0xe063D5DE...`)
  2. **Phoenix Dragon — Ashborne** (#2, recipient `0x1a00e7Dc...`)
  3. **Oracle Dragon — Tempest** (#3, recipient `0x034b3e0E...`)
  4. **Phoenix — Rebirth** (#4, recipient `0x85F2cE8B...`)
- Fetch dynamically: read `totalMinted()` from the Mythics contract, then `tokenURI(i)` for each, then fetch the IPFS JSON.
- Cards: 2:3 portrait, same aesthetic as Genesis Bestiary cards, with a small "MYTHIC" badge + token # + owner address abbreviated.
- Click → modal showing full image, title, lore, traits, OpenSea link, owner wallet.
- Below grid: "View Collection on OpenSea" → https://opensea.io/assets/ethereum/0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592
- Backend: new `/api/mythics` route that fetches the 4 metadata JSONs from IPFS (server-side, cached 5min) and returns. Or do it client-side with `useEffect` if simpler.
- Contract: `0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592` (already in `.env.local` as `NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT`).

---

## PART 2 — Map page (`/map`) — the BIG one

### Current problems
1. Top-right has 3 overlapping controls (recenter, zoom +/-, camera) — they stack and look messy
2. Bottom sheet covers a chunk of the map even when collapsed (160px)
3. The big green spawn FAB (`Plus`) sits in the middle-right and blocks view
4. Map "feel" isn't there — no creature hiding/discovery vibe
5. No way to look around without accidentally interacting

### Fix the UI overlap
- **Top-right control stack**: consolidate into a single compact vertical "tool rail" (40px wide):
  - Recenter (compass icon, top)
  - Zoom + (middle-top)
  - Zoom - (middle-bottom)
  - Camera (bottom, only if needed)
  - Each button: 36x36, 8px gap, glassmorphism (rgba bg + backdrop-filter), neon green border, single column
- **Spawn FAB**:
  - Move to bottom-LEFT (not middle-right)
  - Smaller initially (44x44 collapsed, expanded on hover/tap to 56x56)
  - Label: tiny "+ Spawn" on hover/tap, NOT always visible
  - Make it semi-transparent (`opacity: 0.85`) when user hasn't touched it in 3s — fade out so map is clean
  - Re-appear at full opacity on map idle/movement end
- **Bottom sheet collapsed state**:
  - Reduce collapsed height from 160 → 88px (just enough for handle + nearby count)
  - Use peek-style preview: handle + "12 BLINKS nearby ↑" header only when collapsed
  - Expand on drag/tap
- **Filter pills row**: keep, but maybe hide initially and reveal via a small "Filter" pill button. Saves vertical space.

### Map "Pokemon GO+" feel — the new mechanic

This is the hardest part. Real spec:

1. **Creatures auto-spawn around the user, but HIDDEN**:
   - When user authenticates and shares location, backend creates 6-12 "BLINK spawn nodes" within 50-1500m radius around them
   - Stored in `blink_spawns` table (new): `{ id, wallet_id, lat, lng, creature_id (1-20), spawned_at, expires_at, discovered, caught }`
   - Spawns expire in 60 minutes
   - On expiry, new ones spawn in their place

2. **Visibility tiers (Pokemon GO has this — we do it MORE mystical)**:
   - **Far (>500m)**: NO marker shown. Just a directional pulse on map edge ("there's something to the east") via small chevron animation on viewport edge nearest the spawn.
   - **Medium (100-500m)**: A faint ETHEREAL OUTLINE marker — silhouette of an eye, low opacity (0.35), no creature identity revealed. "There. Something stirs."
   - **Close (30-100m)**: Marker shows rarity glow + creature silhouette
   - **Catchable (<30m)**: Full creature image + "Catch" button + signature pulse animation
   - Distance updates in real-time as user walks

3. **"Hot/Cold" compass**:
   - Small radar/sonar indicator at the TOP of the map (between top-bar and filter row), 40px tall, full width minus margins
   - Shows nearest BLINK distance + rough direction
   - Color shifts: gray (>500m), faint green (100-500m), bright green (30-100m), pulsing white-green (<30m)
   - Text: "Something is near · 230m east" / "BLINK detected · 45m"
   - Creates urgency to walk

4. **Discovery sounds**:
   - Already have a sound system (Phase 3.5). Trigger:
     - `spotted` when user enters medium range of a spawn (debounce so it only fires once per spawn)
     - Build new `nearby` sound triggered when entering 100m of any spawn (heart-beat-like)
     - `catchCommon/Rare/Mythic` already wired

5. **Map idle = no spawn animation, but subtle**:
   - When user is panning/zooming the map, NO popups, NO modals — they're just looking around
   - The bottom sheet collapses if expanded
   - "Look mode": tapping the map itself does NOT spawn anything — only the spawn FAB does
   - To interact with a creature, the user has to TAP the marker itself

6. **Backend pieces**:
   - New table migration: `blink_spawns`
   - New `/api/spawns/around` route: GET `?lat=&lng=&radius=` returns active spawns within radius, with their distance computed server-side and visibility tier
   - Spawn generator: a backend function that, when a user's location updates, ensures they have 6-12 active spawns within 1500m. Spawn random tier weighted by rarity:
     - 60% common, 25% uncommon, 10% rare, 4% legendary, 1% mythic
     - Each spawn is a random creature ID 1-20 weighted by rarity
   - Catch flow: existing `/api/orbs/crack` is the catch handler — wire to new spawn IDs, OR create `/api/spawns/catch`
   - For Phase 4 we just need the system DESIGN working end-to-end with mock data — real geo-spatial DB query optimization can come later

7. **Mock data fallback (dev)**:
   - If no real spawns, ALWAYS generate 6-12 mock spawns around the user (currently we generate 4)
   - Mix of rarities for visual variety
   - Mock spawns persist for the session via localStorage (so refresh doesn't make them jump)

### Map performance
- Use Mapbox GL JS or Leaflet's clustering for >50 markers
- Don't re-render the whole list on every distance update — use stable refs
- Debounce geolocation updates to 1/sec
- Wrap the entire map page in a `<Suspense>` boundary

---

## PART 3 — Performance optimization

Site-wide:
- **Code-split**: dynamic import for the 20 creature images on Bestiary section (lazy load on scroll)
- **next/image**: confirm all images use `<Image>` with proper `sizes` prop
- **Preload**: hero image, BLINK logo, primary font
- **Bundle audit**: run `npm run build` and report any chunks >250KB. Fix the worst offender if any.
- **Tree-shake**: confirm framer-motion is tree-shaken (only import what's used)
- **Map page**: dynamically import HuntMap with `ssr: false` (already done)

---

## What's NOT in this phase

- Real spawn API tied to live DB (mock data for now, real geo-spatial query is Phase 5)
- AR camera mode (defer)
- Multiplayer features (defer)
- Real-time leaderboards (defer)
- $BLINK staking UI (defer to Phase 6)

---

## Done means

1. Landing page LCP < 1.5s, no layout shift, cinematic load
2. $BLINK token strip visible on landing
3. Mythics section visible on landing showing the 4 minted Mythics
4. Map page has clean UI — no overlapping controls
5. Spawn FAB out of the way
6. Visibility tiers (far/medium/close/catchable) implemented in `HuntMap`
7. Hot/cold compass at top of map
8. 6-12 mock spawns around user for dev verification
9. Sounds wired for spawn discovery
10. `npm run build` passes
11. Write `BLINK_PHASE4_CHANGELOG.md`
12. Commit each major part separately:
    - `feat(phase4): landing — cinematic load + $BLINK strip + Mythics section`
    - `feat(phase4): map — clean UI, no overlap, FAB repositioned`
    - `feat(phase4): map — Pokemon-GO style visibility tiers + hot/cold compass`
    - `feat(phase4): performance — LCP optimizations + bundle audit`

---

## Constraints (carry over)

- Inline styles only (no new Tailwind)
- Palette: `#00FF88`, `#88FF00`, `#FFFFFF`, `#0a0a0f`, `#0d0d14`, `#1a1a24`
- No cyan, no purple, no emojis in UI
- `next/image` for all images
- Inter + Space Grotesk fonts
- Mobile breakpoints 480 / 768 / 1024
- Build green at end
- Vocabulary: BLINKS not Orbs (existing strings already migrated; just don't introduce regressions)
- Sounds: respect existing toggle and `prefers-reduced-motion`
- Security: never sign transactions on behalf of users, never accept private keys
