# BLINK Rebrand — Phase 1 Changelog

Rebrand of MishMesh → BLINK. Visual + textual rebrand only. No game-logic changes.

## Build status
✓ `npm run build` — compiles successfully. All 62 routes generate. Only warnings are pre-existing Next.js dynamic-runtime notes for `/api/og` (edge runtime) and `/api/wallet/keys` (uses request.headers) — both unrelated to the rebrand.

## Brand
- Primary green `#00FF88`, secondary `#88FF00`, white `#FFFFFF`
- Backgrounds: `#0a0a0f`, surfaces `#0d0d14` / `#1a1a24`
- All cyan/purple/indigo (`#06b6d4`, `#6366f1`, `#8b5cf6`, `#9945FF`, `#14F195`) collapsed to green/white palette
- Logo: `/public/blink-logo.png`
- Tagline: "Don't blink. The Eye is open."

## Naming
| Old | New |
|---|---|
| MishMesh | BLINK |
| Mesh | The Eye |
| Orb | Creature |
| Hunt | Watch |
| Hunter | Watcher |
| Crack | Witness / Catch |
| Leaderboard | The Council |
| Drop | Spawn |
| Map | The Eye Map |
| Mishmate | Eyemate |

## Assets added
- `public/blink-logo.png` — official green BLINK logo
- `public/creatures/sprite.jpg`
- `public/creatures/cyclops.jpg`
- `public/creatures/cat.jpg`
- `public/creatures/serpent.jpg`

## Foundation changes
- `tailwind.config.js` — new BLINK palette (blink.green/green2, removed indigo/cyan/purple)
- `src/lib/theme.ts` — `C` palette switched to BLINK greens; old cyan/purple keys preserved but mapped to green so consumers still compile
- `src/app/globals.css` — CSS vars `--blink-*`, BLINK glow utilities, `eyePulse`/`creatureFloat`/`tickerScroll` keyframes, selection/scrollbar/focus colors swapped to green
- `src/app/layout.tsx` — title/description/OG meta rebranded; themeColor `#00FF88`; favicon → `/blink-logo.png`
- `package.json` — name `blink`
- `README.md` — full rewrite for BLINK
- `public/manifest.json` — name/short_name BLINK, start_url `/watch`, theme_color `#00FF88`
- `public/robots.txt` — `/crack/` → `/catch/` disallow line
- `src/app/icon.tsx` / `apple-icon.tsx` — replaced gradient with green "B" mark
- `src/app/api/og/route.tsx` — full rewrite as the BLINK Eye OG image
- `src/middleware.ts` — header comment + `/hunt` redirect → `/watch`
- `src/app/sitemap.ts` — `/hunt` → `/watch`, `/leaderboard` → `/council`

## Folder renames (git mv)
- `src/app/hunt` → `src/app/watch`
- `src/app/crack` → `src/app/catch`
- `src/app/leaderboard` → `src/app/council`
- `src/app/drop` → `src/app/spawn`

## Route reference updates
All internal `router.push` / `Link href` / `redirect` updated to new paths in:
- `src/components/AppShell.tsx` (SHOW_SHELL_PATHS, HIDE_SHELL_PREFIXES, isWatch check)
- `src/components/BottomNav.tsx` (TABS array, isActive)
- `src/components/OrbDetailSheet.tsx`
- `src/app/spawn/page.tsx`, `src/app/catch/[id]/page.tsx`, `src/app/messages/page.tsx`
- `src/app/auth/signin/page.tsx`, `src/app/auth/signup/page.tsx`
- `src/app/profile/page.tsx`, `src/app/map/page.tsx`, `src/app/ar/page.tsx`

## Components
- `src/components/HeroEye.tsx` — **NEW** — central pulsing green BLINK logo with 4 creatures orbiting (replaces HeroGlobe)
- `src/components/HeroGlobe.tsx` — **DELETED** — replaced by HeroEye
- `src/components/BottomNav.tsx` — tab labels Watch / Live / Spawn / Messages / Profile; gradient updated to green; central button SpawnIcon (eye glyph); logo mark wired to `/blink-logo.png`
- `src/components/AppShell.tsx` — full-screen detection updated for `/watch` and `/map`; border colors greenified

