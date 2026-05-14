# BLINK Phase 3.5 — ORB→BLINK vocabulary + Mystical Sounds

Two-part follow-up that finishes sections 4 (vocabulary) and 5 (sounds)
from the original Phase 3 brief. Both parts ship green-on-black, no
new dependencies, and `npm run build` is clean.

## Commits

1. `feat(phase3.5): ORB→BLINK vocabulary in user-facing copy`
2. `feat(phase3.5): mystical BLINK sounds + sound toggle`

---

## Part A — ORB → BLINK vocabulary (user-facing only)

Swept `src/app/**/*.{tsx,ts}` and `src/components/**/*.{tsx,ts}` for
case-variants of the word "orb" and swapped only the strings that
render to a user. Everything else (TypeScript types, variable/parameter
names, CSS keyframe identifiers, file/component names, `/api/orbs/*`
route paths, and Supabase column/table names) is deliberately
untouched — those will land in a future migration phase along with
DB-level renames and API redirects.

### Strings changed

| File | Before | After |
| --- | --- | --- |
| `src/app/watch/page.tsx` | `Launch Orb` (drop CTA) | `Launch BLINK` |
| `src/app/map/page.tsx` | `Enable location to find nearby orbs` | `Enable location to find nearby BLINKS` |
| `src/app/trails/[id]/passport/page.tsx` | `Orbs Cracked` stats label | `BLINKS Caught` |

### Strings audited and intentionally left alone

- Most pages already use "creature" / "BLINK" — the legacy "orb"
  word survived only in the three spots above. The brief is "orb → BLINK",
  not "creature → BLINK", so existing "creature" copy stays put.
- Component-internal CSS animation names (`orbPulse`, `orbShake`,
  `orbFloat`, `mmOrbPulse`, etc.) — not user-visible.
- TypeScript type names (`Orb`, `OrbRarity`, `OrbCurrency`,
  `OrbStatus`, `OrbType`, `OrbKind`) — internal API surface.
- Filenames (`OrbAnimation.tsx`, `OrbDetailSheet.tsx`,
  `OrbMarker.tsx`, `/orb/[code]/page.tsx`) — file rename out of
  scope this phase.
- API request/response field names (`orb_id`, `orbs_cracked`,
  `orbs_found`, `orbs_dropped`) — DB schema.
- Wallet error toasts that mention "active orbs" and the
  `live` activity-feed rebrand function — both live inside larger
  in-progress changes already staged elsewhere in the working tree,
  so editing them now would conflate this commit with unrelated WIP.
  They are queued for the same future API/DB rename pass.

---

## Part B — Mystical Sounds

Added a lightweight audio system with seven cue slots, a global mute
toggle, and trigger sites at the most cinematic moments in the app.
No new dependencies — built directly on the Web Audio API.

### New files

- **`src/lib/sounds.ts`** — singleton `SoundManager`.
  - API: `sounds.play(name, volume?)`, `sounds.setEnabled(bool)`,
    `sounds.enabled` (getter), `sounds.init()`.
  - Type `BlinkSound = 'awaken' | 'reveal' | 'spotted' |
    'catchCommon' | 'catchRare' | 'catchMythic' | 'tick'`.
  - Preloads MP3 buffers from `/public/sounds/<name>.mp3` via
    `requestIdleCallback` (1.2s `setTimeout` fallback).
  - If a buffer is missing or fails to decode, falls back to a
    short synthesised tone built from `OscillatorNode`s so the
    triggers fire audibly even before real assets are sourced.
  - Persists `enabled` to `localStorage` under
    `blink:sound:enabled` (default ON).
  - Auto-mutes when `prefers-reduced-motion: reduce` matches, and
    listens for changes to that media query at runtime.
  - Resumes a suspended `AudioContext` on the first user gesture
    (pointerdown or keydown) and again on every `play()` for
    Safari compliance.

- **`src/components/SoundToggle.tsx`** — small fixed-position speaker
  icon (top-right, z-index 1500). Neon-green outline + glow when on,
  gray when off. Plays a `tick` when re-enabled. Mounted globally
  via `Providers`.

