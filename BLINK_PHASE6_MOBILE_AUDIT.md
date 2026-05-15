# Phase 6 Mobile Audit — fix EVERY horizontal overflow + tighten mobile spacing

User reported: on iPhone Safari, the Bestiary card grid is hanging off the right edge of the screen. The cards "Sprite", "Cyclops", "Omen Prime", "Rebirth" are visibly clipped.

This is almost certainly a `min-content` / `minmax(N, 1fr)` problem where the grid won't shrink below an intrinsic card width. Need a comprehensive mobile sweep.

## Task

### 1. Reproduce + diagnose

Use headless Chromium (Playwright, already installed) at the following viewports:

- iPhone SE 320x568 (worst case)
- iPhone 12/13/14 standard 390x844
- iPhone Plus 430x932
- iPad 768x1024 (tablet)
- Desktop 1440x900 (regression check — should stay perfect)

For each, navigate to https://blinkworld.xyz, scroll the full page, screenshot full-page, and check:

- **Horizontal scrollbar** (NONE allowed at any breakpoint)
- **Element clipping past `100vw`**
- **CTAs cut off / hidden behind sound toggle**
- **Text overlapping graphics**
- **Tap targets < 44x44px (a11y)**

Use this snippet to detect overflow programmatically in the page:

```js
const overflows = [...document.querySelectorAll('*')]
  .filter(el => el.scrollWidth > document.documentElement.clientWidth + 1)
  .map(el => ({ tag: el.tagName, cls: el.className, id: el.id, w: el.scrollWidth }));
```

Log offenders.

### 2. Fix every component that overflows

The likely offenders (already grep'd by me):

- `src/components/BestiarySection.tsx` (grid)
- `src/components/landing/Hero.tsx`
- `src/components/landing/HowItWorks.tsx`
- `src/components/landing/TwoWaysToEarn.tsx`
- `src/components/landing/MintFoundersCTA.tsx`
- `src/components/MythicsSection.tsx`
- `src/components/BlinkTokenStrip.tsx`
- `src/components/YourBestiary.tsx`
- `src/app/page.tsx` (section paddings/wrappers)

For each:

1. Ensure the root section uses `overflow-x: hidden` OR a max-width that fits viewport
2. Replace `repeat(auto-fill, minmax(NNNpx, 1fr))` with `repeat(auto-fill, minmax(min(NNNpx, 100%), 1fr))` — this is the magic incantation that lets cards shrink on tiny viewports
3. Use `clamp(...)` for any fixed `width:` values
4. Inline padding/margin in pixels should use `clamp(12px, 4vw, 24px)` patterns at edges
5. Card images must have `max-width: 100%`, `height: auto`
6. Sections should have horizontal padding via the shell, not via inner fixed widths
7. NO `min-width: NNNpx` on grid items unless wrapped in `min(NNNpx, 100%)`

### 3. Specific known issues

- **Hero CTAs** should not crowd the bottom-right sound toggle on small screens — keep `padding-bottom: 96px` on hero or move CTAs up
- **Bestiary 2-up grid on mobile** — at 320px, 2 columns at minimum 130px each + gap = overflow. Fix with `minmax(min(130px, 100%), 1fr)` and a 1-column fallback below 360px
- **Mythics cards** — same risk
- **`<Two Ways to Earn>` two-column** — must stack on mobile (`grid-template-columns: 1fr` below 768px)
- **`<Token Strip>`** — long contract address can blow horizontal layout. Ensure it wraps or truncates
- **`@media` breakpoints** — confirm we have proper styles below 480px

### 4. Acceptance

After fixes, the Playwright check at 320, 390, 430, 768, 1440 must:
- Find ZERO elements with `scrollWidth > clientWidth + 1`
- No card cut off
- All CTAs visible and tappable
- All text readable

### 5. Commit

One clean commit: `fix(mobile): full landing-page mobile sweep — kill horizontal overflow, tighten layouts`

Then run a second commit if needed: `fix(mobile): bestiary + mythics grids use min(...) for true responsive shrink`

### 6. Screenshots

Save updated screenshots to `docs/phase6-screenshots/mobile-iphone-se-fixed.png` and `mobile-iphone-13-fixed.png`. Embed paths in changelog update.

## Build
`npm run build` must pass.

## DO NOT
- Touch contracts
- Touch /map or /auth routes
- Add new deps (Playwright is already in)
- Modify the desktop layout in ways that hurt 1440px+