## Landing page
- `src/app/page.tsx` — **full rewrite** as BLINK marketing landing:
  - Sticky top nav with logo + "The Council" + "Enter The Eye" CTA
  - Hero: HeroEye animation, headline "Don't blink.", sub "The Eye is open. Catch what others can't see.", CTAs "Enter The Eye" → `/watch` and "Join The Council" → Telegram
  - Scrolling live ticker strip
  - Bestiary grid: 4 revealed creatures + 16 placeholder "?" cards
  - "How it works" three-step section (Watch / Approach / Witness)
  - The Council mini-leaderboard preview
  - "The Eye Speaks 24/7" Telegram section with mock @TheEyeBlinkBot card
  - Final cult-CTA: "The Eye sees you. Now see back."
  - Footer with logo + links
  - Authenticated users with profile redirect to `/watch` (preserves existing flow)
  - Inline styles only, no Tailwind, no emojis

## Inner page copy rebrand — content pages
- `src/app/how-it-works/page.tsx` — full rewrite. New BLINK flow Watch → Approach → Witness. Replaced "claim process" with three creature-catching steps; drop/hunt/crack copy → spawn/watch/witness/catch; escrow/PDA diagram → You → Spawn point → Caught. Added "$BLINK token rewards coming" section, Creature kinds (Sprite/Cyclops/Serpent), Rules of The Eye. Inline `MMLogo` SVG replaced with `<Image src="/blink-logo.png" />`. Inline colors swapped to greens.
- `src/app/support/page.tsx` — MishMesh → BLINK; common-issues entries rewritten (crack orb → witness Creature, payout → catch recorded). About section rewritten as BLINK catching game. Kept `support@mishmesh.ai` / `legal@mishmesh.ai` emails per spec (domain stays).
- `src/app/terms/page.tsx` — 18+ MishMesh → BLINK; game terminology rebranded (Orbs/Creatures, drop/spawn, crack/witness, Crews/Squads, Arena/Council, map/The Eye Map). Wallet addresses, fee math, governing law untouched.
- `src/app/privacy/page.tsx` — 16+ MishMesh → BLINK; same terminology rebrand throughout data-collection sections.
- `src/app/security/page.tsx` — MishMesh → BLINK; "ready to hunt" → "ready to watch", "username" → "Watcher handle", "orb activity" → "Creature activity". `MMLogo` swapped for BLINK logo. Sign-in CTA "Enter The Eye".
- `src/app/acceptable-use/page.tsx` — MishMesh.ai → BLINK in two AUP paragraphs.
- `src/app/legal-layout.tsx` — header brand and `C` palette greenified.
- `src/app/not-found.tsx` — "This page doesn't exist in the mesh" → "The Eye does not see this page"; "Back to MishMesh" → "Back to BLINK"; colors swapped.
- `src/app/onboarding/page.tsx` — verified (5-line redirect to `/auth/signup`, no copy to change).

