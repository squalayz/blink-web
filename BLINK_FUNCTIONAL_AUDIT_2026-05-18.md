# BLINK Functional Audit — 2026-05-18

Production-readiness pass across Map & Spawns, Login & Session, and Wallet.
Methodology: Three parallel deep-read audits + targeted source verification of the highest-impact claims.

Legend: ✅ Working · ⚠️ Partial/Buggy · ❌ Broken · ❓ Untested / requires runtime to confirm

---

## 1. MAP & SPAWNS

| Feature | Status | Notes |
| --- | --- | --- |
| `/map` page load (desktop/mobile/TG) | ✅ | `src/app/map/page.tsx` — dynamic `HuntMap` (ssr:false), geo `watchPosition`, compass/filter row/camera FAB. Auth gate at top redirects to `/auth/signin` if no session. |
| Creature artwork resolution | ✅ | `src/lib/bestiary-art.ts:resolveCreatureArt()` called from `HuntMap.tsx:867,951` and `ARCameraOverlay.tsx`. Falls back to deterministic tier hash if name not in BESTIARY. Not "all wolves". |
| Mitchell best-candidate scatter | ✅ | `src/lib/wild-spawns.ts:142,198-217` — K=10 samples, MIN_SEPARATION_M=60, deterministic seed per `(cellId,bucket,idx)`. |
| Spawn tap → bottom sheet | ✅ | `HuntMap.tsx:989` `onSelectCatchable` → `map/page.tsx` `setSelectedCatchable` → expands sheet with `nearbyCount`, `tier`, name, image. |
| Filter chips (Nearby/Stealth/All) | ⚠️ | `HuntMap.tsx:137` — FILTER_OPTIONS = `["All","ETH","Tasks"]`. **The brief mentions Nearby/Stealth/All Creatures, but the UI today shows All/ETH/Tasks.** Likely intentional ("BLINK: ETH-only" comment) but labels don't match the audit brief — flag for Pasquale. |
| Trails | ✅ | `/trails`, `/trails/[id]`, `.../hunt`, `.../passport`, `/trails/create`, `/api/trails/*` all exist. |
| Camera button → AR overlay | ✅ | `ARCameraOverlay.tsx:47` calls `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })`. iOS/Android `DeviceOrientationEvent.requestPermission()` handled. Camera-permission state mirrored in map page via `navigator.permissions.query`. |
| CATCH button fires | ✅ | `ARCameraOverlay` → `onCatch(arSpawn)` → `performCatch()` → `POST /api/spawns/catch`. |
| Catch DB write + inventory update | ✅ | `src/app/api/spawns/catch/route.ts` does atomic `UPDATE wild_spawns SET caught_by` (lines 176-195), proximity check (50m haversine), conditional fee charge, owner mint, BLINK ERC-20 transfer, then persists tx hashes back to `wild_spawns` (lines 418-425). |
| Geolocation request | ✅ | `map/page.tsx:266-302` — `watchPosition` with `enableHighAccuracy`, denial state UI. |
| "Launch BLINK" / "Enter the World" CTA | ✅ | `src/app/page.tsx:95-103` — `handleEnter()`: if logged in → `/map`, else open AuthModal in signup mode. |
| Bottom nav routes | ✅ | `BottomNav.tsx` → all targets exist: `/map`, `/live`, `/spawn`, `/wallet`, `/messages`. |
| `/spawn` page (place spawn) | ✅ | 5-step wizard (Type → Value → Media → Location → Review). Stealth + Task = "COMING SOON". |
| Real-time spawn updates | ❓ | No Supabase realtime subscription found. Map polls every 60s (`AMBIENT_POLL_MS`), nearby/recent every 30s. **Decision for Pasquale:** add `supabase.channel().on('postgres_changes', …)` or accept polling. |
| Uniswap buyback for 10% fee | ⚠️ | `catch/route.ts:12` TODO comment. 0.02 ETH currently goes straight to treasury, no swap. Flagged but non-blocking. |

**Verdict — Map & Spawns: ✅ Production-ready** with two flag items (filter chip labels, realtime vs. polling) and one open TODO (buyback).

---

## 2. LOGIN & SESSION

