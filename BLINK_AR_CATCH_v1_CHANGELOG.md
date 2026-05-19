# BLINK AR Catch v1 — Changelog

The static "PNG slapped on the camera" AR view is gone. The catch experience
is now a Pokemon-GO-style sequence: materialize → idle (alive) → throw the
BLINK eye-orb → shake → mint reveal card.

## What changed

### New components — `src/components/ar/`

- **`CreatureVisual.tsx`** — 2D creature renderer with state-driven life:
  materialize vortex (600ms), spinning rarity halo, breathe + bob loop on
  idle, occasional 4-7s blink/glance brightness flash, proximity-driven
  scale + opacity falloff, capture suck-into-orb, fail-escape sequence.
  Single image source from `resolveCreatureArt`. Tilt + scale + bob are
  nested across three transform layers so they don't fight each other.
  This is the **only** component a future Three.js / GLB-backed v2 needs
  to replace — its `CreatureVisualState` contract is the surface.

- **`CaptureOrb.tsx`** — the BLINK eye-orb (sources `/blink-orb-256.webp`,
  same asset as `eye-orb-watcher-prime-MASTER.jpg` — they are byte-identical;
  256px webp is the optimised version). Phases: `ready` (bottom-centre,
  tappable), `throwing` (800ms parabolic arc up to ~50vh with rotation),
  `shaking` (1.2s Pokeball-cadence wiggle), `locked` (white-green burst +
  full-screen flash), `escaping` (breaks open, fades out).

- **`ParticleField.tsx`** — single `<canvas>` with a rAF loop. Modes:
  `materialize` (40 sparks fly inward), `idle` (lazy upward drift, ≤60
  total), `throwTrail` (3 sparks/frame near creature centre), `lockBurst`
  (60-particle radial explosion). Honours `prefers-reduced-motion`. DPR
  capped at 2 so a Retina/iPhone doesn't burn frames on a 4× canvas.

- **`CatchResult.tsx`** — full-screen reveal card. Big "CAUGHT %NAME%"
  headline, tier stars (1-5, mythic = 5), NFT card with image / tokenId /
  BLINK reward / short tx hash, View on OpenSea + Continue Hunt buttons.

### Refactored — `src/components/ARCameraOverlay.tsx`

Full rewrite around a `useReducer` FSM with states:
`materializing → idle → aimed → thrown → captured → shaking → success / failed`

The catch API call (`POST /api/spawns/catch`) fires immediately on THROW
so the network round-trip overlaps the 800ms arc + 1.2s shake. After the
shake animation finishes, the orb stays "shaking" with a `Confirming on
chain…` pill until the mint promise resolves, then advances to either
`success` (lock burst → result card) or `failed` (orb escape → creature
pops back → return to idle or close depending on error class).

Swipe-up gesture: pointerdown captures start time/y, pointerup checks for
≥80px upward delta within 700ms → fires the throw. Tap CATCH button still
works as the fallback.

Client-side 50m proximity gate (mirrors server `PROXIMITY_M`). Below it
the creature shrinks to 0.55× scale and 0.35 opacity; "Get closer · Xm
away" pill appears; orb is hidden; CATCH button switches to "Out of range".

### Contract change — `ARCameraOverlay` props

```diff
- onCatch: () => void
- catching?: boolean
+ onCatch: () => Promise<ARCatchResult | { error: string }>
+ userPosition: { lat: number; lng: number } | null
```

`map/page.tsx` updated to inline a new async handler that calls
`/api/spawns/catch` and returns the JSON straight back to the overlay.
The legacy `setCatchResult` modal flow is bypassed when the AR overlay
is the source — AR renders its own `CatchResult` card.

### Asset

- Did **not** create `public/eye-orb-master.png` as the spec asked. The
  same image is already at `public/blink-orb-master.jpg` (byte-identical
  to `~/.openclaw/workspace/blink/eye-orb/eye-orb-watcher-prime-MASTER.jpg`)
  and there's an optimised 13kB `public/blink-orb-256.webp` already in
  the tree. `CaptureOrb` consumes the latter. The source is a JPEG with
  a black background (not transparent PNG), so a future polish pass that
  needs cleaner alpha will have to mask it manually.

### Sound

Reused existing `src/lib/sounds.ts`. Mapped:

- materialize → `sounds.play('reveal')`
- throw → `sounds.play('nearby')` (placeholder whoosh)
- success → `catchMythic` / `catchRare` / `catchCommon` based on tier

No new audio assets added in this pass per spec.

## Screenshots needed (manual QA)

- [ ] AR view loading state ("Starting camera…")
- [ ] Materializing — vortex + creature reveal mid-animation
- [ ] Idle — creature with bob + breathe + halo + idle sparks
- [ ] Out-of-range — "Get closer · XXm away" pill + dim/small creature
- [ ] Ready — orb sitting at bottom + "↑ swipe up to throw" hint
- [ ] Thrown — orb mid-arc + throw trail particles
- [ ] Shaking — orb wobbling + "Capturing…" pill
- [ ] Confirming-on-chain — orb still + "Confirming on chain…" pill
- [ ] Lock burst — 4 stars + white flash frame
- [ ] Result card — caught name + stars + NFT image + OpenSea/Continue
- [ ] Failed escape — orb cracks, creature pops back, error pill
- [ ] iOS Safari + Android Chrome parity check

## Known gaps / v2 hooks

- **No GLB / Three.js yet.** Per spec — v1 is 2D. `CreatureVisual` is
  the single seam: same props, same state contract, a v2 implementation
  swaps the inner `<img>` for an `@react-three/fiber` canvas.
- **No accelerometer-aware throw arc.** The orb's parabolic path is a
  pure CSS keyframe; pointer release direction is not used for visual
  trajectory (only for gesture detection). A v2 with Three.js could
  physically arc the orb toward the live tilt-adjusted creature position.
- **No dedicated throw / whoosh / lock SFX.** Throw reuses `nearby`,
  lock uses tier catch sounds. Adding `whoosh.mp3` + `shake.mp3` +
  `lock.mp3` would noticeably improve the feel.
- **Eye-orb image is JPEG with a black bg, not a transparent PNG.** The
  in-game orb appears as a circular crop with a heavy neon-green glow,
  which hides the rectangular bounds — but at certain angles you can
  see the boundary. Future work: bake out a real transparent PNG.
- **Materialize particle vortex** uses a single conic gradient + spin,
  not actual orbiting particles. The canvas `materialize` mode adds the
  inward-flying sparks; the gradient is the colour wash behind them.
- **Server proximity check is still authoritative.** Client gating is
  UX-only; the API will still 400 if GPS drift makes the client think
  it's in range when the server says it isn't.
- **Reduced-motion path.** Particle field bails out of continuous spawn
  in reduced-motion, and CSS animations on the orb/creature are turned
  off via `@media (prefers-reduced-motion: reduce)`. The throw + shake
  still play (the catch needs a visual confirmation); the materialize
  vortex spin still runs (560ms, single shot).
- **Did NOT deploy.** Per instructions — committed locally only.