## Inner page copy rebrand — main app pages
- `src/app/watch/page.tsx` — `FilterKey` literals `'All Orbs'` → `'All Creatures'`; ACCENT/PRIMARY/GOLD/BG/TEXT/MUTED swapped to BLINK palette; empty-state "No orbs found" → "No creatures found"; "Launch Orb" → "Spawn Creature"; deep-link `/drop?mode=launch` → `/spawn?mode=launch`; tooltips and default filter updated. Supabase queries / types / `dropped_at` column untouched.
- `src/app/catch/[id]/page.tsx` — rarity radial gradients greenified; "Loading orb..." → "Loading creature..."; "Back to Hunt" → "Back to Watch"; "Tap to crack" → "Tap to witness"; "Cracking..." → "Witnessing..."; DROP badge → CATCH; "Continue Hunting" → "Continue Watching"; all `#0A0A0F` → `#0a0a0f`; error strings rebranded.
- `src/app/council/page.tsx` — H1 "Leaderboard" → "The Council"; categories "Hunters"/"Droppers" → "Watchers"/"Spawners"; tier "Hunter" → "Watcher"; empty-state copy rebranded; "Top Hunter wins" → "Top Watcher wins a Legendary 0.1 ETH Creature". Already on theme `C` so no hex sweep needed.
- `src/app/spawn/page.tsx` — full copy + color sweep: "Drop Orb" → "Spawn Creature"; ORB_TYPES titles "…Orb" → "…Creature"; descriptions rebranded (hunters → watchers, on the map → on The Eye Map); fee row "To cracker (90%)" → "To catcher (90%)"; "Launch Orb" → "Launch Creature"; success "Orb Launched!" → "Creature Launched!"; "Back to Hunt" → "Back to Watch"; signing copy "Securing your drop" → "Securing your spawn"; thrown error "Failed to create orb" → "Failed to create creature". Signing-spinner, glowPulse keyframe, StepIndicator, NFT chain pills, mode toggle, message input border, launch button border + gradient, confetti palette, OrbVisual rarity gradients all greenified.
- `src/app/missions/page.tsx` — only inline-hex normalization (`#0A0A0F` → `#0a0a0f`); mission strings come from DB so no copy edits.
- `src/app/live/page.tsx` — added `rebrandActivityText()` runtime filter that rewrites legacy DB activity titles/subtitles to BLINK vocab ("dropped an orb" → "spawned a creature", "cracked an orb" → "caught a creature", "hunter" → "watcher", etc.). TrendingSidebar labels "Drops Today" → "Spawns Today", "Cracks Today" → "Catches Today"; empty-state "drop an orb" → "spawn a creature". Chain breakdown colors greenified; stories ring gradient greenified. Activity-type enum values (`"crack"`, `"orb_cracked"`, etc.) preserved as DB identifiers.

