# BLINK AR — Pokémon GO-style Catch Flow Brief

## The Problem (User Report 2026-05-20)

When user opens camera (taps spawn on `/map` → `ARCameraOverlay` opens), a **creature card pops instantly** with a "Catch" button — even when the user is 50m+ away from the spawn. This breaks the AR illusion.

User quote:
> "When I open the camera, it instantly gives me a creature to catch with a card. I have to be ON the creature to catch it. When I'm walking towards it, it should look like the creature is getting bigger. It's like a real Pokémon GO experience."

## Goal

True Pokémon-GO-style AR proximity flow:

1. **Open camera while far away** → see the creature **floating in 3D world space** at its real-world location (positioned by compass bearing + scaled by distance). NOT a card. NOT catchable.
2. **Walk towards it** → creature visually **grows larger** as you close the distance (already partly in `/ar/page.tsx` — port that logic).
3. **Within ~10m** → creature transitions into "catchable" state — that's when the card / capture orb / throw mechanic becomes available.
4. **Outside ~10m** → user can SEE the creature in camera view but cannot tap-to-catch. Show distance badge ("12m away — get closer").
5. **Server proximity gate stays at 50m** for the actual catch API (already enforced in `/api/spawns/catch/route.ts`).

## Files Involved

- `src/components/ARCameraOverlay.tsx` (839 lines) — current AR catch overlay, FSM-driven, opens from `/map`. **Main file to rework.**
- `src/components/ar/CreatureVisual.tsx` (251 lines) — renders the creature visual. Needs distance-aware scale + position.
- `src/app/ar/page.tsx` (626 lines) — has bearing/distance/scale logic for floating orbs (reference implementation, lines 200–250 specifically). **Port the positioning math from here.**
- `src/app/map/page.tsx` line ~1822 — where `ARCameraOverlay` is rendered.
- Already enforced server-side: `src/app/api/spawns/catch/route.ts` `PROXIMITY_M = 50`.

## What To Build

### Phase 1: Distance-Aware Creature Rendering

In `ARCameraOverlay.tsx`:

- Compute `distanceM` and `bearingDeg` from `userPosition` to `spawn` on every position update (already partially done — `distanceM` exists, bearing missing).
- Add a new FSM state: `"approaching"` — entered when `distanceM > CATCHABLE_RANGE_M` (where `CATCHABLE_RANGE_M = 10`).
- In `"approaching"` state:
  - Render the creature using `CreatureVisual` BUT positioned by bearing (horizontal offset from camera heading) + scaled by distance (closer = bigger, farther = smaller).
  - Disable the swipe-throw / capture orb entirely.
  - Show a HUD pill near the creature with `"{Math.round(distanceM)}m away — keep walking"`.
  - Show direction arrow if creature is outside FOV (compass bearing vs heading).
- Once `distanceM ≤ CATCHABLE_RANGE_M`, transition `"approaching" → "materializing" → "idle"` (existing flow). NOW the user can swipe-throw.

### Phase 2: Compass Heading + Camera Orientation

`ARCameraOverlay.tsx` currently uses `tilt` (devicemotion) but does NOT consume `deviceorientation` (compass heading). The `/ar/page.tsx` reference DOES consume it (`useDeviceOrientation` hook or similar) — port that. Use:

```tsx
const heading = useDeviceHeading(); // 0–360 from magnetic north
const bearing = bearingDeg(userPos.lat, userPos.lng, spawn.lat, spawn.lng);
let deltaH = bearing - heading;
if (deltaH > 180) deltaH -= 360;
if (deltaH < -180) deltaH += 360;
const xPct = 0.5 + deltaH / FOV_DEG; // 0=left edge, 1=right edge
```

If `xPct < 0` or `> 1`, creature is outside FOV — render a compass arrow on the screen edge pointing toward it instead of the creature itself.

### Phase 3: Distance-Based Scale

```tsx
const CATCHABLE_RANGE_M = 10;
const VISIBLE_RANGE_M = 200; // creature visible up to this far
const distanceFactor = 1 - Math.min(Math.max((distanceM - CATCHABLE_RANGE_M) / VISIBLE_RANGE_M, 0), 1);
const scale = 0.3 + distanceFactor * 0.7; // 0.3 (far) → 1.0 (close)
```

Apply this scale to the `CreatureVisual` wrapper (transform: scale).

### Phase 4: No Card Until Catchable

Currently the creature appears as a styled card. Per user request, the **far-away rendering should be the creature ONLY** (transparent background, no card frame). Only when `distanceM ≤ CATCHABLE_RANGE_M` does the BLINK eye-orb / capture UI fade in.

Modify `CreatureVisual.tsx` to accept a `mode: "world" | "catchable"` prop:
- `"world"` → just the creature artwork, no card frame, no Catch button, transparent background, slight glow halo.
- `"catchable"` → existing card-style with capture FSM.

Default open should be `"world"` mode if user is > 10m. Auto-promote to `"catchable"` when in range.

## Constants to Add

```tsx
const CATCHABLE_RANGE_M = 10; // can throw orb / catch when within this distance
const VISIBLE_RANGE_M = 200;  // creature visible (but uncatchable) up to this distance
const FOV_DEG = 60;
```

## DO NOT

- Do NOT remove the existing 50m server proximity check — it stays.
- Do NOT introduce new dependencies. Use existing math helpers (haversine, bearingDeg).
- Do NOT use Tailwind. **Inline styles only** (BLINK rule).
- Do NOT add emojis to UI (BLINK rule, except already-present emoji UTF strings).
- Do NOT break the existing FSM transitions or success path — only add the `"approaching"` state above `"materializing"`.

## DONE Means

- Open camera, user is 100m from spawn → see creature floating mid-screen, small, with `"100m away"` label. No card, no Catch button.
- Walk towards spawn → creature scales up smoothly. Compass arrow if outside FOV.
- Cross 10m radius → creature pulses, BLINK eye-orb fades in, swipe-throw becomes available. Existing success path runs.
- Server still rejects catches > 50m (untouched).
- No console errors, no Tailwind, no broken types.

## After You Build

Run `pnpm build` (or `npm run build`) to verify TypeScript + Next.js builds pass. Don't deploy — Pasquale handles `vercel --prod`.
