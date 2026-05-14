# BLINK Rebrand — Phase 1 Spec (MishMesh → BLINK)

## Mission
Transform this entire MishMesh codebase into **BLINK** — same product structure, totally new identity. Phase 1 = visual + textual rebrand only. **DO NOT touch the orb/hunt logic yet (that's Phase 2).**

## What BLINK is
- Pokemon GO meets crypto. Players catch mystical creatures called "BLINK creatures" (Sprites, Cyclops, Cats, Oracles, etc.) scattered on a real-world map.
- Future: earn $BLINK tokens for catches. For v1: catches give points/collection.
- Telegram bot @TheEyeBlinkBot announces spawns/catches in real-time 24/7.
- Tagline: **"Don't blink. The Eye is open."**

## Brand identity (LOCKED — DO NOT DEVIATE)

### Colors — replace EVERYTHING
- Primary green: `#00FF88`
- Secondary bright green: `#88FF00`
- White: `#FFFFFF`
- Background black: `#0a0a0f`
- Surface black: `#0d0d14`
- Surface dark: `#1a1a24`

**KILL:**
- All cyan/turquoise (`#06b6d4`, anything teal)
- All purple/violet/indigo (`#6366f1`, `#8b5cf6`)
- Replace with green or white

### Logo
- **OFFICIAL BLINK logo:** `/Users/pasqualeceli/.openclaw/workspace/blink/logos/green/blink_OFFICIAL_logo_green.png`
- Copy it to `public/blink-logo.png` and use it everywhere you'd put a MishMesh logo
- It's a stylized anime eye inside a lightning bolt, in neon green + white on black

### Typography
- Keep existing fonts but if there's a `font-display` for headers, prefer something modern and slightly futuristic (Inter, Space Grotesk are fine)

### Glow effects
- Anywhere there's a blue/purple glow → replace with **green glow** (`#00FF88` at 40% opacity, box-shadow)
- Buttons/CTAs: green gradient background, white text

## Naming changes (rebrand language)

| Old (MishMesh) | New (BLINK) |
|---|---|
| MishMesh | BLINK |
| Mesh | The Eye (or "The Mesh of Eyes") |
| Orb | Creature |
| Orbs | Creatures |
| Hunt | Watch |
| Hunter | Watcher |
| Hunters | Watchers |
| Crack | Witness (the catching mechanic) |
| Crack page | Catch page |
| Leaderboard | The Council |
| Drop | Spawn |
| Map | The Eye Map |
| Mishmate | Eyemate (eyemate, or kill this if odd) |
| .mish files | leave alone (config) |

If you find any direct copy that says "MishMesh", "hunt", "orb", "hunter", "crack", "leaderboard" in user-facing UI text → replace.

## Tone of new copy
- **Cult-mystery for the landing page** (lore, "the Eye watches", "don't blink")
- **Game-fun inside the app** (catch creatures, level up, collect)
- Avoid corporate "We are a decentralized..." copy. Be direct, mystical, fun.

### Sample taglines to use
- "Don't blink. The Eye is open."
- "Catch what others can't see."
- "The Eye sees you. Now see back."
- "Sightings every minute. Worldwide."

## What to do — files to touch

### Required changes
1. **`tailwind.config.js`** — define BLINK palette (green/white/black) and replace any old MishMesh-specific colors
2. **`src/app/globals.css`** — CSS vars, body background, accent colors, glow utilities
3. **`src/app/layout.tsx`** — page title, description, OG meta
4. **`src/app/page.tsx`** (landing) — full rewrite with BLINK landing (eye logo, creatures floating, lore copy, CTA "ENTER THE EYE")
5. **`src/components/AppShell.tsx`** — top nav, sidebar, logo
6. **`src/components/BottomNav.tsx`** — tab labels (Watch / Catch / Council / Wallet / Eye)
7. **`src/components/HeroGlobe.tsx`** — repurpose as "HeroEye" (the central pulsing eye animation), creatures float around it
8. **`src/components/OrbAnimation.tsx`** → rename to **`CreatureAnimation.tsx`** (just animation; we don't change logic)
9. **`src/components/OrbMarker.tsx`** → rename to **`CreatureMarker.tsx`** (map pin)
10. **`src/components/OrbDetailSheet.tsx`** → rename to **`CreatureDetailSheet.tsx`**
11. **`package.json`** — name field: `blink`
12. **`README.md`** — rewrite the project intro
13. **`next.config.js`** — keep working; just verify
14. **`public/`** — drop the new BLINK logo files (logo, favicon, OG image)
15. All page metadata (titles, descriptions, OG tags) — update to BLINK branding

### Pages to rebrand (all under `src/app/`)
- `/` (landing — biggest rewrite)
- `/hunt` → `/watch` (rename folder)
- `/crack` → `/catch` (rename folder)
- `/leaderboard` → `/council` (rename folder)
- `/drop` → `/spawn` (rename folder)
- `/map` → keep at `/map` but rename internally
- `/missions`, `/messages`, `/wallet`, `/market`, `/live` — rebrand copy only
- `/legal-layout.tsx` — update branding
- `/auth/*` — update branding
- `/how-it-works` — full rewrite for BLINK (catching creatures, future $BLINK earnings)

### Don't touch (Phase 2 work)
- Orb spawning logic in `/src/lib/` — keep working as-is
- Crack/witness minigames — keep working as-is (we'll redesign in Phase 3)
- Supabase schema — keep as-is, just rebrand UI references
- API routes — keep functional
- Smart contracts — leave alone

## Landing page rewrite (`src/app/page.tsx`)

This is the centerpiece. Design:

```
[NAV BAR: BLINK logo + "Enter The Eye" CTA + connect wallet]

HERO SECTION (full viewport):
  Black background
  ANIMATED PULSING GREEN EYE in the center (use the green logo)
  4 creature PNG cutouts floating around the eye (Sprite, Cyclops, Cat, Oracle)
    - Slow drift/orbit animation
    - Each glows green/white
    - Each pulses gently
  Big headline: "Don't blink."
  Sub: "The Eye is open. Catch what others can't see."
  Primary CTA: "ENTER THE EYE" → /watch
  Secondary: "Join The Council" → telegram link https://t.me/+7Xj6CKZs9iVmMDhh

LIVE TICKER STRIP (just below hero):
  Scrolling/auto-updating: "@watcher_x caught a Cyclops in NYC • Sprite spawning in Tokyo • 1,243 active watchers worldwide..."
  (For Phase 1 — static demo strings. Phase 4 will wire to real bot data.)

SECTION 2 — "The Bestiary"
  Heading: "20 species. Watching everywhere."
  Grid of creature cards (4 we have, placeholders for the other 16)
  Each card: image, name, rarity, "first sighted: TBD"

SECTION 3 — "How it works"
  3-step visual:
  1. WATCH — see the map. creatures spawn around you.
  2. APPROACH — walk to them (real or virtual). closer = better.
  3. WITNESS — catch them. earn rewards.

SECTION 4 — "The Council"
  Mini-leaderboard preview
  "Watchers who see more, earn more. $BLINK rewards coming."

SECTION 5 — TG bot section
  "The Eye Speaks 24/7"
  Screenshot/mockup of bot announcing catches
  CTA: "Join The Eye on Telegram"

FOOTER:
  Logo + links + small copy
```

Creature image paths (USE THESE — already exist):
- `/Users/pasqualeceli/.openclaw/workspace/blink/characters/green/blink_creature_sprite_green.jpg`
- `/Users/pasqualeceli/.openclaw/workspace/blink/characters/green/blink_creature_cyclops_green.jpg`
- `/Users/pasqualeceli/.openclaw/workspace/blink/characters/green/blink_creature_cat_green.jpg`
- `/Users/pasqualeceli/.openclaw/workspace/blink/characters/green/blink_creature_serpent_green.jpg`

Copy them into `public/creatures/` so the Next.js app can use them.

## Telegram & community
- TG group link: `https://t.me/+7Xj6CKZs9iVmMDhh`
- Bot username: `@TheEyeBlinkBot`
- Any TG references in the codebase → update to these

## Deployment
- Project: existing Vercel project (orgId `team_LgB4TfxqVFZtCnrS5anreFCM`, projectId `prj_cue2gGetZ9aWx9kLg1J3vumBv0Xz`)
- Domain stays at **mishmesh.ai** for now (we'll switch domains later)
- After all changes: `vercel --prod` from this dir to deploy
- BUT DO NOT DEPLOY without my explicit "deploy now" confirmation. Build locally first. Run `npm run build` and verify no errors.

## Constraints / safety
- DO NOT break existing functionality (Supabase, wallet flows, auth)
- DO NOT remove environment variables or change `.env*` files unless I tell you
- DO NOT change `contracts/` (smart contracts)
- DO NOT touch the supabase migrations folder
- DO use Inline styles ONLY (no Tailwind classes for new components, per project rules in MEMORY.md). Use Tailwind in existing components only.
- DO NOT use emojis in UI (Telegram messages exempt) — per MEMORY.md
- DO NOT use mock/demo data — use real data from Supabase where applicable. For Phase 1 marketing copy, lore strings are okay.
- KEEP the build green (`npm run build` must succeed)
- LOG every file you change in a file called `BLINK_REBRAND_CHANGELOG.md` at project root

## Deliverable
1. All files modified/renamed per the spec above
2. `BLINK_REBRAND_CHANGELOG.md` listing every change
3. `npm run build` passes
4. Print summary of what you did at the end

Start now. Take your time. Quality > speed.

---

**Identity reminder:** You are Claude Code running on behalf of Pasquale (Squalay), founder of BLINK. Be confident, direct, opinionated when needed. Do not ask permission for things spec'd above. Ask if something is ambiguous and not covered.