## Inner page copy rebrand — feature pages
- `src/app/auth/signin/page.tsx` — "MishMesh" → "BLINK" title; subtitle "Sign in to hunt and drop orbs" → "Sign in to watch and spawn creatures"; footer copy updated.
- `src/app/auth/signup/page.tsx` — BLINK title; CHAINS palette greenified; WALKTHROUGH_CARDS rebranded ("hunt for glowing orbs" → "watch for glowing creatures"; "Walk Up & Crack" → "Walk Up & Witness"; "Drop Your Own Orbs" → "Spawn Your Own Creatures"; "Hunter Points / leaderboard / top hunter" → "Watcher Points / The Council / top watcher"); CTA "Start Hunting" → "Start Watching".
- `src/app/profile/page.tsx` — "MishMesh Score" → "BLINK Score"; tier "Hunter" → "Watcher"; stat labels "Cracked" → "Caught", "Dropped" → "Spawned"; empty-state "No orbs dropped/cracked yet" → "No creatures spawned/caught yet"; CTAs rebranded; "Orb Market" → "Creature Market"; aria-label "Leaderboard" → "The Council"; SOL/ETH/BTC chain icon fills greenified.
- `src/app/profile/edit/page.tsx` — focus shadows / save-state / camera icon / toast all swapped to greens.
- `src/app/wallet/page.tsx` — CHAINS palette greenified; "Orb Locks" → "Creature Locks"; empty-state "No active orb drops with locked crypto." → "No active creature spawns…"; "Orb drop" → "Creature spawn"; collectibles empty "from orb drops" → "from creature spawns".
- `src/app/market/page.tsx` — "Orb Market" → "Creature Market"; subtitle and modal CTAs all rebranded (crack rights → catch rights); card titles "{n} {ccy} orb" → "{n} {ccy} creature".
- `src/app/messages/page.tsx` — empty "When you crack an orb or someone cracks yours…" → "When you catch a creature or someone catches yours…"; CTA "Start Hunting" → "Start Watching".
- `src/app/messages/[id]/page.tsx` — color sweep only.
- `src/app/orb/[code]/page.tsx` — RARITY_COLORS reset to BLINK palette; "Mystery Orb" → "Mystery Creature"; CTA "Claim This Orb / Claiming..." → "Catch This Creature / Catching..."; bottom link "What is MishMesh?" → "What is BLINK?".
- `src/app/squads/page.tsx` — subtitle "Climb the leaderboard." → "Climb The Council."; section "Squad Leaderboard" → "Squad Council".
- `src/app/squads/[id]/page.tsx` — "Orbs Cracked" → "Creatures Caught".
- `src/app/tasks/page.tsx` and child pages — FAB gradient greenified, color sweep. No user-facing Orb/Hunt copy.
- `src/app/trails/page.tsx` — "Orb Trails" → "Creature Trails"; "{n} orbs" → "{n} creatures"; "hunter(s) racing" → "watcher(s) racing".
- `src/app/trails/[id]/page.tsx` — "Orb {n}" → "Creature {n}"; "Hunters/Orbs" → "Watchers/Creatures"; CTAs "Continue Hunt / Start the Hunt" → "Continue Watch / Start the Watch".
- `src/app/trails/[id]/hunt/page.tsx` — loading/error/instruction copy rebranded ("Cracking..." → "Catching...", "Tap to Crack" → "Tap to Catch").
- `src/app/trails/[id]/passport/page.tsx` — share title "on MishMesh!" → "on BLINK!"; "Back to Hunt" → "Back to Watch".
- `src/app/trails/create/page.tsx` — "Add Orbs" → "Add Creatures"; placeholders / errors / preview / "+ Add Orb" → "+ Add Creature" all rebranded.
- `src/app/travel/page.tsx` — color sweep only.
- `src/app/ar/page.tsx` — "AR Hunt" → "AR Watch"; "No orbs nearby / Explore the map to find orbs!" → "No creatures nearby / find creatures!".
- `src/app/map/page.tsx` — brand "MishMesh" → "BLINK"; "Nearby Orbs" → "Nearby Creatures"; full sheet copy rebranded (loading/error/empty/CTA); row + selected-orb buttons "Crack It / Get closer to crack" → "Catch It / Get closer to catch"; confirm modal "Crack this orb?" → "Catch this creature?"; success toast "Orb cracked successfully!" → "Creature caught successfully!".