| Feature | Status | Notes |
| --- | --- | --- |
| Landing "Sign In" / "Enter the World" buttons | ✅ | `src/app/page.tsx:276-291,567-586` open `<AuthModal>` (signin / signup mode). |
| Auth provider | ✅ | Hybrid: Supabase Auth (custodial username/password) + SIWE (wallet) for holders. |
| Username/password signup → wallet creation | ⚠️ | `src/app/api/auth/create-wallet/route.ts` creates auth user → generates ETH wallet → AES-encrypts private key → upserts profile → signs in. **Race condition:** if profile upsert fails (line 99), the Supabase auth user exists but no profile row → user can sign in but has no `eth_address`. Currently only `console.error`'d; no rollback. |
| Username/password sign in | ✅ | `src/app/api/auth/login/route.ts` (referenced from AuthModal). Returns `{ access_token, refresh_token }`, client calls `supabase.auth.setSession()`. |
| SIWE wallet sign-in | ⚠️ | `/api/auth/siwe/nonce` + `/api/auth/siwe/verify` work end-to-end. Verify returns `{ supabase: { email, token } }` (magic-link hashed_token, lines 100-106). **Bug:** No client code calls `supabase.auth.verifyOtp({type:'magiclink', token_hash})` to convert this into a Supabase session — so SIWE users have an `httpOnly blink_siwe` cookie but no Supabase session, breaking any client code that reads `supabase.auth.getUser()`. Flag for Pasquale: implement client-side `verifyOtp` after SIWE verify, OR remove the magiclink branch. |
| Telegram WebApp auto-login | ❌ | `src/lib/telegram.ts` is bot-message templates only; no `verifyTelegramInitData(hash, botToken)`, no `/api/auth/telegram/*` route. TG context is detected in `providers.tsx` (safe-area inset) but never converted to a session. **Flag for Pasquale:** is TG auto-login in scope for this push? If yes, needs ~3h work (HMAC verifier + endpoint + client trigger). |
| Session persistence on refresh | ✅ | Supabase SDK persists to `localStorage` by default. `onAuthStateChange` listener in `providers.tsx`. |
| Logout | ✅ | `providers.tsx:127-136` calls `supabase.auth.signOut()` AND `POST /api/auth/siwe/logout`. The siwe route clears `blink_siwe` + `blink_siwe_nonce` cookies. |
| Protected routes / middleware | ⚠️ | `src/middleware.ts:51` only protects `/missions`, `/tasks`. `/map`, `/wallet`, `/messages`, `/profile` do their own client-side auth checks because Supabase tokens live in localStorage and aren't visible to middleware. Brief flicker possible. Acceptable but flagged. |
| "Enter the World" requires auth | ✅ | If logged in → `/map`; else AuthModal opens. |
| Cookie security flags | ✅ | SIWE: httpOnly, secure (prod), sameSite lax, 24h TTL. Nonce: httpOnly, 10min single-use. Supabase tokens in localStorage (SDK default — not httpOnly, mild XSS exposure). |
| RLS policies | ✅ | `supabase/migrations/20260405_security_rls.sql` revokes anon access to `profiles` and grants only non-sensitive columns; `eth_encrypted_key` not granted to anon. Policies on `profiles`, `matches`, `orbs`, `messages` exist. |
| New-user landing | ✅ | After signup, profile.`onboarded = true` set immediately; user lands wherever AuthModal `onSuccess` redirects (most callers stay on landing → user clicks Enter the World → `/map`). No multi-step wizard. |
| CSRF protection | ❌ | No CSRF tokens on auth/wallet POSTs. SameSite=lax partially mitigates, but no double-submit token. **Flag for Pasquale:** acceptable for v1, but worth adding before mass launch. |
| `WALLET_ENCRYPTION_KEY` separation | ⚠️ | `src/lib/siwe-session.ts:20-23` — if `NEXTAUTH_SECRET` is missing, falls back to `WALLET_ENCRYPTION_KEY`. In `.env.example` these are listed as separate vars; verify in production env they have **different values**, otherwise a leak of one compromises both auth and wallets. |

**Verdict — Login & Session: ⚠️ Functional but with deferred items.** Core username/password + SIWE flows work. Telegram auto-login is the biggest gap; SIWE magiclink hand-off is a latent bug.

---

## 3. WALLET

