# BLINK Phase 3 Brief — Wallet-Gated Cinematic

This is a billion-dollar polish pass. Three core changes. Security-first.

---

## 1. Login → Wallet-Only Cinematic

**Replace** `/auth/signin` entirely.

### Remove
- Magic link auth
- Private key import
- Email auth
- Anonymous sign-in
- Any Supabase auth.signIn* paths
- All Supabase auth UI / state related to email

### Build
- **Wallet-only login** via RainbowKit + SIWE (Sign-In With Ethereum, EIP-4361)
- Connect button is the ONLY way in
- After wallet connect, prompt user to sign a SIWE message → server verifies → session
- **Custom-styled connect modal** matching BLINK brand (green/black, NOT default RainbowKit white)
- Cinematic single-screen experience:
  - Full-screen black with cosmic starfield background (light parallax via CSS, no heavy libs)
  - Centered: glowing animated BLINK eye logo (pulsing green halo)
  - Below logo: tagline "The Bestiary remembers your wallet."
  - Below that: large "AWAKEN" button (pulsing neon green border, hover ripple)
  - Tiny footer: "Wallet-only · We never request keys, signatures, or access to your funds."
- Click AWAKEN → RainbowKit modal (BLINK-themed)
- After connect → smooth fade to "OPENING THE EYE..." transition (~2s) while we:
  - Issue SIWE nonce
  - User signs
  - Server verifies, sets session cookie
  - Server scans wallet for Genesis + Mythics holdings (Alchemy)
- Result:
  - **HOLDER** → animated lore reveal ("The Eye sees [N] of yours...") with their NFTs flying in from edges, then redirect to `/watch` (or new `/bestiary` home for holders)
  - **NON-HOLDER** → soft prompt screen: "You have not been awakened. Mint your first creature at mintmyblink.com" with two buttons: "Mint a Genesis" (→ mintmyblink.com) and "View the Mythics" (→ OpenSea Mythics)

### Security guarantees
- We use SIWE signature only (no transactions, no token approvals)
- We never store private keys
- The session is server-side, httpOnly cookie, short-lived (24h)
- We only read PUBLIC on-chain data via Alchemy with a server-side key
- Document this in a `WHAT_WE_NEVER_DO.md` file in the project root (user-facing transparency, gets linked from login footer)

---

## 2. Map → Floating Green Cosmic Vibe

The current `/map` page works but needs visual polish.

### Audit first
- Read `src/app/map/page.tsx` and any map components
- Take screenshots (use playwright/chromium via `npm run dev` on port 3000)
- Identify the map library in use (Mapbox or Leaflet — both are in deps)

### Goals
- **Custom dark map style** — deep black/charcoal base, neon green accent roads, no default blue
- For Mapbox: use a custom style or apply runtime style override (deep black water/land)
- For Leaflet: use a dark tile provider (CartoDB Dark Matter or similar) + custom CSS overlay
- **Creature markers**:
  - Custom SVG/HTML markers matching the BLINK eye motif
  - Rarity-tinted glow (use `RARITY_COLOR` from `src/lib/bestiary.ts`)
  - Pulse animation (CSS keyframes, subtle, infinite)
  - Hover → scale up, intensify glow
  - Click → opens the existing `CreatureModal` from Phase 2
- **User location marker**: lightning bolt + eye combo, distinct from creatures
- **Map controls**: restyled (zoom +/-, locate me) — small neon green buttons, top right
- **No clutter**: remove any default UI that doesn't match brand
- **Performance**: lazy-load map on map page only, don't block other routes
- Mobile-responsive: full-screen map on mobile, controls accessible with thumb

