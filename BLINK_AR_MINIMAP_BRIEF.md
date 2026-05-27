# BLINK AR — Minimap Overlay Brief

## The Ask (User Report 2026-05-20)

> "When camera is open we also need a little map on the bottom left that shows where to find creatures — so people can still look for creatures. Kind of like Pokémon GO or Call of Duty. Research very hard to make it absolutely perfect and clean."

Currently the AR camera overlay (`src/components/ARCameraOverlay.tsx`) shows the camera feed, the in-world creature (when one is nearby), distance pill, compass arrow, and empty state. There is NO map. User wants a small radar/minimap in the bottom-left so they can navigate to creatures without leaving AR mode.

## Reference Aesthetic

- **Pokémon GO compass:** small circular minimap with player in center, creatures as glyphs around the edge, slight rotation with heading.
- **Call of Duty minimap:** rectangular bottom-left mini-map with enemies/objectives as colored dots, rotates with camera direction, clean translucent black-glass styling.
- **BLINK style:** neon green (#00FF88) + white on black, no Tailwind, no emojis in UI. Match the rest of the AR overlay's glass-card aesthetic.

## What To Build

Add a `<MinimapRadar>` component rendered inside `ARCameraOverlay.tsx` (or as a standalone file `src/components/ar/MinimapRadar.tsx`). Style preference: **circular radar** (Pokémon GO–style) since it pairs naturally with a compass-heading-rotated AR view. Rectangular is also OK if the implementer thinks it reads cleaner — judgment call.

### Layout

- Fixed position: `bottom: 20px + safe-area-inset-bottom`, `left: 16px`.
- Size: 110px diameter (mobile-first; do not eat too much screen).
- z-index: above camera feed, below modal close button.
- Hidden during `success` / `failed` FSM states (don't clutter the catch reveal animation).

### Visuals

- **Outer ring:** 2px solid neon-green (#00FF88) with subtle outer glow (`box-shadow: 0 0 12px rgba(0,255,136,0.35)`).
- **Background:** `rgba(10,10,15,0.65)` with `backdrop-filter: blur(8px)`.
- **Center dot (player):** small white-filled circle, 10px diameter, with a thin neon-green halo. Pulses softly (2s ease-in-out infinite).
- **Heading indicator:** subtle triangular wedge (light gradient sweep) emanating from center pointing UP — but the entire minimap content (creatures, cardinal markers) ROTATES so that "current heading" is always at the top. The wedge itself stays fixed pointing up.
- **Cardinal letter "N":** small "N" label on the radar edge, rotates inversely so it always points to magnetic north — gives orientation context.
- **Creature dots:** one dot per `catchableSpawns[]` entry, plotted by relative bearing + distance:
  - Color: use `spawn.tier_color` if available, fallback `#00FF88`.
  - Size: 7px diameter.
  - Glow ring: thin, color-matched.
  - Position math: convert (player, creature) → (bearing, distance). Clamp distance to radar radius. Subtract heading from bearing so it rotates with view.
  - If `is_genesis: true` → render as pulsing gold dot instead.
- **Out-of-range creatures:** clamp position to the radar edge (still visible as an edge dot indicating direction).
- **Tap target:** tapping a creature dot should call `setArSpawn(spawn)` (parent prop callback) so the user instantly switches the AR view to that creature.

### Math (use existing helpers)

```ts
const RADAR_RADIUS_PX = 50;        // inner usable radius
const RADAR_RANGE_M = 250;         // creatures up to this far show on radar
const distance = haversineMeters(userPosition.lat, userPosition.lng, spawn.lat, spawn.lng);
const bearing = bearingDeg(userPosition.lat, userPosition.lng, spawn.lat, spawn.lng);
let delta = bearing - heading;
if (delta > 180) delta -= 360;
if (delta < -180) delta += 360;
const r = Math.min(distance / RADAR_RANGE_M, 1) * RADAR_RADIUS_PX;
const rad = (delta * Math.PI) / 180;
const x = Math.sin(rad) * r;       // canvas-style: y inverted
const y = -Math.cos(rad) * r;
```

### Props Signature

```tsx
interface MinimapRadarProps {
  userPosition: { lat: number; lng: number } | null;
  heading: number | null;           // 0-360, may be null if device-orientation not granted
  spawns: CatchableSpawn[];          // from parent — same array map page uses
  activeSpawnId: string | null;     // currently-targeted spawn (gets a ring highlight)
  onTapSpawn: (spawn: CatchableSpawn) => void;
}
```

### Wiring

In `ARCameraOverlay.tsx`:

1. Extend props to accept `spawns: CatchableSpawn[]` and `onSwitchSpawn: (s: CatchableSpawn) => void`.
2. Render `<MinimapRadar ... />` always while overlay is open (also during empty state — actually especially during empty state, since that's when the user needs the map most).
3. When user taps a creature dot, call `onSwitchSpawn(spawn)` which the map page can wire to `setArSpawn(spawn)` to swap the active target.

In `src/app/map/page.tsx`:

1. Pass `catchableSpawns` to `<ARCameraOverlay spawns={catchableSpawns} />`.
2. Pass `onSwitchSpawn={(s) => setArSpawn(s)}`.

### Empty Heading Fallback

If `heading` is `null` (device-orientation permission denied or unavailable) → render minimap as a TOP-DOWN unrotated map with NORTH-UP. Show a small "calibrate" hint or just don't rotate. Don't crash, don't hide the map.

### Empty Spawn Fallback

If `spawns` is empty → render minimap with just the center player dot + cardinal N marker + thin tag at the bottom of the radar: "No creatures nearby". Same circular frame.

## DO NOT

- Do NOT use Tailwind. Inline styles only.
- Do NOT use emojis in UI.
- Do NOT use Mapbox / Leaflet for this. Pure SVG or absolutely-positioned divs — keep it cheap. This minimap renders on a phone with the camera already eating GPU.
- Do NOT break the empty-state JSX or the approaching/idle/catchable FSM flow.
- Do NOT remove the existing compass arrow that points to off-FOV creatures — keep both. The radar shows ALL creatures in radius; the compass arrow points at the active one.
- Do NOT poll spawns inside the overlay — the parent already polls.
- Do NOT use any new npm dependencies.

## Edge Cases / Polish

- Tap area for each dot should be at least 24x24px (Apple HIG) — render a transparent button around each dot.
- If `activeSpawnId` matches a dot, give it a brighter neon-green ring (`box-shadow: 0 0 12px #00FF88`) so the user can see which one the AR is currently rendering.
- Smooth heading interpolation: avoid snapping minimap rotation by 360°. If heading wraps from 359→1, transition continuously.
- Handle SSR safely: gate window/navigator usage in `useEffect`.

## DONE Means

- Open `/map` → tap camera → see camera feed + small neon-green circular radar bottom-left.
- Spawns within 250m render as colored dots inside the radar, positioned correctly by bearing/distance.
- Rotating the phone rotates the radar to keep current heading at top.
- Tapping a dot switches the AR active target to that creature.
- Empty state shows the radar with just the player dot + "No creatures nearby" caption inside the radar frame.
- Build passes: `pnpm build` with no new TS errors.
- No new npm dependencies added.

## After You Build

1. Run `pnpm build` and report the build output.
2. Do not deploy — Pasquale handles `vercel --prod`.

## Research Notes (for the implementer)

- The bearing/heading math is already proven in `src/app/ar/page.tsx` lines 200-250 — match its conventions.
- `useDeviceHeading` / `heading` state is already wired in `ARCameraOverlay.tsx` (see the recent refactor — `webkitCompassHeading` + `360 - alpha` fallback).
- `haversineMeters` and `bearingDeg` helpers already exist in `ARCameraOverlay.tsx`.
- `CatchableSpawn` shape: `{ id, lat, lng, tier, tier_color, name, image_cid, image_url, creature_id, expires_at, is_genesis }` (see `src/app/api/spawns/ambient/route.ts`).