| Feature | Status | Notes |
| --- | --- | --- |
| `/wallet` page loads | ✅ | `src/app/wallet/page.tsx`. Profile fetch, balance, activity, NFT tabs. |
| ETH balance | ✅ | `GET /api/wallet/balance?address=…` returns `{ eth, blink, balance }`. |
| BLINK token balance | ✅ | Same route; `BLINK_TOKEN_CONTRACT = 0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B` (Ethereum mainnet). Soft-fail to 0 on RPC error. |
| USD balance display | ❌ → ✅ (FIXED) | `WalletCard.tsx:70` reads `data.balanceUsd` but balance route never returned it → `$xx USD` line was always blank. **Fixed in this audit:** balance route now fetches ETH price via `getCoinPrice('ethereum')` and returns `balanceUsd`. |
| Wallet address display | ✅ | Custodial `profile.eth_address` set during signup, returned via `/api/profile`. |
| Connect external wallet (RainbowKit / WC / MM / CB) | ⚠️ | `src/lib/wagmi-config.ts` configures `[mainnet, base, polygon, arbitrum]` via RainbowKit. **However** balance/catch/send routes all hardcode `https://ethereum-rpc.publicnode.com` and contracts are on Ethereum mainnet → user can connect on Base/Arbitrum and see nothing. **Flag for Pasquale:** lock RainbowKit to mainnet only, OR migrate contracts to Base. Strategic. |
| Deposit address (Receive) | ⚠️ | Shows custodial address. No UI distinction between custodial-vs-external. **Flag for Pasquale:** worth a one-line label "BLINK-managed custodial wallet" before launch. |
| Withdraw ETH (Send) | ⚠️ → ✅ (FIXED) | `/api/wallet/send` expects `{ to_address, amount, password }`. `WalletModal.handleSend()` was sending `{ chain, recipient, amount, userId }` AND not collecting a password → 400 every time. **Fixed in this audit:** field names aligned, password input added to SendState, password is required by the modal before dispatch. |
| Withdraw BLINK (ERC-20) | ❌ | `/api/wallet/send` only handles native ETH `value` transfers. No ERC-20 `transfer()` path. **Flag for Pasquale:** ship for v1 or defer? |
| Catch reward credited to balance | ✅ | `catch/route.ts:393-415` — deployer signer calls `erc20.transfer(catcherAddress, amountWei)`. Balance reflects on next `/api/wallet/balance` (reads chain directly, no cache). |
| Catch reward in activity feed | ❌ → ✅ (FIXED) | Reward tx broadcast but never written to `activity` table → user saw +BLINK in balance but no entry in Activity tab. **Fixed in this audit:** after successful `erc20.transfer()`, an `activity` row is inserted with `type: 'reward'`, title `Caught {name}`, `amount_text +{N} BLINK`, and tx_hash. |
| Transaction history | ✅ | Pulled from supabase `activity` table (`GET /api/activity?user_id=…`). |
| NFT holdings | ✅ | `/api/wallet/blink-nfts` via `wallet-nfts.ts`. Alchemy SDK primary, public-RPC fallback if `ALCHEMY_API_KEY` missing. |
| BLINK token contract address | ⚠️ | Hardcoded across `balance/route.ts`, `catch/route.ts`, `send/route.ts`. **Flag for Pasquale:** consolidate into `NEXT_PUBLIC_BLINK_TOKEN_CONTRACT` env var. Non-blocking. |
| Sign-message verification (SIWE) | ✅ | `src/lib/siwe-session.ts` — HS256 JWT, nonce single-use, 24h TTL. |
| Gas estimation | ✅ | `send/route.ts:69-89` computes balance + fee, blocks send if insufficient. |
| Gas sponsorship / meta-tx | ❌ | None. **Flag for Pasquale:** ship without sponsorship for v1? |
| Private key export | ✅ | `/api/wallet/export-key/route.ts` — password re-prompt, decrypt, return one-shot, rate-limit 5/5min. Old `/api/wallet/keys` deprecated. |
| Custodial key encryption at rest | ✅ | AES via `encryptAES/decryptAES` in `src/lib/production.ts`. |

**Verdict — Wallet: ⚠️ Working with three real bugs (now fixed) + several strategic deferrals.**

---

## SUMMARY

### Auto-fixed in this audit
1. **Balance USD line was always blank** — `/api/wallet/balance` now fetches ETH price from CoinGecko (5min cache) and returns `balanceUsd`.
2. **WalletModal Send was always 400** — wrong field names + no password input. Modal now collects password and posts `{ to_address, amount, password }`.
3. **Catch BLINK rewards were invisible in Activity feed** — `catch/route.ts` now inserts an `activity` row after a successful reward transfer.

### Deferred for Pasquale decision
1. **Telegram WebApp auto-login** — currently zero implementation. ~3h work if in scope.
2. **SIWE magiclink hand-off** — server returns it but client never exchanges it. Either wire `verifyOtp` client-side, or remove the magiclink branch from `/api/auth/siwe/verify`.
3. **Filter chip labels** — brief says "Nearby / Stealth / All Creatures", code shows "All / ETH / Tasks". Likely intentional rebrand but worth confirming.
4. **Spawn realtime vs. 60s polling** — Supabase realtime subscription not wired. Add it or accept polling?
5. **Chain configuration** — RainbowKit allows Base/Arbitrum/Polygon, but all reads/writes are Ethereum mainnet. Lock chains or migrate?
6. **Custodial vs. external wallet UI** — no label clarifying the displayed address is custodial.
7. **ERC-20 (BLINK) send** — only ETH transfers exist today. Ship without it, or extend?
8. **Uniswap buyback for 10% catch fee** — TODO in `catch/route.ts:12`. Currently both halves of the fee skim to deployer/treasury.
9. **Hardcoded BLINK token address** — move to `NEXT_PUBLIC_BLINK_TOKEN_CONTRACT` env var.
10. **CSRF protection** — none on POST endpoints. SameSite=lax mitigates.
11. **Profile upsert race in signup** — wrap in a transaction or check post-creation.
12. **`NEXTAUTH_SECRET` vs. `WALLET_ENCRYPTION_KEY`** — verify they're set to distinct values in production env.
13. **Gas sponsorship** — none. Ship as is for v1?

### Net assessment
The three core areas are **functionally working**. The three highest-impact bugs (silent USD blank, broken Send button, missing activity log) are fixed inline. Everything else is either a strategic call or a deferred polish item.
