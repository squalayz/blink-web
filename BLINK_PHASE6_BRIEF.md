# BLINK Phase 6 — "Landing Reborn"

The landing page currently reads as a mystical lore drop. We need it to read as **the most exciting game you've never played**, while keeping the BLINK aesthetic.

## The single sentence that captures Phase 6

> "When a stranger lands on blinkworld.xyz, within 5 seconds they should understand: there is a game where I catch creatures in the real world, and I get paid in crypto for doing it."

Currently they understand: "this is some sort of secretive ETH-flavored religion." Not the vibe.

---

## REFERENCE PROJECTS (study these vibes)

- **Pokémon GO landing** → giant hero shot of creatures on a phone screen overlaid on a real street. "The world is full of Pokémon." 2 seconds = you get it.
- **Axie Infinity peak era** → animated mascots bouncing across hero. Three-word headline: "Battle. Collect. Earn."
- **Sorare** → cards floating in 3D, rotating. "Pick your players." Crystal clear.
- **Hytopia** → anime art, vibrant gradients, character animations, single huge "Play Free" CTA.

**Common pattern:** show the game IN MOTION + one clear action + lore AFTER they're hooked.

---

## DO

### Hero — full viewport, motion-first

**Visual:**
Replace the static hero with an **animated mini-map preview** that loops endlessly.
- Dark cosmic green background (existing palette: `#0a0a0f` base, `#00FF88` accents)
- Faint hex-grid or constellation pattern in BG
- Center: a glowing "YOU ARE HERE" eye marker pulsing
- Around it: 6-8 BLINK creatures (Sprite, Cyclops, Cat, Phoenix, Oracle silhouettes from `BESTIARY`) — drifting in slow orbits, pulsing with rarity-color glows, occasionally "spawning" with a particle puff
- CSS keyframes only — NO three.js, NO heavy libs. Use existing `BESTIARY` images.
- Respect `prefers-reduced-motion` → static composition

**Headline (massive, Space Grotesk Black, 3 lines stacked):**
```
CATCH CREATURES.
EARN $BLINK.
WIN REAL ETH.
```

**Subhead (one sentence):**
> Mystical BLINK creatures are spawning on a real-world map around you, right now. Walk to them. Catch them. Earn $BLINK rewards on every catch. Find drops of real ETH and NFTs hidden across the planet by other players.

**Primary CTA (massive, pulsing green, unmissable):**
- Text: **`🌍 ENTER THE WORLD →`**
- Action: if user has a wallet connected → `/map`. Otherwise → `/auth/signin`.

**Secondary CTA (right under primary, smaller):**
- Text: **`Mint your first BLINK · 0.25 ETH`**
- Action: opens https://mintmyblink.com in new tab
- Tiny "(1-of-1, on Ethereum forever)" microcopy

**Floor of hero — live ticker** (poetic non-numeric for now, as in Phase 4):
- "The Eye opens over Tokyo · Phoenix sighting in Brooklyn · Council awakens worldwide"
- When real data lands, swap to: "127 BLINKS caught today · 1,243 watchers active · Mythic in Tokyo 3 min ago"

### "How It Works" — RIGHT BELOW the hero, no scroll required to peek

Three big animated cards in a row (responsive: 3-up on desktop, stacked on mobile).

Each card has:
- Big number badge (1, 2, 3)
- Bold one-word title in neon green
- Small icon/animation
- One-sentence description

```
1️⃣  WATCH
    Creatures appear on a live map around you.
    Common, Rare, Legendary, Mythic.

2️⃣  HUNT
    Walk to them. The closer you get,
    the brighter they glow.

3️⃣  CATCH
    Tap to catch. Keep the creature.
    Earn $BLINK. Sometimes win ETH.
```

Hover/tap animation: small pulse, gradient glow.

### "Two Ways to Earn" — NEW section after How It Works

Two big card-tiles side-by-side (responsive):

**Card 1: 💎 EARN $BLINK**
- Subhead: "Every catch pays you in our token."
- Tiers shown:
  - Common: 10 BLINK
  - Uncommon: 50 BLINK
  - Rare: 250 BLINK
  - Legendary: 1,500 BLINK
  - Mythic: **10,000 BLINK**
- Bonus list: "Genesis NFT holders earn 2x · Mythic holders earn 5x · Daily streaks stack rewards"
- CTA: "View BLINK contract on Etherscan →" (links to `0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B`)

