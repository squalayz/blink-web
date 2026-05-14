# BLINK Phase 2 — Wire the 20 Bestiary Creatures into the App

## Mission
The 20 BLINK Bestiary cards now exist as live NFTs on Ethereum mainnet. Wire them into the main app (`mishmesh.ai` → BLINK app) so they're visible:
1. As a "Bestiary" display section on the landing page
2. Floating throughout the site (already started with 4, expand to all 20)
3. With proper data hooks (no real game-logic wiring yet — that's Phase 3)

**The contract is at `0x85e7CB56fA10f26fEAe20449e71AD1503867799A` on Ethereum mainnet, mint live at `mintmyblink.com`.**

---

## Assets already in place
- `public/cards/` — 20 card images (001_sprite.jpg through 020_firsteye.jpg)
- `public/floating-all/` — same 20 with transparent backgrounds for floating effect
- `public/floating/` — 4 creatures Pasquale already had floating (sprite, cyclops, cat, oracle)
- `public/blink-logo.png` — transparent BLINK eye logo

## Files to create/modify

### 1. NEW: `src/lib/bestiary.ts`
Create a comprehensive creature data file. Use this exact data:

```typescript
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';

export type Creature = {
  id: number;
  name: string;
  rarity: Rarity;
  type: string;
  power: string;
  powerDesc: string;
  image: string;     // /cards/00X_name.jpg or .png
  floating: string;  // /floating-all/00X_name.png (transparent)
  lore: string;
};

export const BESTIARY: Creature[] = [
  { id: 1, name: 'SPRITE', rarity: 'common', type: 'Wisp', power: 'Static', powerDesc: 'Spawns next creature 10% closer.', image: '/cards/001_sprite.jpg', floating: '/floating-all/001_sprite.png', lore: 'The first one came at dusk.' },
  { id: 2, name: 'NIBBLER', rarity: 'common', type: 'Beast', power: 'Bite', powerDesc: 'Reveals nearby spawns for 5 min.', image: '/cards/002_nibbler.png', floating: '/floating-all/002_nibbler.png', lore: 'Small. Sharp. Always hungry.' },
  { id: 3, name: 'PIXIE', rarity: 'common', type: 'Fae', power: 'Glint', powerDesc: 'Next 3 catches give +25%.', image: '/cards/003_pixie.jpg', floating: '/floating-all/003_pixie.png', lore: 'A tiny luminous figure with crackling wings.' },
  { id: 4, name: 'EMBERLING', rarity: 'common', type: 'Flame', power: 'Heat', powerDesc: '+50% during peak hours.', image: '/cards/004_emberling.png', floating: '/floating-all/004_emberling.png', lore: 'A spark wearing the shape of a creature.' },
  { id: 5, name: 'DUSTFOX', rarity: 'common', type: 'Beast', power: 'Trace', powerDesc: 'Summons free spawns nearby.', image: '/cards/005_dustfox.jpg', floating: '/floating-all/005_dustfox.png', lore: 'Appears where the chain has gone quiet.' },
  { id: 6, name: 'PEBBLEKIN', rarity: 'common', type: 'Stone', power: 'Stack', powerDesc: 'Owning 5+ grants +5% boost.', image: '/cards/006_pebblekin.png', floating: '/floating-all/006_pebblekin.png', lore: 'They gather in piles. The more you have, the more they whisper.' },
  { id: 7, name: 'SPECKLE', rarity: 'common', type: 'Echo', power: 'Trace', powerDesc: 'Counts double toward streaks.', image: '/cards/007_speckle.jpg', floating: '/floating-all/007_speckle.png', lore: 'The smallest sighting. Often unwitnessed.' },
  { id: 8, name: 'HOPSPIRIT', rarity: 'common', type: 'Fae', power: 'Twitch', powerDesc: 'Speed catch gives bonus.', image: '/cards/008_hopspirit.jpg', floating: '/floating-all/008_hopspirit.png', lore: 'A rabbit-shaped echo.' },
  { id: 9, name: 'SHIMMER', rarity: 'common', type: 'Mirror', power: 'Reflect', powerDesc: 'Shows local watcher activity.', image: '/cards/009_shimmer.png', floating: '/floating-all/009_shimmer.png', lore: 'Mirror-skinned. Reflects what you cannot see.' },
  { id: 10, name: 'SILKMOTH', rarity: 'common', type: 'Wing', power: 'Night', powerDesc: '2x at night (22-04 UTC).', image: '/cards/010_silkmoth.jpg', floating: '/floating-all/010_silkmoth.png', lore: 'Drawn to phone screens after dark.' },
  { id: 11, name: 'CAT', rarity: 'uncommon', type: 'Sentinel', power: 'Memory', powerDesc: 'Unlocks BLINK lore on catch.', image: '/cards/011_cat.jpg', floating: '/floating-all/011_cat.png', lore: 'Older than the chain itself.' },
  { id: 12, name: 'GLITCH HARE', rarity: 'uncommon', type: 'Bug', power: 'Fork', powerDesc: '50/50 gamble: bonus or penalty.', image: '/cards/012_glitchhare.png', floating: '/floating-all/012_glitchhare.png', lore: 'A hare that exists on two blocks at once.' },
  { id: 13, name: 'WHISKERWISP', rarity: 'uncommon', type: 'Spirit', power: 'Sense', powerDesc: 'Reveals rare spawns nearby.', image: '/cards/013_whiskerwisp.jpg', floating: '/floating-all/013_whiskerwisp.png', lore: 'Six-tailed fox spirit.' },
  { id: 14, name: 'HUSHLING', rarity: 'uncommon', type: 'Shadow', power: 'Silent', powerDesc: 'Inactivity grants bonus.', image: '/cards/014_hushling.jpg', floating: '/floating-all/014_hushling.png', lore: 'Voiceless. When near, your phone goes still.' },
  { id: 15, name: 'EYEFLY', rarity: 'uncommon', type: 'Swarm', power: 'Pair', powerDesc: '30% chance second spawns.', image: '/cards/015_eyefly.png', floating: '/floating-all/015_eyefly.png', lore: 'A single eye with insect wings. Travels in pairs.' },
  { id: 16, name: 'CYCLOPS', rarity: 'rare', type: 'Sentinel', power: 'Focus', powerDesc: 'Permanent badge + bonus.', image: '/cards/016_cyclops.jpg', floating: '/floating-all/016_cyclops.png', lore: 'Sees only one thing. But sees it completely.' },
  { id: 17, name: 'AETHERMANE', rarity: 'rare', type: 'Mythic', power: 'Roar', powerDesc: 'Council access for 7 days.', image: '/cards/017_aethermane.jpg', floating: '/floating-all/017_aethermane.png', lore: 'A lion-spirit with a mane of green lightning.' },
  { id: 18, name: 'ORACLE', rarity: 'legendary', type: 'Witness', power: 'Omen', powerDesc: 'Permanent badge + Council.', image: '/cards/018_oracle.jpg', floating: '/floating-all/018_oracle.png', lore: 'When you see it, the trade has already happened.' },
  { id: 19, name: 'THE PHOENIX', rarity: 'legendary', type: 'Mythic', power: 'Rebirth', powerDesc: 'Phoenix Bearer status.', image: '/cards/019_phoenix.png', floating: '/floating-all/019_phoenix.png', lore: 'Born from green candles.' },
  { id: 20, name: 'THE FIRST EYE', rarity: 'mythic', type: 'Ancestral', power: 'Witness', powerDesc: 'Council Founder · Eternal status.', image: '/cards/020_firsteye.jpg', floating: '/floating-all/020_firsteye.png', lore: 'The original. All others are echoes of it.' },
];

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa3b2',
  uncommon: '#00FF88',
  rare: '#88FF00',
  legendary: '#ffd166',
  mythic: '#ff8ae0',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

// Mint contract details
export const BLINK_GENESIS_CONTRACT = '0x85e7CB56fA10f26fEAe20449e71AD1503867799A';
export const BLINK_MINT_URL = 'https://mintmyblink.com';
export const BLINK_OPENSEA_URL = `https://opensea.io/assets/ethereum/${BLINK_GENESIS_CONTRACT}`;
```

### 2. MODIFY: `src/components/FloatingCreatures.tsx`
Currently shows 4 hard-coded creatures from `/floating/`. Expand to display **8-12** creatures (not all 20 — would be visual chaos), randomly picked from the bestiary, using `/floating-all/` transparent variants. Animations stay similar (slow drift, varied positions). Use the `BESTIARY` import. Keep them low-opacity (0.3-0.55) and behind content (zIndex 0).

**Positions** to fill (already established):
- Top-right, top-left, mid-right, mid-left, bottom-right, bottom-left, top-center, bottom-center, mid-top, mid-bottom
- Different sizes (130-180px)
- Different animation timings (18-30s drift cycles, varied delays)

Pick a sensible mix: 2-3 commons + 2-3 uncommons + 1-2 rares + 1 legendary visible at any time. Randomize the selection from `BESTIARY` so the page feels different each load.

### 3. NEW: `src/components/BestiarySection.tsx`
A landing-page section that shows ALL 20 BLINK Bestiary cards in a beautiful grid. Inline styles only (project rule).

Layout:
- Section heading: "THE BESTIARY" (green, uppercase, letter-spaced like other section headings)
- Sub-heading: "20 unique creatures. Each one 1-of-1. Minted forever on Ethereum."
- Grid: 5 columns desktop, 3 tablet, 2 mobile, of card images
- Each card:
  - Show the FULL card image (it already has all the visual info on it — name, rarity badge, power, etc.)
  - Aspect ratio 2:3 (vertical)
  - Hover: lift up 6px, glow green
  - Click: open a modal showing the larger card + lore + power details + "View on OpenSea" link
- Below grid: CTA buttons:
  - "Mint on mintmyblink.com" (links to the mint site)
  - "View Collection on OpenSea" (links to `BLINK_OPENSEA_URL`)
  - "Read the Lore" — for future, just a placeholder

Show creatures in tokenID order (1-20).

### 4. MODIFY: `src/app/page.tsx`
- Add the `BestiarySection` component to the landing page
- Place it AFTER the "How it Works" or wherever feels natural (between the hero + the existing sections)
- Don't break existing layout

### 5. NEW: `src/components/CreatureModal.tsx`
A simple modal that opens when a card is clicked. Shows:
- Larger card image
- Name + rarity badge
- Lore text
- Power name + power description
- Type
- "Mint your own at mintmyblink.com" + "View this creature on OpenSea" buttons (link to `mintmyblink.com` and `BLINK_OPENSEA_URL/${tokenId}`)

Standard modal pattern (overlay + close on backdrop click or X button).

---

## Design constraints (LOCKED)
- **Inline styles only** — no Tailwind classes for new components
- **Green/white/black only** — palette: `#00FF88`, `#88FF00`, `#FFFFFF`, `#0a0a0f`, `#0d0d14`, `#1a1a24`
- **NO cyan, NO purple** — anywhere
- **No emojis in UI**
- **Use `next/image`** for all card images
- **Mobile responsive** — test breakpoints at 480px, 768px, 1024px
- **Inter or Space Grotesk** for fonts (already established in project)

## What NOT to do
- DO NOT wire NFT ownership detection yet (Phase 3 work)
- DO NOT replace the existing orb/spawn logic
- DO NOT remove the existing `/floating/` 4-creature setup until the new one's working
- DO NOT touch backend / supabase / API routes
- DO NOT remove any existing pages or features
- DO NOT break `npm run build`

## Deliverable
1. All 5 files created/modified per spec
2. `BLINK_PHASE2_CHANGELOG.md` summarizing what was done
3. `npm run build` passes
4. Summary printed at the end

Start now. Quality > speed. Work systematically.

— Pasquale (BLINK founder) via Ares
