# BLINK AR Camera Button Fix Brief

## Problem (User Report 2026-05-20)

> "Camera button isn't working on map"

The camera button on `/map` (top-right tool rail, `<Camera>` icon) does nothing visible when tapped. No AR overlay opens, no toast, no error.

## Root Cause Analysis

In `src/app/map/page.tsx` ~line 1050, the button onClick logic is:

```tsx
let nearest: CatchableSpawn | null = null;
if (position && catchableSpawns.length > 0) {
  // pick nearest
}
const target = nearest ?? selectedCatchable ?? catchableSpawns[0] ?? null;
if (target) {
  setArSpawn(target);
} else if (!cameraGranted) {
  handleCameraRequest();
} else {
  setCameraToast(true);
  setTimeout(() => setCameraToast(false), 3000);
}
```

This requires `target` (a `CatchableSpawn`) to exist before opening AR. If `catchableSpawns[]` is empty (user is in an area with no active spawns), the button shows a toast at most — useless.

But the new AR flow (just deployed) shows creatures floating in 3D up to 200m away **regardless of catchable status**. The button should ALWAYS open the camera so the user can look around for nearby creatures, even if none are within the 50m server-catchable radius.

## What To Build

In `src/app/map/page.tsx`:

1. **The camera button must always open `ARCameraOverlay`** when tapped (provided camera permission exists).
2. If `catchableSpawns[]` is empty, still open the overlay with `arSpawn = null`. The overlay should render the camera feed with a "No creatures within 200m — explore the map" message and the close button.
3. If `catchableSpawns[]` has entries, behave as today: pick nearest, pass that spawn to `arSpawn`.

In `src/components/ARCameraOverlay.tsx`:

The component already accepts `spawn: CatchableSpawn | null` per its props. Verify the early return at the top:

```tsx
if (!spawn) return null;
```

If that exists, **change it** to render the camera + a "no creatures nearby" empty state instead of returning null. The user should still see the camera feed.

Empty state should include:
- Camera video feed (already wired)
- Centered glass card: "No creatures within 200m"
- Subtitle: "Walk to the map to find one — or drop a spawn yourself."
- Close button (top-right X) so they can exit.
- Allow leaving and re-opening the overlay later when spawns appear.

If the FSM logic explodes when `spawn` is null (because `distanceM`, `bearingDeg`, `creature_id` etc. all need a spawn), guard those calculations behind `if (spawn)` checks. Don't transition into `materializing/idle` when spawn is null — stay in a new `"empty"` FSM state OR just bail out of the FSM entirely with a simple JSX early return AFTER the camera renders.

Cleanest approach: add an `EMPTY_STATE` JSX block that renders when `!spawn` — uses the same camera ref + close button, just shows the empty card instead of any creature/orb/HUD.

## DO NOT

- Do NOT remove the existing nearest-spawn picker logic — it's still useful when spawns exist.
- Do NOT change the server-side proximity gate (still 50m).
- Do NOT use Tailwind. Inline styles only.
- Do NOT add emojis.

## DONE Means

- Tap the camera button on `/map` even with zero nearby spawns → AR overlay opens, camera turns on, "No creatures within 200m" card appears centered.
- Tap the camera button when spawns exist → opens with nearest spawn pre-selected, full Pokémon-GO flow runs (approaching → catchable).
- `pnpm build` passes with no new TS errors.

## After You Build

Run `pnpm build` and report. Pasquale handles `vercel --prod`.
