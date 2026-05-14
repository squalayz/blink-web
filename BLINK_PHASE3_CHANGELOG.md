# BLINK Phase 3 — Wallet-Gated Cinematic Changelog

Wires Sign-In With Ethereum (SIWE), Alchemy NFT holdings, and a green cosmic
map polish into BLINK. Wallet-only — no email, no magic link, no private-key
paste, no anonymous sessions.

Contracts:
- Genesis: `0x85e7CB56fA10f26fEAe20449e71AD1503867799A` (Ethereum mainnet)
- Mythics: configurable via `NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT` (empty
  until the collection is published — holdings lookup tolerates this).

Commits, in order:

1. `feat(phase3): SIWE auth backend + Alchemy NFT holdings`
2. `feat(phase3): wallet-only cinematic signin + RainbowKit BLINK theme`
3. `feat(phase3): <YourBestiary /> + YOURS pill on public Bestiary`
4. `feat(phase3): floating-green cosmic map polish`
5. `docs(phase3): WHAT_WE_NEVER_DO transparency doc`

---

## Files added

### Backend / lib

- **`src/lib/siwe-session.ts`** — SIWE session helpers. Signs an HS256 JWT
  with `NEXTAUTH_SECRET` (or `WALLET_ENCRYPTION_KEY` fallback) and stores it
  in an httpOnly, `SameSite=Lax`, secure-in-prod cookie. 24h TTL. Companion
  10-minute single-use nonce cookie for the EIP-4361 challenge.
- **`src/lib/wallet-nfts.ts`** — `getBlinkHoldings(address)` reads Genesis +
  Mythic ownership server-side via `alchemy-sdk`'s `getNftsForOwner`. 60s
  in-memory cache per wallet, lowercased. Gracefully returns empty arrays
  when `ALCHEMY_API_KEY` is unset so the rest of the app keeps rendering.
- **`src/lib/migrations/user-blink-holdings.sql`** — table for caching
  per-wallet `{ genesis_ids[], mythic_ids[], last_refreshed }`. RLS allows
  public read; writes restricted to the service role.

### API routes

- **`/api/auth/siwe/nonce`** (GET) — issues a viem-generated nonce, sets the
  nonce cookie.
- **`/api/auth/siwe/verify`** (POST) — validates the SIWE signature against
  the nonce cookie, mints the session JWT, ensures a Supabase shadow user
  (`<address>@wallet.blink`) exists, refreshes the holdings snapshot, and
  returns `{ isHolder, holdings, supabase: { email, token } | null }` so the
  client can also bootstrap a Supabase session.
- **`/api/auth/siwe/me`** (GET) — returns the current SIWE session (or
  `{ session: null }`).
- **`/api/auth/siwe/logout`** (POST) — clears the session + nonce cookies.
- **`/api/wallet/holdings`** (GET) — returns the BLINK holdings snapshot
  for either the logged-in wallet or any wallet passed as `?wallet=0x…`.
- **`/api/wallet/refresh`** (POST) — rate-limited to 1/min/wallet, busts
  the in-memory cache, refetches Alchemy, persists the snapshot to
  `user_blink_holdings`.

### Frontend

- **`src/components/Web3Providers.tsx`** — `WagmiProvider` +
  `QueryClientProvider` + BLINK-themed `RainbowKitProvider`. Mounts once
  inside the root `Providers` tree so wagmi/RainbowKit/viem are now
  available everywhere.
- **`src/components/YourBestiary.tsx`** — exported component +
  `useBlinkHoldings()` hook. Two variants:
  - `variant="full"` — same 2:3 rarity-tinted cards as Phase 2's public
    Bestiary, with loading skeleton, empty state (CTA to mintmyblink.com),
    and a Council Member badge when the user holds anything.
  - `variant="compact"` — slim "N Genesis · M Mythic" chip that renders
    `null` when the wallet holds nothing.
- **`WHAT_WE_NEVER_DO.md`** + **`public/WHAT_WE_NEVER_DO.md`** — public
  guarantee doc linked from the signin footer. Lists everything BLINK
  does not do (no keys, no transactions, no fund access, etc.).

## Files modified

- **`src/app/auth/signin/page.tsx`** — full rewrite. Replaces the
  email/magic-link/private-key/anonymous UI with a cinematic single screen:
  cosmic starfield + aurora background, animated BLINK eye logo (pulsing
  green halo), tagline "The Bestiary remembers your wallet.", AWAKEN button
  (pulsing neon border, hover ripple), inline-rendered RainbowKit connect
  button styled by the new theme, and the EIP-4361 flow (nonce → sign →
  verify → holder/non-holder lore reveal). Holders see their NFTs fly in
  from the edges and are redirected to `/watch`; non-holders get the soft
  prompt with `Mint a Genesis` / `View the Mythics` / `Continue as guest`.
