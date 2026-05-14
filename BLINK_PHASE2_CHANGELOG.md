# BLINK Phase 2 — Bestiary Wiring Changelog

Wires the 20 on-chain BLINK Bestiary creatures into the landing experience. No game-logic / NFT ownership detection (that's Phase 3).

Contract: `0x85e7CB56fA10f26fEAe20449e71AD1503867799A` (Ethereum mainnet)
Mint: https://mintmyblink.com

---

## Files added

### `src/lib/bestiary.ts`
Source of truth for the 20 creatures. Exports:
- `BESTIARY` — full list (id 1–20) with name, rarity, type, power, powerDesc, image path, floating path, lore.
- `Creature` / `Rarity` types.
- `RARITY_COLOR` and `RARITY_LABEL` maps. Common = `#9aa3b2`, Uncommon = `#00FF88`, Rare = `#88FF00`, Legendary = `#ffd166`, Mythic = `#ff8ae0`.
- `BLINK_GENESIS_CONTRACT`, `BLINK_MINT_URL`, `BLINK_OPENSEA_URL` constants.

### `src/components/CreatureModal.tsx`
Modal opened when a card is clicked. Two-column on desktop (image left, info right), single column on ≤768px. Shows:
- Larger card image with rarity-tinted glow.
- Token #, rarity badge, type.
- Name (Space Grotesk, 900).
- Italic lore quote.
- Power name + description in a green-bordered panel.
- "Mint on mintmyblink.com" CTA → `BLINK_MINT_URL`.
- "View on OpenSea" CTA → `${BLINK_OPENSEA_URL}/${tokenId}`.
- Closes on backdrop click, X button, or Esc. Locks body scroll while open.
- Inline styles + scoped `styled-jsx` keyframes for fade/slide-in.

### `src/components/BestiarySection.tsx`
Landing-page section showing all 20 cards in token-ID order.
- Heading "THE BESTIARY" with green eyebrow + subhead "20 unique creatures. Each one 1-of-1. Minted forever on Ethereum."
- 5-column grid desktop, 3-column ≤1024px, 2-column ≤480px.
- 2:3 vertical cards with rarity badge (top-left) and token # (top-right) overlays.
- Hover: lifts 6px, rarity-tinted glow, border brightens.
- Click → opens `CreatureModal`.
- Below grid: "Mint on mintmyblink.com" (filled), "View Collection on OpenSea" (outlined), "Read the Lore · Soon" (disabled placeholder).

## Files modified

### `src/components/FloatingCreatures.tsx`
Expanded from 4 hard-coded creatures (`/floating/`) to 10 floating slots drawing from the new `BESTIARY`.
- `useMemo` selection on mount: 4 commons + 3 uncommons + 2 rares + 1 legendary, shuffled — so the page looks different each load.
- 10 slot positions across top/mid/bottom × left/right/center, widths 130–170px, opacities 0.32–0.55, varied animation timings (18–30s) and delays.
- Uses `/floating-all/` transparent variants from `bestiary.ts`.
- Same 4 `blinkDrift*` keyframes preserved.
- Kept `zIndex: 0`, `pointer-events: none`, `aria-hidden`.

### `src/app/page.tsx`
- Imported `BestiarySection`.
- Replaced the legacy stub Bestiary section (4 hard-coded `/creatures/*.jpg` images + 16 "Unknown" placeholders, referencing assets that aren't in the repo) with `<BestiarySection />` in the same slot — between the live ticker and "How it works".
- Removed unused `BESTIARY` and `PLACEHOLDER_SPECIES` local constants.
- No other layout, copy, or nav changes.

## What is NOT in this phase

- No NFT ownership detection (no wallet check, no on-chain reads).
- No changes to orb / spawn / catch / wallet / API / Supabase code.
- No changes to `/watch`, `/council`, or any other pages.
- Old `/floating/` 4-creature files left in place (unused by the component but not deleted).

## Design constraints respected

- Inline styles only for the new components (no Tailwind).
- Palette: `#00FF88`, `#88FF00`, `#FFFFFF`, `#0a0a0f`, `#0d0d14`, `#1a1a24`, plus rarity tints (`#ffd166`, `#ff8ae0`, `#9aa3b2`) used as accents only.
- No cyan, no purple, no emojis in UI.
- `next/image` for all card images.
- Mobile breakpoints handled at 480 / 768 / 1024.
- Inter + Space Grotesk fonts.

## Verification

`npm run build` — passes.
