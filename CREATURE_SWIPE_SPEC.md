# 🃏 Creature Swipe Feature — BLINK Map

## Overview
A Tinder-style swipe panel accessible from the map page.
Users can swipe through all BLINK creatures, "like" them by swiping up,
see where each creature is spawned in the world, and see who else has caught
or is hunting the same creature — with their profile + optional ETH address.

---

## Entry Point
Add a new floating button on the map page (`/app/map/page.tsx`), positioned
**next to** the existing BLINK wallet button (top-left, currently at `top:12, left:12`).

Button design:
- Same glass-pill style as the wallet button
- Icon: a card/swipe icon (use `Layers` from lucide-react or a custom cards icon)
- Label: "Creatures"
- Opens the `CreatureSwipePanel` component as a bottom sheet overlay (full-screen on mobile)

---

## CreatureSwipePanel Component
**File:** `src/components/CreatureSwipePanel.tsx`
**Rules:** Inline styles ONLY. No Tailwind. No emojis in UI. Colors from BLINK palette.

### Layout
- Full viewport overlay with a dark semi-transparent backdrop
- Bottom sheet that slides up (motion.div, framer-motion)
- Close button top-right (X icon)
- Top handle bar (drag indicator)

### Card Stack / Swipe UX
- Show creatures from `BESTIARY` (imported from `@/lib/bestiary`)
- Cards stacked like a physical deck — top card is active, 2 peeking cards behind
- **Swipe LEFT**: skip / next creature
- **Swipe RIGHT**: skip / next creature  
- **Swipe UP**: "like" this creature → triggers a like animation (heart burst, green flash), records like in Supabase, then advances to next
- **Swipe DOWN**: close the panel
- Also show prev/next arrow buttons below the card for non-touch devices
- Show a "💚 Like" button below the card that triggers same as swipe-up

### Card Design (single creature card)
Each card is a beautiful full-card view:
- Background: `#0d0d14` with rarity-colored border glow
- Creature image (from `creature.image` path, use Next `Image` with `fill` layout)
  - image fills ~60% of card height
- Creature name (large, white, uppercase)
- Rarity pill (use `RARITY_COLOR` and `RARITY_LABEL` from bestiary)
- Type badge
- Power name + description
- Lore text (italic, muted)

Below the image, show:

**📍 Spawn Location** section:
- Pull live spawns from Supabase `wild_spawns` table filtered by `creature_id` (use BESTIARY item's `id` field)
- If spawns exist: show "Spotted near [City, Country]" — reverse-geocode the `fuzzy_lat`/`fuzzy_lng` using browser's Intl API or a simple label
  - Use `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json` for reverse geocode (free, no key)
  - Show city + country. Cache per spawn id in component state.
  - Show "X active spawns worldwide"
- If no spawns: show "Not currently spawned — check back soon"

**👥 Hunters** section (below spawn info):
- Query Supabase for users who have caught this creature: `SELECT DISTINCT profiles.* FROM catches JOIN profiles ON catches.user_id = profiles.user_id WHERE catches.creature_id = {id} LIMIT 6`
- Also query for users currently hunting (have this creature_id in active `wild_spawns` nearby — just show recent catchers for simplicity in v1)
- Show avatars in a horizontal row (use `UserAvatar` component if available, else circular image fallback)
- On tap of an avatar, show a mini profile card:
  - Username / handle
  - Ethereum address (show `0xABCD...1234` abbreviated if they have `eth_address` and `show_eth_address` is not false — default show)
  - "Caught this creature" label
- Show count: "X hunters have caught this"

### Like System — Supabase
**New table** `creature_likes`:
```sql
CREATE TABLE IF NOT EXISTS creature_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  creature_id integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, creature_id)
);

ALTER TABLE creature_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" ON creature_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON creature_likes FOR ALL USING (auth.uid() = user_id);
```

On swipe-up / like button press:
- Insert into `creature_likes` (upsert, ignore duplicate)
- Show a green flash + scale animation on the card
- Update the "X people like this" count optimistically

Also show: "X people like this creature" label on each card (queried per creature_id)

### Progress Indicator
- At top of panel: small pill showing "12 / 20" (current index / total)
- Rarity filter tabs: All | Common | Uncommon | Rare | Legendary | Mythic
  - Filter the deck to only show creatures of that rarity

---

## New API Route (optional, for geocoding cache)
- Can be done client-side via nominatim directly — no new API route needed

---

## Supabase SQL to run (in supabase dashboard or via API)
```sql
-- creature_likes table
CREATE TABLE IF NOT EXISTS creature_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  creature_id integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, creature_id)
);
ALTER TABLE creature_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all likes" ON creature_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON creature_likes FOR ALL USING (auth.uid() = user_id);
```

---

## Files to modify
1. `src/components/CreatureSwipePanel.tsx` — NEW component (main build)
2. `src/app/map/page.tsx` — add Creatures button near wallet button, import + render `CreatureSwipePanel`

---

## Constraints
- Inline styles ONLY — zero Tailwind classes
- No emojis in UI components (text labels only)
- No mock/demo data — all real from Supabase + BESTIARY registry
- Colors: bg `#0a0a0f`, surface `#0d0d14`, s2 `#1a1a24`, indigo `#6366f1`, cyan `#06b6d4`, green `#00FF88`
- Use framer-motion for swipe gestures (`useMotionValue`, `useTransform`, `drag`)
- Must be mobile-first, work on 390px viewport
- All Claude Code — no direct file edits

---

## Acceptance
- [ ] Creatures button visible on map next to wallet pill
- [ ] Tapping it opens the bottom sheet with creature cards
- [ ] Swipe up = like (persisted to Supabase)
- [ ] Each card shows spawn location (reverse geocoded) or "Not spawned"
- [ ] Each card shows hunter avatars with profile + ETH address on tap
- [ ] Rarity filter tabs work
- [ ] Looks stunning — BLINK aesthetic, dark, glowy, premium