## Inner page copy rebrand — components + lib
- `src/components/HuntMap.tsx` — user-position dot/sonar colors greenified; Leaflet/Mapbox logic untouched.
- `src/components/CrackExperience.tsx` — "Orb Detected" → "Creature Sighted"; "CRACK" button → "WITNESS"; "Cracking..." → "Witnessing..."; "dropped this orb" → "spawned this creature"; share text rebranded. Rarity gradients swapped to BLINK greens.
- `src/components/OrbDetailSheet.tsx` — "Mystery Orb" → "Mystery Creature"; "Crack it to reveal" → "Catch it to reveal"; "Dropper earns" → "Spawner earns"; "MishMesh fee" → "BLINK fee"; "Crack It" button → "Catch It"; "Walk within 100m to Crack" → "Walk within 100m to Catch".
- `src/components/OrbAnimation.tsx` — rarity palette greenified: Common stays white, Rare → `#88FF00` + `#00FF88`, Legendary → `#00FF88` + `#88FF00` + white inner. Aura colors swapped.
- `src/components/OrbMarker.tsx` — Common gray → white, Rare → `#88FF00`, Legendary → `#00FF88`.
- `src/components/OnboardingWalkthrough.tsx` — all 6 walkthrough screens rewritten (MishMesh → BLINK, Hunt → Watch, Drop → Spawn, Orb → Creature, Crack → Catch/Witness). Emojis stripped from feature cards (no-emoji rule). Icon palettes greenified. CTA "Start Hunting" → "Start Watching" with black text on green.
- `src/components/SettingsSheet.tsx` — `PURPLE` constant `#9945FF` → `#00FF88`; all section icon colors mapped to greens. Fixed pre-existing latent bug (missing `useEffect` import).
- `src/components/WalletModal.tsx` — "Orb Locks" → "Creature Locks"; QR fallback string `"mishmesh"` → `"blink"`.
- `src/components/WalletCard.tsx` — chain accent colors greenified; dark gradients flattened.
- `src/components/WalletConnect.tsx` — local `C` palette rewritten to BLINK greens.
- `src/components/ChainSelector.tsx` — chain pill colors greenified.
- `src/components/UserAvatar.tsx` — text color `#F9FAFB` → `#FFFFFF`; hash-hue logic preserved.
- `src/components/UserProfileCard.tsx` — `C` palette greenified; "Dropped"/"Found" → "Spawned"/"Caught".
- `src/components/AuroraOverlay.tsx` — both ambient blob gradients → greens.
- `src/components/GlassCard.tsx`, `ErrorState.tsx`, `Skeleton.tsx` — already pull from theme `C`; no changes required.
- `src/components/error-boundary.tsx` — local `C` palette greenified; tag `[MishMesh ErrorBoundary]` → `[BLINK ErrorBoundary]`.
- `src/components/PortfolioBar.tsx` — verified (uses theme `C`, no off-palette hex).
- `src/lib/telegram.ts` — bot rebranded to BLINK / `@TheEyeBlinkBot`; group link `https://t.me/+7Xj6CKZs9iVmMDhh` documented. All 6+ message templates rebranded; `/hunt` button URLs → `/watch`. Bot slash-command identifier `/hunt` preserved (backend command). Emojis preserved in TG messages (exempt per spec).
- `src/lib/wagmi-config.ts` — `appName: "MishMesh.ai"` → `"BLINK"`.
- `src/lib/production.ts` — file header rebranded. **Intentionally preserved:** `ENC_SALT = "mishmesh-v17-salt"` — used to derive AES-256 wallet encryption keys; changing it would brick every existing encrypted wallet on the server.
- `src/lib/coingecko-cli.ts` — header rebranded.
- `src/lib/migrations/mesh-feed.sql` — SQL comment header rebranded. Table/column names untouched.
- `src/app/api/auth/create-wallet/route.ts` — fake-email domain `@wallet.mishmesh.ai` → `@wallet.blink.app`.
- `src/app/api/orbs/crack/route.ts` — user-visible response strings rebranded ("Orb not found" → "Creature not found"; "Too far from orb" → "Too far from creature"). Activity-row titles rebranded. `activity.type` enum values preserved as DB identifiers.

## Intentionally NOT changed (per spec)
- `mishmesh.ai` domain references in `metadataBase`, `sitemap.ts`, `middleware.ts` CORS allowlist, and `support@/legal@/abuse@mishmesh.ai` emails — spec says "Domain stays at mishmesh.ai for now".
- `ENC_SALT` in `src/lib/production.ts` and `supabase/functions/crack-orb/index.ts` — wallet encryption salt; changing it would brick stored encrypted keys.
- `contracts/` — spec: "DO NOT change `contracts/` (smart contracts)".
- `supabase/functions/`, `supabase/migrations/` — spec: "DO NOT touch the supabase migrations folder".
- Supabase table/column names (`orbs`, `orbs_dropped`, `orbs_found`, `dropper_id`, etc.) — DB schema is Phase 1 frozen.
- Types: `Orb`, `OrbRarity`, `OrbCurrency`, `OrbStatus`, `OrbType` — schema names.
- Activity-type enum strings stored in DB: `"crack"`, `"orb_cracked"`, `"drop"`, `"orb_cancelled"` — used as DB identifiers; rebranded for display only via `rebrandActivityText()` in `/live`.

## ETH-Only Migration