- **`public/sounds/README.md`** — documents the seven expected
  filenames and CC0 sourcing rules so non-Claude contributors can
  drop in real audio later.

### Wiring (trigger sites)

| Sound | Where |
| --- | --- |
| `awaken` | `src/app/auth/signin/page.tsx` — fires immediately after `/api/auth/siwe/verify` succeeds, before redirect to `/watch` |
| `reveal` | `src/components/YourBestiary.tsx` — fires once per mount, the first time `owned.length > 0` resolves (skipped for the `compact` variant) |
| `spotted` | `src/components/HuntMap.tsx` — fires when a non-claimed marker is newly added; `spottedIdsRef` dedupes per page-view and a 220ms `lastSpottedAtRef` guard prevents a burst when a batch lands at once |
| `catchCommon` / `catchRare` / `catchMythic` | `src/components/CrackExperience.tsx` and `src/app/catch/[id]/page.tsx` — fires the instant the crack confirms; rarity router `catchSoundFor()` picks the right one (Common → Common, Rare → Rare, Legendary → Mythic) |
| `tick` | AWAKEN button (`signin`), CRACK button (`CrackExperience`), MINT button (`YourBestiary`), and the SoundToggle itself on re-enable |

### Constraints honoured

- Inline styles only on `SoundToggle` (no Tailwind).
- Palette stays inside `#00FF88` / `#88FF00` / `#FFFFFF` /
  `#0a0a0f` / `#0d0d14` / `#1a1a24`. No cyan, no purple.
- No emojis added to any UI.
- No new heavy audio libs (`tone.js`, `howler`, etc.) — just the
  Web Audio API plus `localStorage`.

### Audio assets — placeholder mode

**No CC0 audio shipped in this commit.** Sourcing seven good
royalty-free clips, vetting their licences, listening through them
for vibe-fit, and budgeting them under 500KB combined is genuinely a
human curation pass — picking the wrong samples would be worse than
shipping nothing.

In the meantime, `src/lib/sounds.ts` synthesises every cue from
`OscillatorNode`s so the trigger sites still fire audibly:

- `awaken` — layered sine sweep through G3 → G4 → D5 → G5 (~1.4s)
- `reveal` — triangle + sine chime ascending through E5 / B5 / E6
- `spotted` — short D#6 / A#6 glint (~0.2s)
- `catchCommon` — C5 / E5 / G5 chord arpeggio
- `catchRare` — D5 / A5 / D6 / A6 crystal ring
- `catchMythic` — sawtooth A2 bed + sine bell stack up to A6 (~1.6s)
- `tick` — single C7 square pulse (~60ms)

**Swap-in instructions for the team:** drop CC0 / royalty-free MP3s
into `/public/sounds/` using these exact filenames:
`awaken.mp3`, `reveal.mp3`, `spotted.mp3`, `catchCommon.mp3`,
`catchRare.mp3`, `catchMythic.mp3`, `tick.mp3`. They will be
preloaded automatically on next app mount; the synthetic fallback
kicks in per-cue only when its file is missing or fails to decode,
so a partial drop-in is fine.

**Constraint:** sources must be freesound.org / opengameart.org /
Pixabay CC0 or equivalent. No AI-generated audio (per brief).
Combined total budget: < 500KB.

---

## Build status

```
npm run build → ✓ Compiled with warnings
```

The only warnings are the existing
`@react-native-async-storage/async-storage` resolution warning
from `@metamask/sdk` and the existing `/api/wallet/keys`
dynamic-server-render notice — both pre-date this phase.

## Out of scope (deferred)

- `/api/orbs/*` route renames + redirects.
- Supabase table/column renames (`orbs`, `gift_orbs`, `trail_orbs`,
  `orbs_found`, `orbs_dropped`, `orbs_cracked`).
- Component file renames (`OrbAnimation.tsx`, `OrbDetailSheet.tsx`,
  `OrbMarker.tsx`).
- Final CC0 audio asset sourcing and drop-in.