**Card 2: 💰 FIND REAL ETH**
- Subhead: "Players hide treasures across the map. Walk there and keep what you find."
- Bullet list:
  - "Drops contain ETH, NFTs, or other tokens"
  - "GPS-verified. You actually have to be there."
  - "Anyone can drop. Anyone can find."
- CTA: "Hide a treasure →" (links to /drop — even if /drop isn't built yet, link is fine; build it Phase 6b)

### "Mint Your First BLINK" — NEW CTA card, before the Bestiary section

Bold, mid-page recruiter card. Says:

> 🐲 **Be one of the 20 Founders**
>
> The first 20 BLINK creatures — Sprite, Cyclops, Oracle, Phoenix, and 16 others — are minting now on Ethereum. Each is 1-of-1. Each is yours forever. Each comes with lifetime 2x earnings inside the game.
>
> [MINT NOW · 0.25 ETH] [Browse on OpenSea]

The MINT NOW button links to `https://mintmyblink.com`.

### Voice pass — soften the gatekeeping language

Replace site-wide where used:

| Old | New |
|---|---|
| "Don't blink. The Eye is open." | (Keep on signin only — it's the right vibe for a wallet-gate) |
| "Enter the Eye" | "Enter the World" |
| "Join the Council" | "Join the BLINK community" |
| "The Bestiary remembers your wallet." | "Your BLINKS live with your wallet — forever." |
| Hero copy that's pure lore | Plain English with mystical accents |

The lore is GREAT — it's just at the wrong layer. Lore lives in:
- The bottom of the page (existing "Eye Speaks" section keeps the mystical voice)
- The creature modals
- The Council page
- The signin page (because if you're connecting your wallet you're committed)

The TOP of the landing should be game-direct.

### Re-order the page

New order top-to-bottom:
1. **Hero** (animated map preview, headlines, big CTAs)
2. **How It Works** (3 steps)
3. **Two Ways to Earn** ($BLINK + ETH treasure)
4. **Mint Your First BLINK** CTA card
5. **The Bestiary** (existing — but rename eyebrow from "Bestiary" to "Meet the 20 Founders")
6. **The Mythics** (existing)
7. **How It Works · Detailed** (existing 3-step section can stay further down with more depth, or merge into #2 above)
8. **The Council** (existing — fine as the community pitch)
9. **The Eye Speaks** (existing Telegram bot section — perfect mystical capstone)
10. **Final CTA** (existing — "ENTER THE WORLD" matching hero)
11. **Footer**

### Mobile — the priority

80%+ of game players are on phones. Test rigorously:
- Hero animation must work at 375px width
- Headlines must not overflow (`clamp()` for font-size)
- CTAs must be thumb-reachable (bottom half of viewport)
- No horizontal scroll anywhere
- Sound toggle (bottom-right per Phase 5b fix) must not cover the CTA on small screens — add bottom padding to hero CTA group

### Make it FAST

- LCP < 1.5s (we did this Phase 4 — preserve it)
- Hero map animation must not block paint — lazy-mount images after first paint
- All images via `next/image`
- No new heavy deps. Use existing `framer-motion` sparingly.

---

## DO NOT

- Bring in three.js, GSAP, or any new animation library
- Touch the map page or auth flow — landing only
- Break the wallet-only signin (Phase 3)
- Reorder the existing Mythics fetching logic (it works)
- Remove the existing Council / Eye Speaks / Footer — those are good as-is
- Add Tailwind classes
- Use emojis IN the inline styles. Emojis in copy strings are fine since the brief calls for them.

---

## How to test

1. `npm run build` must pass
2. Open the dev server, view at desktop AND 375px width
3. Take a screenshot of the new hero and include in the changelog
4. Lighthouse score for landing → mobile performance ≥ 80
5. Tab order: hero → primary CTA → secondary CTA → how-it-works (a11y)

## Done means

1. New Hero component with animated mini-map preview
2. New "How It Works" 3-step section
3. New "Two Ways to Earn" section showing $BLINK rewards + ETH treasure
4. New "Mint Your First BLINK" recruiter card mid-page
5. Voice softened where called for
6. Page re-ordered per spec
7. Mobile slaps
8. Build green
9. Commit each major piece separately
10. Write BLINK_PHASE6_CHANGELOG.md