Per `BLINK_REBRAND_AMENDMENT.md` (Pasquale, 24:00 UTC). BLINK is **Ethereum-only**. All Solana (SOL) and Bitcoin (BTC) references removed from user-facing UI. Underlying multi-chain code (API routes, balance hooks, server-side wallet generation, address columns) is preserved but commented out / feature-flagged with `// BLINK: ETH-only — disabled` so we can resurrect L2 chains in a future phase.

### Files changed

**Components**
- `src/components/ChainSelector.tsx` — `CHAINS` array filtered to ETH only; SOL/BTC entries commented out with `// BLINK: ETH-only — disabled`.
- `src/components/WalletModal.tsx` — New `VISIBLE_CHAINS = ["ETH"]` constant. Send + Receive + portfolio chain tabs/pills now iterate this single-entry list. `receiveChain` / `send.chain` defaults changed `"SOL"` → `"ETH"`. SOL/BTC balance rows removed from `balances` array (still fetched by `useBalances` for parity; unused values silenced with `void`).
- `src/components/WalletCard.tsx` — `CHAIN_CONFIG` collapsed: all three chain keys (`solana`/`ethereum`/`bitcoin`) now return the ETH config so any consumer rendering still shows Ethereum copy. Original SOL/BTC fields commented with `// BLINK: ETH-only — disabled`.
- `src/components/PortfolioBar.tsx` — `CHAIN_DOTS` filtered to ETH only. `activeChains.push("SOL"/"BTC")` calls commented out; `totalUSD` now `eth * prices.eth` only (sol/btc balances silenced with `void`).
- `src/components/OnboardingWalkthrough.tsx` — "Crypto Creature" card copy "Spawn SOL, ETH, or BTC" → "Spawn ETH"; wallet step badges list reduced to single ETH badge ("Connect your wallet" singularized).

**Pages — Wallet / Auth**
- `src/app/wallet/page.tsx` — `CHAINS` array filtered to ETH only. `sendChain`/`receiveChain` defaults `"solana"` → `"ethereum"`. Send-modal recipient placeholder hard-coded to `"0x address"`.
- `src/app/auth/signup/page.tsx` — Split into `ALL_CHAINS` (server-side wallet generation status tracker, still references sol/eth/btc keys) and `CHAINS` (visible UI list, filtered to ETH). `ChainKey` type widened from filtered list to `ALL_CHAINS` so existing `completedChains.has("sol"/"btc")` and `wallets.sol_address/btc_address` references still type-check. User only sees the Ethereum row during signup.

**Pages — Spawn / Game**
- `src/app/spawn/page.tsx` — Step-2 currency pills (`currencies` array) filtered to ETH only; SOL pill commented out. NFT chain selector (`["ETH","SOL"]` toggle) reduced to single Ethereum button. Review screen `Chain` row hard-coded to `"Ethereum"` (was `nftChain === "ETH" ? "Ethereum" : "Solana"`). "Crypto Creature" type description: "Spawn SOL or ETH…" → "Spawn ETH…". `nftChain` type literal kept as `"ETH" | "SOL"` to avoid touching child component prop types; setter is now never called with `"SOL"`.
- `src/app/trails/create/page.tsx` — `CURRENCIES` const `['SOL','ETH','BTC']` → `['ETH']`; default `currency` state `'SOL'` → `'ETH'`.
- `src/app/tasks/create/page.tsx` — `reward_currency` default `'SOL'` → `'ETH'`; Step-5 currency picker `(["SOL","ETH"] as RewardCurrency[]).map(...)` → `(["ETH"]).map(...)`. `RewardCurrency` type literal preserved.
- `src/app/map/page.tsx` — `FILTER_OPTIONS` reduced from `["All","SOL","ETH","BTC","Tasks"]` to `["All","ETH","Tasks"]`. `CHAIN_FILTER_MAP` / `CHAIN_PILL_COLORS` preserved for legacy DB rows.
- `src/app/live/page.tsx` — Chain filter pills reduced from `["All","SOL","ETH","BTC"]` to `["All","ETH"]`. Trending sidebar "Most Active Chain" rewritten Solana 64% → Ethereum 100%; chain breakdown reduced to a single Ethereum row at 100%. "S" badge in trending stat card → "E". `chainFromText` logic preserved so legacy SOL/BTC DB rows still classify.