### Spawning creatures
- The map should be ready to render creature spawns dropped via the existing spawn API (`/api/...`)
- For now: include a dev-only mock spawn (3-5 creatures around the user's location) when `NODE_ENV !== 'production'` so we can visually verify the design

---

## 3. NFT Holdings — Display on Site

### Backend
- Add Alchemy SDK as a dep (`alchemy-sdk`)
- New file `src/lib/wallet-nfts.ts` exports:
  - `getBlinkHoldings(address)` → `{ genesis: TokenSnapshot[], mythics: TokenSnapshot[] }` where TokenSnapshot = `{ tokenId, name, image, tier, traits[] }`
  - Calls Alchemy `getNFTsForOwner` filtered by the two contract addresses
  - Caches in-memory for 60s per wallet
- New API route `/api/wallet/holdings` (GET, server-side auth required)
- On SIWE session creation, the server kicks off a holdings refresh and stores the snapshot in Supabase under `user_blink_holdings` table:
  ```sql
  create table user_blink_holdings (
    wallet text primary key,
    genesis_ids int[],
    mythic_ids int[],
    last_refreshed timestamptz default now()
  );
  ```
- Holdings refresh endpoint `/api/wallet/refresh` (POST, user-triggered, rate-limited to 1/min/wallet)

### Frontend
- New component `<YourBestiary />` — displays user's holdings as the same 2:3 cards as the public Bestiary section
- Shown in:
  - Top of `/profile` page
  - Top of `/watch` page (if user is logged in and holds anything)
  - Smaller compact version in nav/header (just count: "🐉 2 Genesis · 1 Mythic")
- Each card click → existing CreatureModal
- "Council Member" badge appears when user holds ANY Genesis or Mythic
- Empty state: "Your wallet holds no BLINK creatures yet" → CTA to mintmyblink.com

### Public Bestiary cards now show "Owned by [you/wallet]" badge
- When a Genesis/Mythic in the public Bestiary section IS owned by the current logged-in user, show a small green "YOURS" pill on the card

---

## Setup tasks Claude Code should handle

1. **Alchemy** — prompt the user to provide an `ALCHEMY_API_KEY` (free at alchemy.com → create app on Ethereum Mainnet). Add to `.env.example` and `.env.local`. Use it only on server-side routes.
2. **SIWE** — install `siwe` package, server validates signature with `viem`
3. **RainbowKit theme** — custom darkTheme override with BLINK colors
4. **Migration SQL** — write the `user_blink_holdings` table migration into `src/lib/migrations/`
5. **WHAT_WE_NEVER_DO.md** — public transparency doc

## Constraints (carry over from prior phases)
- Inline styles only (no Tailwind) — except where Tailwind already exists, leave alone
- Palette: `#00FF88`, `#88FF00`, `#FFFFFF`, `#0a0a0f`, `#0d0d14`, `#1a1a24`
- No cyan, no purple, no emojis in UI
- `next/image` for all images
- Inter + Space Grotesk fonts
- Mobile breakpoints 480 / 768 / 1024
- Build must pass: `npm run build`

---

## 4. Vocabulary Migration — ORB → BLINK

The word "orb" / "orbs" is dead. They are now **BLINKS**.

### Find & rename
- Grep the entire project for `orb`, `Orb`, `ORB`, `orbs`, `Orbs`, `ORBS` in:
  - User-facing strings (JSX text, alt text, button labels, modal copy, toast messages)
  - Route names (`/orb` → `/blink` if any exist) — set up Next.js redirects from old paths
  - Component names (`OrbSomething.tsx` → `BlinkSomething.tsx`)
  - State variable names where user-visible (`orbCount`, etc.)
  - Database column names ONLY if safe (do NOT migrate DB schemas in this phase unless trivial — instead, add an alias/view if needed)
  - SQL migration files: leave existing migrations as-is, but any new code should write `blink` semantics
  - README, docs, comments
- **EXCEPTION:** Do NOT rename anything that would break:
  - Live Supabase tables/columns (would need a coordinated migration — leave for future phase, but rename in the UI/API layer)
  - Web3 contract function names (none should use "orb", but verify)
  - Third-party library imports

### Copy examples (use this voice)
- “You’ve found a BLINK.” (was: "You caught an orb")
- “You’ve found a RARE BLINK!” (for uncommon+)
- “MYTHIC BLINK!” (for legendary/mythic spawns)
- “The Bestiary stirs. A BLINK is near.”
- “BLINK acquired. Your wallet remembers.”
- “Your BLINK count: N”
- “Spawning BLINKS near you...”
- Profile section: “Your BLINKS” (NOT "Your Orbs")

### Strict on rarity tiers used in UI copy
- Common BLINK
- Uncommon BLINK
- Rare BLINK
- Legendary BLINK
- Mythic BLINK

---

## 5. Mystical Sounds

Add subtle, premium audio cues at key moments. NO heavy audio libs — use vanilla Web Audio API or `<audio>` element with preloaded short MP3/OGG files.

### Sounds needed
1. **Awaken / login success** — ethereal pulse + gentle chime (~2s), plays once on successful SIWE verification
2. **NFT reveal** — mystical shimmer (~1s), plays as user's NFTs fly in after login
3. **BLINK spotted on map** — short whisper/glint (~0.5s), plays when a creature marker first appears in view
4. **Common BLINK caught** — soft "chime up" (~0.6s)
5. **Rare BLINK caught** — dramatic crystalline ring (~1s)
6. **Legendary/Mythic BLINK caught** — BIG cinematic stinger (~2s, low rumble + ascending crystal hits)
7. **Hover on important CTA** (optional) — very subtle tick (~0.1s)

### Implementation
- Create `src/lib/sounds.ts` with a singleton SoundManager:
  ```ts
  type BlinkSound = 'awaken' | 'reveal' | 'spotted' | 'catchCommon' | 'catchRare' | 'catchMythic' | 'tick';
  export const sounds: {
    play(name: BlinkSound, volume?: number): void;
    setEnabled(enabled: boolean): void;
    enabled: boolean;
  };
  ```
- Respects user's setting: persistent `localStorage` key `blink:sound:enabled`, default ON
- Add a small **sound toggle icon** in the top-right of the nav (speaker icon, neon green when on, gray when off)
- Preload sound files on app mount, lazily (idle callback)
- All sounds use Web Audio API for low-latency on second+ play
- Honor `prefers-reduced-motion` (auto-disable if user prefers reduced)

### Audio asset sources
- Use FREE royalty-free assets from freesound.org (CC0), opengameart.org, or Pixabay sounds
- Total bundle of all sounds should be < 500KB combined
- Stored in `/public/sounds/`
- If you can't find perfect free assets, document what's needed in the changelog and use placeholder beeps that can be swapped later
- DO NOT generate audio with AI — just use free assets

### Where they trigger (must add)
- `awaken` — after SIWE signature verified, before redirect
- `reveal` — when YourBestiary cards animate in on profile/post-login
- `spotted` — when a BLINK marker enters the map viewport (debounce so it only fires per marker once)
- `catchCommon/Rare/Mythic` — on successful catch (existing catch flow, just call sounds.play)
- `tick` — on hover for major CTAs (Awaken, Mint, Hunt) — optional, only if not annoying

---

## Done means
- Old auth files removed
- New wallet-only flow works locally (`npm run dev` on http://localhost:3000/auth/signin)
- Map page looks dramatically improved with green cosmic theme + animated creature markers
- Profile page shows the user's BLINK holdings via Alchemy
- Build is green
- One commit per change, conventional commits
- Write `BLINK_PHASE3_CHANGELOG.md` summarizing what was done

## DO NOT
- Touch unrelated MishMesh logic (orb, spawn mechanics, trading, council, market)
- Add tailwind classes anywhere new
- Use emojis in UI (telegram messaging exempt — but no UI emojis on the site)
- Break the existing public Bestiary section from Phase 2
- Store any private keys, seed phrases, or sign any transactions on behalf of users
- Cost the user money (no paid APIs unless the user explicitly approves)
