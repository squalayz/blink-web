# BLINK Polish Brief — Walk Button + Loading Screen

**Goal:** Make "Virtually Walk There" feel **magical and premium** + replace the boring walk loading screen with a creature-capture animation using the canonical BLINK **Eye Orb — Watcher Prime**.

Mainnet contracts are LIVE — don't touch them. Don't touch joystick logic (just shipped). Two-part scope, both visual only.

---

## Part 1 — "Virtually Walk There" Button Polish

**Where:** `src/app/gift/[short_code]/GiftLandingClient.tsx` (and any other place "Virtually Walk There" copy lives — `src/app/gift/[short_code]/hunt/page.tsx`)

**Current state:** Plain primary button. Functional but doesn't telegraph that this is the magical/dreamy path vs. the "I'm physically walking there" path.

**Make it:**
- Glossy glass pill (rounded-full, semi-translucent black/dark-green base with subtle inner glow)
- Neon green (#00FF88) glow ring on the outside, breathing/pulsing subtly (3–4s loop)
- Animated shimmer sweep across the surface every ~5s (diagonal gradient highlight passing left→right, like a fingerprint scan / premium card swipe)
- Tiny floating orb icon on the left (≤18px) — use `/blink-orb.png` at small size, or render a CSS sphere with a vertical green seam
- Hover/tap state: glow intensifies, slight scale (1.02), shimmer accelerates
- Keep the same height as the primary button — DO NOT make it taller. The premium feel comes from finish, not size.
- Mobile-safe: shimmer animation MUST respect `prefers-reduced-motion`
- Inline styles only (per project rule, no Tailwind)

**The "I'm physically walking" / real-walk option stays as the regular primary button** — the contrast is the whole point. Premium pill = magical path.

---

## Part 2 — Walk Loading Screen Rebuild

**Where:** `src/app/gift/[short_code]/walk/WalkClient.tsx` — the loading state *before* the map renders, and/or the existing "pulsing eye + radar" preloader if there's one.

**Current state:** Pulsing eye + radar (or basic loader). Boring.

**Make it:** A 1.2–1.8 second capture animation. Sequence:
1. **0.0s:** Black/void background with subtle green particle dust (matches BLINK brand bg `#0a0a0f`)
2. **0.1s:** The target creature floats in center-screen, gently bobbing, faint green aura. Pull the creature from the gift's bestiary asset if available (use `/cards/{id}_{slug}.webp` or the `gift.asset.imageUrl`), otherwise use a generic silhouette with `/floating/oracle.png` as fallback.
3. **0.4s:** A streak of green light flashes in from the top-right corner
4. **0.5s:** The **Eye Orb (Watcher Prime)** flies in along the streak path, spinning, scaling up from small to medium as it approaches the creature. Asset: `/blink-orb.png` (1024px) or `/blink-orb-master.jpg` (2048px).
5. **0.8s:** Orb makes contact with the creature — burst of neon green plasma rays radiating outward, creature gets sucked into the orb (scale-down + opacity fade INTO the orb position)
6. **1.0s:** Orb closes / pulses 3 times rapidly (capture rhythm — like the classic 3 wiggles but faster and electric)
7. **1.3s:** Green flash → orb fades out → map fades in
8. **1.5s+:** Map is fully rendered, walk session begins

**Implementation hints:**
- Pure CSS keyframes + React state machine (no GSAP). One `<div>` per element absolutely positioned, transform + opacity animated.
- The orb spin: `transform: rotate(0deg) scale(0.3)` → `rotate(720deg) scale(1.0)` over ~600ms with cubic-bezier ease
- Plasma burst: 6 radial gradient slivers with `transform-origin: center` rotating outward, opacity 0→1→0 in 300ms
- Capture wiggle: small `translateX` ±4px x3 over 300ms total
- Background particle dust: 12–20 small green dots, CSS-only, slow `translateY` loop with staggered delays
- MUST respect `prefers-reduced-motion`: fallback to a static 600ms fade with the orb centered, no spin/flash
- MUST not block the underlying data fetch — the animation runs in parallel with the page hydration, and if hydration finishes early, hold the animation through its minimum 1.2s for the dramatic beat, then transition.

**Asset paths:**
- `/blink-orb.png` — 1024×1024 (use this for the loader, faster load)
- `/blink-orb-master.jpg` — 2048×2048 (only if needed for retina hi-DPI)
- Brand bg: `#0a0a0f`. Brand neon: `#00FF88`. No other colors.

---

## Acceptance

- `npm run build` green
- `npx tsc --noEmit` no new errors
- Manual test on `/gift/pbumdl4w` (landing) → click "Virtually Walk There" → loading animation plays → map renders correctly
- Test in headless Chromium at 390×844 (iPhone 13) — animation runs without horizontal overflow
- `prefers-reduced-motion: reduce` actually disables the spin/flash
- Commit cleanly with two separate commits:
  1. `feat(walk-button): glossy glass pill with green glow + shimmer sweep`
  2. `feat(walk-loader): creature-capture animation with Eye Orb`
- Deploy to production via `vercel --prod` (per project rule — only Claude/this brief deploys, not Pasquale)

## Hard rules
- NO Tailwind (inline styles only)
- NO emojis in UI
- NO mock data
- NO touching contract code or RPC logic
- NO touching `WalkClient.tsx` joystick code (just shipped, do not regress)
- Black + neon green + white ONLY in the polished elements
