Build the Creature Swipe Panel feature. Two files to create/modify:

## FILE 1 — CREATE: src/components/CreatureSwipePanel.tsx

A Tinder-style creature discovery panel. Full spec:

### Props
```tsx
interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}
```

### Structure
- Full-screen overlay, dark backdrop rgba(0,0,0,0.85)
- Bottom sheet slides up via CSS transform or motion.div
- Close button top-right corner
- Drag handle bar at top

### State
- `creatures`: from BESTIARY (import from @/lib/bestiary) — the full list of 20
- `activeIndex`: current card
- `filter`: rarity filter ("all" | rarity string)
- `likedIds`: Set<number> — creature ids the user has liked
- `spawns`: Map<number, WildSpawn[]> — spawns per creature_id
- `catchers`: Map<number, Profile[]> — users who caught each creature
- `likeCounts`: Map<number, number>
- `geocodeCache`: Map<string, string> — "lat,lng" -> "City, Country"

### Swipe gesture (use pointer events — see BestiarySection.tsx pattern)
- Track pointer dx, dy on the active card
- dy < -80: swipe UP → like (call handleLike)
- dx > 100 or dx < -100: advance to next card
- dy > 80: close panel
- Tilt the card based on dx (rotate transform)
- On release: snap back or animate off-screen then advance

### handleLike(creatureId: number)
```tsx
// 1. Optimistically update likedIds and likeCounts
// 2. If userId: upsert into creature_likes via supabase
//    supabase.from('creature_likes').upsert({ user_id: userId, creature_id: creatureId }, { onConflict: 'user_id,creature_id' })
// 3. Show like animation: brief green glow on card
```

### Data loading
On mount / when panel opens:
- Load all wild_spawns (select id, creature_id, fuzzy_lat, fuzzy_lng from wild_spawns where expires_at > now())
- Load creature_likes counts: select creature_id, count(*) from creature_likes group by creature_id
- If userId: load user's own likes to pre-populate likedIds
- Load catchers per creature_id lazily (when card becomes active): select profiles.user_id, profiles.handle, profiles.avatar_url, profiles.eth_address from catches join profiles on catches.user_id = profiles.user_id where catches.creature_id = X limit 6

Reverse geocode: for each spawn's fuzzy_lat/fuzzy_lng, fetch:
  https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json
  Extract address.city (or town or village) + address.country_code.toUpperCase()
  Cache in geocodeCache. Throttle to 1 req/sec.

### Card UI (single creature card, full-panel view)
Colors: bg #0a0a0f, surface #0d0d14, border rgba(0,255,136,0.15)
Rarity glow border on active card based on rarity color.

Layout (top to bottom):
1. Creature image — square, max 260px, centered, use <img> with object-fit cover, rounded-xl
2. Name — large (28px), white, uppercase, bold, letter-spacing 0.08em
3. Rarity pill + Type badge (inline)
4. Power name (green, 13px) + powerDesc (muted, 12px)
5. Lore (italic, muted, 11px, max 2 lines)
6. Divider line rgba(255,255,255,0.06)
7. Spawn section:
   - Label "SPOTTED" in small caps, muted
   - If spawns: "{count} active spawn{s} worldwide" + list of up to 3 locations (city, country)
   - If none: "Not currently spawned"
8. Hunters section:
   - Label "CAUGHT BY" small caps muted  
   - Horizontal row of up to 6 avatar circles (40px each), tappable
   - If none: "No hunters yet — be the first"
   - Count: "X hunters"
9. Like count: "{n} watching this creature"

### Controls below the card deck
- Prev arrow button (ChevronLeft)
- Heart/Like button center — green when liked, outline when not. Label "LIKE"
- Next arrow button (ChevronRight)

### Rarity filter bar (top of panel, below handle)
- Horizontal scrollable pills: ALL | COMMON | UNCOMMON | RARE | LEGENDARY | MYTHIC
- Active pill: green bg #00FF88, text #000
- Inactive: surface bg, muted text, green border

### Deck rendering
Show 3 cards:
- Active card: z=10, scale=1.0, full opacity
- Next card: z=9, scale=0.94, translateY=12px, opacity=0.6
- Card after: z=8, scale=0.88, translateY=24px, opacity=0.35
Animate all with CSS transition: transform 0.25s ease, opacity 0.25s ease

### Profile mini-popup (when tapping a hunter avatar)
Small absolute positioned popup showing:
- Avatar (48px circle)
- handle
- eth_address truncated (if present): first 6 chars + "..." + last 4 chars
- "Caught this creature" label
- Close on backdrop tap

---

## FILE 2 — MODIFY: src/app/map/page.tsx

1. Import CreatureSwipePanel at top
2. Add state: `const [showCreatureSwipe, setShowCreatureSwipe] = useState(false);`
3. Find the wallet Link button block (the one with aria-label="Open wallet", top:12, left:12). 
   After it, add a new button (not Link, just button) for Creatures:
```tsx
<button
  onClick={() => setShowCreatureSwipe(true)}
  style={{
    position: "absolute",
    top: 12,
    left: /* wallet button is at left:12, estimate its width ~110px, gap 8px */
      130,
    zIndex: 25,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 20,
    background: "rgba(10,10,15,0.75)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(0,255,136,0.25)",
    cursor: "pointer",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 700,
  }}
>
  <Layers size={13} color="#00FF88" />
  <span style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>Creatures</span>
</button>
```
   Make sure `Layers` is imported from lucide-react (it may already be imported — check and add if not).

4. Before the closing return tag, render:
```tsx
<CreatureSwipePanel
  open={showCreatureSwipe}
  onClose={() => setShowCreatureSwipe(false)}
  userId={user?.id ?? null}
/>
```

---

## Notes
- Inline styles ONLY throughout CreatureSwipePanel.tsx
- No Tailwind classes
- No emoji characters in JSX (use text labels: "LIKE", arrows via lucide icons)
- Import supabase from @/lib/supabase
- Import BESTIARY, RARITY_COLOR, RARITY_LABEL from @/lib/bestiary
- The catches table columns: user_id, creature_id (check actual schema if needed)
- Use AnimatePresence + motion.div for the panel open/close slide animation
- This is a flagship feature — make it look premium and feel fluid
