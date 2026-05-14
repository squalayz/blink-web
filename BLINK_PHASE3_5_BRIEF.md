# BLINK Phase 3.5 — ORB→BLINK + Mystical Sounds

Phase 3 shipped great work but missed sections 4 (vocabulary) and 5 (sounds) from the original brief. This phase finishes those two pieces ONLY.

---

## Part A — ORB → BLINK vocabulary

The word "orb" is dead. They are now **BLINKS**.

### Scope: USER-FACING strings ONLY this phase
Do NOT rename in this phase:
- Supabase table/column names (breaking change, separate migration)
- API route paths (`/api/orbs/*`) — leave for a future phase with redirects
- Internal variable names that aren't visible to users

### DO rename in this phase
- All JSX/HTML user-visible text strings ("Drop an orb" → "Drop a BLINK")
- All button labels, modal copy, toast messages, alt text
- Page titles, section headings, metadata
- README user-facing text
- Public marketing/landing page copy

### Voice (use this EXACT vocabulary)
- "You've found a BLINK." (was: "You caught an orb")
- "You've found a RARE BLINK!" (uncommon+)
- "MYTHIC BLINK!" (legendary/mythic)
- "The Bestiary stirs. A BLINK is near."
- "BLINK acquired. Your wallet remembers."
- "Your BLINK count: N"
- "Spawning BLINKS near you..."
- Profile section title: "Your BLINKS"
- Map controls: "BLINKS nearby"
- Drop flow: "Drop a BLINK", "Launch BLINK"
- Catch flow: "Catch this BLINK"
- Sections: "Recent BLINKS", "Your BLINKS", "Active BLINKS"

### Rarity tier names in UI
- Common BLINK
- Uncommon BLINK
- Rare BLINK
- Legendary BLINK
- Mythic BLINK

### Approach
1. Grep entire `src/app/**/*.{tsx,ts}` and `src/components/**/*.{tsx,ts}` for case-variants of `orb`
2. For each user-facing string, swap in BLINK terminology per the voice guide above
3. Skip non-user-facing references (variable names, function names, API URLs)
4. Update page metadata/titles
5. Commit as `feat(phase3.5): ORB→BLINK vocabulary in user-facing copy`

---

## Part B — Mystical Sounds

Add subtle, premium audio cues. No heavy audio libs.

### Sounds needed
1. **awaken** — ethereal pulse + chime (~2s), plays on successful SIWE verify
2. **reveal** — mystical shimmer (~1s), plays when YourBestiary cards animate in
3. **spotted** — short whisper/glint (~0.5s), plays when a BLINK marker first enters map viewport
4. **catchCommon** — soft chime up (~0.6s), on common BLINK catch
5. **catchRare** — crystalline ring (~1s), on rare/uncommon BLINK catch
6. **catchMythic** — cinematic stinger (~2s), on legendary/mythic catch
7. **tick** — subtle hover tick (~0.1s), optional on major CTAs

### Implementation
- New file `src/lib/sounds.ts` exports a singleton SoundManager:
  ```ts
  export type BlinkSound = 'awaken' | 'reveal' | 'spotted' | 'catchCommon' | 'catchRare' | 'catchMythic' | 'tick';
  export const sounds: {
    play(name: BlinkSound, volume?: number): void;
    setEnabled(enabled: boolean): void;
    get enabled(): boolean;
  };
  ```
- Uses Web Audio API for low-latency playback
- Preload sounds on app mount via `requestIdleCallback`
- Persistent setting in `localStorage` key `blink:sound:enabled`, default ON
- Auto-disable when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- New component `src/components/SoundToggle.tsx` — small speaker icon (neon green when on, gray when off), added to nav/header top-right
- Mounted in `Providers` so it's globally available

### Audio assets
- Use FREE royalty-free CC0 assets from freesound.org, opengameart.org, or Pixabay
- Place in `/public/sounds/{awaken,reveal,spotted,catchCommon,catchRare,catchMythic,tick}.mp3`
- Total combined size < 500KB
- If perfect assets aren't findable, generate simple synthetic tones using Web Audio API as placeholders and document what to swap in
- **DO NOT use AI-generated audio**

### Where to trigger
- `awaken` — `/auth/signin` after SIWE signature verified, before redirect to /watch
- `reveal` — when `<YourBestiary />` cards mount/animate in
- `spotted` — `HuntMap.tsx` when a creature marker enters viewport (debounce so each marker fires only once per page-view)
- `catchCommon/Rare/Mythic` — wherever the existing catch success flow lives (likely `CrackExperience.tsx` or `OrbDetailSheet.tsx`)
- `tick` — hover on AWAKEN button, MINT button, primary CTAs (optional, only if not annoying)

### Commit as `feat(phase3.5): mystical BLINK sounds + sound toggle`

---

## Constraints

- Inline styles only (no new Tailwind)
- Palette: `#00FF88`, `#88FF00`, `#FFFFFF`, `#0a0a0f`, `#0d0d14`, `#1a1a24`
- No cyan, no purple, no emojis in UI (emojis fine in Telegram messages elsewhere)
- `npm run build` must pass
- Write `BLINK_PHASE3_5_CHANGELOG.md` summarizing what was done

## Do NOT
- Rename Supabase tables/columns or API routes (out of scope this phase)
- Generate AI audio (use free CC0 assets only)
- Touch unrelated logic outside the two parts above
- Add new heavy deps for sounds — use Web Audio API