- **`src/app/auth/signup/page.tsx`** — now a server-side redirect to
  `/auth/signin`. Wallet-only means connecting a fresh wallet *is* the
  signup; the old onboarding form is gone.
- **`src/components/providers.tsx`** — wraps the existing `AuthContext` in
  the new `Web3Providers`, and `signOut()` now also POSTs to
  `/api/auth/siwe/logout` so the httpOnly cookie clears alongside the
  Supabase session.
- **`src/lib/wagmi-config.ts`** — adds `blinkRainbowTheme`: deep-black
  modal background, neon-green accents, BLINK shadow tokens. Replaces the
  default RainbowKit white.
- **`src/components/HuntMap.tsx`** — Mapbox basemap now uses the `night`
  light preset (with road/POI labels suppressed) and a saturate/hue CSS
  filter + green aurora gradient on top so the map reads BLINK-themed
  even on plans where the night preset is unavailable. Markers are now an
  eye motif (rarity-tinted outer ring + blinking iris); the user marker is
  a lightning-bolt SVG with a strengthened sonar ring. Hover scales the
  eye and pauses the pulse.
- **`src/app/map/page.tsx`** — restyles the recenter button as a small
  neon-green glass button in the top-right, adds matching zoom +/-
  controls, and injects 4 mock creature spawns ~200m around the user when
  `NODE_ENV !== "production"` and no real orbs are loaded.
- **`src/app/profile/page.tsx`** — adds `<YourBestiary />` at the top of
  the page (above the existing two-column body).
- **`src/app/watch/page.tsx`** — adds the compact `<YourBestiary
  variant="compact" />` chip at top-left of the map view; renders nothing
  when the user holds no creatures.
- **`src/components/BestiarySection.tsx`** — when a logged-in user owns a
  Genesis/Mythic, the matching public card now shows a neon "YOURS" pill
  next to the rarity badge.
- **`.env.example`** + **`.env.local`** — adds `ALCHEMY_API_KEY`,
  `NEXT_PUBLIC_BLINK_GENESIS_CONTRACT`, `NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT`.

## Dependencies

- Added `alchemy-sdk` (server-side NFT reads).
- All other deps (`siwe`, `viem`, `wagmi`, `@rainbow-me/rainbowkit`,
  `@tanstack/react-query`, `jose`) were already in the lockfile from prior
  phases — Phase 3 just wires them up.

## Security guarantees (also in WHAT_WE_NEVER_DO.md)

- The only signature requested is the EIP-4361 SIWE login message — no
  `eth_sendTransaction`, no ERC-20 approvals, no `setApprovalForAll`.
- Private keys, seed phrases, JSON keystores, etc. are never asked for and
  never stored. The signin page never accepts a key.
- Session JWT is httpOnly + 24h TTL + signed with the server-side
  `NEXTAUTH_SECRET`. Cleared on disconnect.
- Alchemy reads are server-side only (`import "server-only"`). The key
  never reaches the browser.

## Setup task left for the operator

1. Drop your Alchemy mainnet key into `.env.local`:
   ```
   ALCHEMY_API_KEY=alch_xxxxxxxxxxxx
   ```
   The build already passes with the key absent — Alchemy calls degrade to
   empty results, so the UI just shows "no creatures yet". Once the key is
   present, every login path lights up.
2. Run the migration in your Supabase project:
   ```
   psql … < src/lib/migrations/user-blink-holdings.sql
   ```
3. (Optional) When the Mythics contract is live, set
   `NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT` in `.env.local` to start displaying
   Mythic holdings.

## What was NOT touched (per brief)

- Orb / spawn / catch / trade / market / council / squad mechanics.
- The existing Phase 2 `BestiarySection` layout (we only added the YOURS
  pill, nothing else was changed).
- `useAuth()`-consuming code across the rest of the app (kept working via
  the Supabase shadow user trick — no fanout edits required).
- Tailwind: no new utility classes anywhere.

## Verification

- `npm run build` — passes.  
  62 routes compile, including the new `/api/auth/siwe/{nonce,verify,me,logout}`
  and `/api/wallet/{holdings,refresh}` endpoints. The only build warning is
  the known harmless `@metamask/sdk` reference to
  `@react-native-async-storage/async-storage` (unused on web, suppressed by
  the wagmi connectors).
- Type errors flagged by `npx tsc --noEmit` are pre-existing in files
  outside the Phase 3 scope (`/contracts`, `/supabase`, `market`, `missions`,
  `spawn`, `wallet`) — Phase 3's new and edited files type-check clean.
