# BLINK Map Declutter Brief — `/watch` & `/map`

**User complaint (with screenshot):** Map screen is cluttered, lots of things overlapping. Need it precise and not too much going on.

## What's wrong (from the screenshot)

The map view (`/watch` route) currently shows ALL of this on screen at once:
1. **Top bar:** "BLINK" logo (left) + "The Eye is quiet" status text (center) + profile icon (right)
2. **Filter row** below top bar: "Filter" pill with dropdown chevron
3. **Search bar:** redundant "The Eye is quiet" placeholder (same text as status — duplicated!)
4. **Red location-permission banner**: "tap on the browser's AA icon to get to website settings" — long and intrusive
5. **Right-side stacked widgets:** rotation/compass + zoom in + zoom out + camera icon (4 stacked controls)
6. **Bottom-left legend (PresenceLegend.tsx):** translucent panel showing Hunter (300m blur), Friend (~100m blur), Wild Creature Zone, + "Privacy info" link
7. **Bottom nav:** Watch / Live / SPAWN (big green button) / Wallet / Messages
8. **Map markers themselves** likely overlapping each other on a dense Manhattan map

**Critical redundancies:**
- "The Eye is quiet" appears TWICE (status bar AND search placeholder)
- Privacy info link in legend AND likely accessible from settings
- Map zoom controls + compass + camera = 4 separate buttons stacked in a column eating screen real estate on mobile

## Target aesthetic

**Precise. Minimal. Game-like.** Think Pokémon GO or a clean trading dashboard — the map IS the content; everything else is a thin glass overlay that gets out of the way.

## Tasks

### 1. Kill the duplication
- "The Eye is quiet" should appear in ONE place only. Decide: keep it as a subtle status pill at the top center, OR move it into the search bar. **My recommendation: keep it as a status pill in the top bar, remove it from the search placeholder. Use a generic placeholder like "Search creatures, places…"**
- If the search bar isn't actually doing anything meaningful right now, **hide it entirely until the user taps a search icon** (gated UI). Saves a whole row of vertical space.

### 2. Collapse the right-side widget stack
- 4 buttons stacked vertically is too much. Consolidate to:
  - **Single floating "Map Tools" button** (gear/sliders icon) in the top-right corner of the map area. Tap → small popover with: Center on me, Compass reset, Zoom +/-, Camera/snapshot. No more permanent stack.
- Alternatively, keep ONLY: Center-on-me button (most-used) + Camera. Drop the compass and explicit zoom (pinch-zoom is universal on mobile).
- On desktop, the stacked controls can stay (no thumb-reach constraint), but mobile should be the collapsed version.

### 3. Compress the legend into a tiny toggleable chip
- Current `PresenceLegend` is a full panel at bottom-left with 3 rows + a Privacy link. Too prominent.
- Replace with a **tiny "?" chip in the bottom-left corner**. Tap → bottom sheet slides up with the legend + privacy info.
- Or: a single horizontal legend strip at the top of the map (just colored dots + 1-word labels: ● Hunter ● Friend ● Wild), no panel chrome, max 32px tall.

### 4. Kill the red location-permission banner
- It's intrusive and long. Replace with:
  - A subtle inline pill at the bottom: "Location off — tap to enable" with a small unlock icon. Tap → handles the geolocation request natively.
  - Or: a one-time bottom-sheet on first load, dismissible, and never shown again once granted.

### 5. Marker collision spacing on the map
- If multiple Hunters / Friends / Creatures are within ~40px of each other on screen, cluster them into a single bubble with a count badge ("3"). Common Mapbox pattern via `supercluster` or Mapbox's built-in `cluster` source option.
- Single markers stay as-is. Tap a cluster → zoom in OR open a small list popup.

### 6. Top bar slimming
- Reduce top bar height. Logo on the left, profile on the right, status pill in the middle is fine — but make all three smaller (height ~44px max).
- Whatever "Filter" pill exists — move it into the search row OR into the Map Tools popover if it's filtering markers.

## Acceptance

- Open `/watch` on iPhone 13 viewport (390×844) → screen feels like a map first, UI second
- No two UI elements overlap or visually compete
- "The Eye is quiet" appears in exactly one place
- Right-side widget stack is gone OR collapsed into a single Map Tools button on mobile
- Legend is either a tiny chip (tap to open) or a thin top strip
- Red location banner is replaced with subtle inline UX
- Marker clustering active (if Mapbox map supports it — check `HuntMap.tsx`)
- `npm run build` green, `npx tsc --noEmit` no new errors on touched files
- Commit cleanly (1–3 commits ok, scoped logically)
- Deploy via `vercel --prod` and report back

## Hard rules
- No Tailwind, inline styles only
- No emojis in UI
- No mock data
- Don't touch joystick code, gift/walk flow, the polish that just shipped, or contracts
- Mainnet contracts LIVE
- Mobile-first: design for 390×844, then make it work on desktop
- Black + neon green + white ONLY
