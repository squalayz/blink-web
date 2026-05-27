# BLINK Perf Brief — Fix Slow Landing on blinkworld.xyz

**User complaint:** "blinkworld seems to be loading very very slow"

**Measured live (curl):**
- DNS+Connect+TLS: 1.29s
- TTFB: **2.24s** (way too slow — should be < 400ms)
- Total: 3.18s, page is 71 KB HTML

**Smoking guns identified:**
1. **Every response has `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`** and `x-vercel-cache: MISS`. NOTHING is being CDN-cached. Every visitor cold-renders the landing on Vercel origin. THIS IS THE BIGGEST KILLER.
2. **Landing page is fully dynamic** even though it's mostly marketing content (Hero, Bestiary, HowItWorks, TwoWaysToEarn, MintFoundersCTA, Telegram CTA). No reason it shouldn't be ISR-cached at the edge.
3. **`/blink-orb.png` is 582 KB** (we triplicated it: `.png` 582K + `.jpg` 577K + `-master.jpg` 577K = 1.7 MB redundant). Used as a small loader icon AND tiny button icon. Massively oversized.
4. **3.2 MB total in `public/creatures/`**, 1.2 MB in `floating-all/`, 1.1 MB in `cards/`. If any of these get preloaded above-the-fold, that's adding up.
5. **MetaMask SDK warning** in dev log: `@react-native-async-storage/async-storage` module not found — still spamming. Likely also bundling more than it needs to.

## Tasks (in priority order)

### 1. Cache the landing page at the edge (HIGHEST IMPACT)
- `/` (and other public marketing routes) should be statically rendered or ISR-cached at the edge.
- Add `export const revalidate = 300` (5 min) to `src/app/page.tsx` if it's marketing-only.
- If `page.tsx` reads from cookies/headers (forcing dynamic), find the offending call (`cookies()`, `headers()`, dynamic data fetches) and move that work to a client component instead, so the shell can prerender.
- In `next.config.js` `async headers()`, add:
  - `/` → `Cache-Control: public, s-maxage=60, stale-while-revalidate=600` (CDN caches for 1 min, serves stale up to 10 min while revalidating)
  - `/_next/static/:path*` already cached by Next, leave alone
  - `/blink-orb*`, `/blink-logo*`, `/cards/:path*`, `/floating-all/:path*`, `/floating/:path*`, `/textures/:path*`, `/creatures/:path*` → `Cache-Control: public, max-age=31536000, immutable` (these are content-addressed by filename; 1 year cache)

### 2. Optimize the Eye Orb asset
- Current: `public/blink-orb.png` is 582 KB at 2048×2048 (the minted master). Way too big for a button icon (≤18px) and a 200×200 loader sprite.
- Generate three optimized variants:
  - `public/blink-orb-32.webp` (32×32, for the tiny button icon, target < 4 KB)
  - `public/blink-orb-256.webp` (256×256, for the loader animation, target < 30 KB)
  - Keep `public/blink-orb-master.jpg` (high-res, never loaded by the site, exists as a reference)
- Use `sharp` (already in node_modules via `next/image`) or `ffmpeg` from CLI to generate these. Example:
  ```
  npx sharp-cli --input public/blink-orb-master.jpg --output public/blink-orb-32.webp --resize 32 32 --format webp --quality 85
  npx sharp-cli --input public/blink-orb-master.jpg --output public/blink-orb-256.webp --resize 256 256 --format webp --quality 90
  ```
- Update `<WalkThereButton>` and the WalkClient loader cinematic to reference the new sized assets (button uses `-32.webp`, loader uses `-256.webp`).
- DELETE `public/blink-orb.jpg` (duplicate of master).
- Keep `public/blink-orb.png` ONLY if something else still references it — `grep -rn "blink-orb"` first and update all references.

### 3. Lazy-load below-the-fold landing components
- Identify which landing sections are above-the-fold vs below.
- Above-fold = Hero, HeroMapPreview. These stay in the main bundle.
- Below-fold (BestiarySection, HowItWorks, TwoWaysToEarn, MintFoundersCTA, Telegram CTA, BlinkTokenStrip) should use `next/dynamic` with `ssr: true, loading: () => null` to code-split them out of the initial JS payload, while still SSR-ing them for SEO.

### 4. Fix MetaMask SDK module-not-found spam
- In `next.config.js`, add a webpack fallback:
  ```js
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  }
  ```
- This silences the warning AND reduces bundle resolution time.

### 5. Add `priority` to LCP image
- The dev log warning: `Image with src "/blink-logo.png" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.`
- Find that `<Image>` instance, add `priority` and the right `sizes` prop.

## Acceptance
- `curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\n" https://blinkworld.xyz/` → **TTFB ≤ 0.5s after cache warm**
- Repeat the curl → `x-vercel-cache: HIT` on the 2nd hit
- `/blink-orb*` variants are all < 30 KB except the master
- `npm run build` green, `npx tsc --noEmit` no new errors
- One commit per task ideally, or batched logically:
  1. `perf(landing): edge cache + static rendering for marketing routes`
  2. `perf(assets): optimize Eye Orb to 32px + 256px webp variants`
  3. `perf(landing): lazy-load below-fold sections via next/dynamic`
  4. `fix(build): silence MetaMask RN async-storage warning + add LCP priority`
- Deploy via `vercel --prod` and report the new TTFB measurement at the end.

## Hard rules
- No Tailwind, inline styles only
- Don't touch contracts, joystick code, or the polish that just shipped (button + loader animation)
- Don't break SSR — marketing pages must still SSR for SEO
- Mainnet contracts LIVE