**Pages — Profile**
- `src/app/profile/page.tsx` — `CHAINS` array filtered to ETH only. `sendChain`/`receiveChain` defaults `"solana"` → `"ethereum"`. Send-modal recipient placeholder hard-coded to `"0x address"`. Embedded wallet color reset to `C.primary` (was `C.ethBlue`).
- `src/app/profile/[id]/page.tsx` — Public profile "Wallets" card SOL and BTC `WalletRow`s commented out; ETH row stays and switched to `C.primary` color.

**Pages — Legal / Copy**
- `src/app/terms/page.tsx` — Section 3a: "Creatures contain crypto (SOL, ETH, or BTC)…" → "Creatures contain ETH on Ethereum mainnet…". Section 5: removed multi-chain phrasing; supported chain reduced to "Ethereum mainnet (ETH)". Section 6 platform-fee wallet list: Solana and Bitcoin address rows commented out (Ethereum address kept). FEE_WALLETS constants in `src/lib/theme.ts` untouched (used by backend).
- `src/app/privacy/page.tsx` — Section 2 wallet-address description and Section 5 blockchain-data clause rewritten to reference only Ethereum.

### Intentionally NOT changed (per amendment spec: "DO NOT delete the code yet")
- `src/lib/theme.ts` — `OrbCurrency` type (`'SOL'|'ETH'|'BTC'`), `currencyColor`, `FALLBACK_RATES`, `FEE_WALLETS` (SOL/BTC fee wallet addresses) — backend / data-model layer; SOL+BTC addresses still receive on-chain transfers from legacy orbs.
- `src/hooks/useBalances.ts`, `src/hooks/usePrices.ts` — still fetch sol+btc balances/prices in parallel; just no longer surfaced in UI.
- `src/app/api/wallet/send-sol/route.ts`, `send-btc/route.ts`, `generate/route.ts`, `balance/route.ts`, `setup/route.ts` — server-side SOL+BTC code paths preserved (still generates SOL+BTC addresses at signup so existing users / future re-enable just work).
- `src/app/api/auth/create-wallet/route.ts`, `src/app/api/orbs/fund/route.ts`, `src/app/api/tasks/route.ts`, `src/app/api/trails/create/route.ts` — backend.
- `src/middleware.ts` CSP `connect-src` allowlist (still permits `https://api.mainnet-beta.solana.com`, `mempool.space`, `blockstream.info` for the still-running balance hooks).
- `src/app/ar/page.tsx` `currencyLetter()` (renders an "B"/"E"/"S" character for legacy SOL/BTC creatures on the AR view); `src/components/CrackExperience.tsx` `normaliseCurrency()` and `usdValue()` (fall-throughs that classify legacy DB rows); `src/components/OrbDetailSheet.tsx` `CurrencyIcon` label switch — all preserved as read-only fallbacks for legacy DB orbs.
- `src/app/api/wallet/send-btc/route.ts` "Invalid Bitcoin address format" error string — backend validation, never reaches UI under ETH-only flow.

ETH-only migration complete. Verified no BTC/SOL strings remain in user-facing components.

## Deferred to Phase 2
- File renames `OrbAnimation.tsx` → `CreatureAnimation.tsx`, `OrbMarker.tsx` → `CreatureMarker.tsx`, `OrbDetailSheet.tsx` → `CreatureDetailSheet.tsx`. Internal-only filenames; user-facing copy inside these components IS rebranded in Phase 1. Renaming would touch ~5 import sites with no user-visible benefit; pushed to Phase 2.
- Per-creature spawn/catch wiring (Sprite vs Cyclops vs Cat vs Serpent affecting odds, art, mechanics) — Phase 2 scope.
- Catch/witness UX redesign — explicitly Phase 3.
