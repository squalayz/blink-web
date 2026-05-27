# BLINK — FULL AR Game Audit (Pokémon GO–level, brutal)

You are an expert AR location-based game auditor. Perform a FULL, ruthless audit of this BLINK codebase. Your output must be a single audit report file at `/Users/pasqualeceli/Projects/mishmesh/mishmesh/BLINK_AUDIT_REPORT.md` AND a short summary printed to stdout. Do NOT make code changes during this audit pass — only investigation, findings, prioritized recommendations, and exact code suggestions.

## Audit scope (cover EVERY area)

### 1. Map rendering & GPS
Files to scan: `src/components/HuntMap.tsx`, `src/app/watch/page.tsx`, `src/app/map/page.tsx`, `src/lib/blink-map-style.ts`, `src/app/gift/[short_code]/walk/WalkClient.tsx`
- Mapbox token usage, style loading, performance on mobile
- GPS accuracy handling — `watchPosition` vs `getCurrentPosition`, accuracy thresholds, stale-fix detection
- Pan/zoom UX, gesture conflicts, hex grid overlays, marker stacking
- Real-world syncing — how often does the avatar position update, how is debouncing/throttling done
- IP geo fallback strategy when GPS is blocked
- Reverse-geocoding usage, rate limits, Nominatim/Mapbox lookups
- Tile loading speed, vector vs raster, offline behavior
- Battery impact of high-accuracy GPS + map rendering loops

### 2. Gift system
Files to scan: `src/app/api/gifts/**`, `src/app/gift/**`, `src/lib/gift-escrow.ts`, `src/lib/gift-utils.ts`
- **Critical bug context:** I just hit "Gift already opened" on `jwg7y39t` — that was caused by me inserting a gift row with `status='spawned'` directly (skipping the create API). I corrected it to `pending`. But the audit MUST find:
  - All "gift already opened" error paths and which conditions trigger them
  - Whether the open-route status machine has any edge cases that wrongly emit this
  - Race conditions in the conditional UPDATE (`status='pending'` + `recipient_id IS NULL`)
  - What happens if `recipient_id` is set but `status` is still `pending` (orphaned state)
  - Refund flow, expiry sweep, cancel route — are they consistent?
- Opening flow UX from landing → open → walk → catch → claim. Friction points, latency, animations, fallbacks.
- "Gift already opened" — should it offer a redirect to a recovery page or just dead-end with a back button? Currently dead-ends. Bad UX.
- State management of the gift row vs the gift_avatar vs the creature_spawn — are there orphaned rows?
- NFT transfer on claim — is it atomic? What happens if the on-chain tx reverts after Supabase claims?
- BLINK/ETH transfer at claim — same question.
- Anonymous receiving (just shipped) — confirm no auth-gate regressions
- Sender preventing self-open — is there a friendlier UX than a 400 error?
- Multiple gifts per user, gift inventory UX, history, expired-gift visibility

### 3. Walking mechanics (virtual joystick + real GPS)
File: `src/app/gift/[short_code]/walk/WalkClient.tsx`
- Joystick math (deadzone, sensitivity, math-vs-compass convention)
- Walk speed (currently 3 m/s — jog pace, debatable)
- Catch radius (currently 5m — too tight? too loose?)
- Step/distance tracking — is there real step detection or just GPS interpolation?
- Background/foreground behavior — does the timer/avatar pause when tab hidden?
- Real GPS layered with virtual walking — collision logic, which wins, anti-cheat
- Battery impact of `setInterval` tick loop + map redraws
- Haptic feedback usage — is it consistent? Throttled?
- Avatar interpolation smoothness
- Cinematic intro timing (1500ms) — should it skip on repeat opens?
- Joystick on iOS Safari — bottom-toolbar overlap, Mapbox gesture race
- Approach loop volume curve — UX joy or annoyance?
- "Recently panned" pause (3000ms) — does it feel right?

### 4. All toggles & persistence
Hunt across: bottom nav, settings sheet, sound toggle, privacy toggle, presence toggle, walk-mode toggle, hex-grid toggle, AR-cam toggle
- On/off state persistence (localStorage? Supabase? cookies?)
- UI feedback on toggle (animation, sound, haptic)
- Edge cases: toggling mid-flow, toggling while logged out, toggling on different devices
- Are toggles synced cross-device?
- Default states — sensible?
- Hidden toggles users might miss?

### 5. Overall feel — better than Pokémon GO?
Compare honestly:
- Loading screen joy (we have Eye Orb capture animation now)
- Catch animation polish — is there confetti, sound, haptic build-up?
- "First catch ever" celebration?
- Onboarding clarity for someone arriving via a gift link
- AR camera — does it exist? Does it work?
- Notifications / push for spawn alerts (probably missing)
- Friends list, leaderboards, social proof on the map
- Music / ambient audio while walking
- The "Pokédex" (Bestiary) — is it satisfying?
- Reward dopamine loops — claim → confetti → share → invite

### 6. Performance & technical hygiene
- Bundle size, code-splitting, dead imports
- API route latency, N+1 supabase calls
- Image assets — are any still oversized? (we already de-bloated blink-orb)
- Service worker / PWA?
- Error boundaries on all major flows
- Sentry / logging?

## Required deliverables

Output ONE file: `BLINK_AUDIT_REPORT.md`

Structure it as:
```
# BLINK Audit Report — <date>

## Executive Summary
1 paragraph: state of the game vs Pokémon GO.

## P0 — Critical bugs (blockers)
For each: file:line, root cause, repro, exact fix.

## P1 — High-impact polish / UX wins
For each: file, current behavior, proposed change, exact code suggestion.

## P2 — Medium polish
Brief bullets with file refs.

## P3 — Future ideas (nice-to-haves)
Bullets.

## Pokémon GO gap analysis
Where we win, where we lose, where we tie. Concrete deltas.

## Prioritized 7-day roadmap
Day-by-day list of what to ship first.
```

Then in stdout: print "## TOP 5 P0 FIXES" with the most urgent items.

## Rules
- Do NOT modify any source file during this audit. Only generate the report.
- Read everything thoroughly. Use `grep`, `find`, `cat`, `head`. Don't skip files.
- Be specific: file:line refs, exact suggested code blocks where applicable.
- Be brutal. If something is broken or weak, say so plainly.
- Mainnet contracts LIVE — note any contract-touching findings explicitly.
- Joystick + perf + map declutter + anon walk just shipped today — note these as recent context.
