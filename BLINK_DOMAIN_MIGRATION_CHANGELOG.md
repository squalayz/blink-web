# Domain Migration Changelog: mishmesh.ai → blinkworld.com

Primary domain is now **blinkworld.com**. mishmesh.ai stays live and 301s to blinkworld.com (handled by `next.config.js` redirects; both domains route to the same Vercel app).

## Changed

### Core URLs / SEO
- `src/app/layout.tsx` — `metadataBase` and `openGraph.url` → `https://blinkworld.com`
- `src/app/sitemap.ts` — `BASE` → `https://blinkworld.com`
- `public/robots.txt` — `Sitemap:` → `https://blinkworld.com/sitemap.xml`

### CORS
- `src/middleware.ts` — added `https://blinkworld.com` and `https://www.blinkworld.com` to the allowlist. mishmesh.ai entries kept so the 301 path stays healthy.

### Contact addresses (user-facing copy)
- `src/app/privacy/page.tsx` — `legal@mishmesh.ai` → `legal@blinkworld.com`
- `src/app/terms/page.tsx` — `legal@mishmesh.ai` → `legal@blinkworld.com`
- `src/app/acceptable-use/page.tsx` — `abuse@mishmesh.ai` → `abuse@blinkworld.com`
- `src/app/support/page.tsx` — `support@mishmesh.ai`, `legal@mishmesh.ai`, `mishmesh.ai/privacy`, `mishmesh.ai/terms` → `blinkworld.com` equivalents

### NFT metadata
- `supabase/functions/mint-nft/index.ts` — `external_url` in minted NFT metadata → `https://blinkworld.com` (so OpenSea / wallet UIs link to the new domain)

### Redirects (new)
- `next.config.js` — added `redirects()` block. 301s:
  - `mishmesh.ai/*` → `https://blinkworld.com/*`
  - `www.mishmesh.ai/*` → `https://blinkworld.com/*`
  - `www.blinkworld.com/*` → `https://blinkworld.com/*` (apex canonical)

## Intentionally NOT changed

Per the migration brief, the following retain `mishmesh.ai` for now:
- `.env.example`, `.env.production.local`, `VERCEL-ENV-VARS.txt` — env vars (Telegram webhooks, NextAuth URL). These need to be flipped in Vercel separately when the new domain is wired up there.
- `scripts/setup-telegram.sh` — Telegram bot webhook config (separate concern).
- `src/middleware.ts` CORS allowlist — mishmesh.ai entries kept so requests on the old domain keep working until the 301 takes effect.
- `BLINK_*.md` historical changelogs, git history, commit messages.
- `package.json` name (already `blink`).

## Verification

- `npm run build` ✅ passes.
- All listed user-facing surfaces (legal pages, support, OG/metadata, sitemap, robots, NFT metadata) now point at `blinkworld.com`.
- mishmesh.ai will continue to work for inbound traffic via 301 once both domains are pointed at the Vercel project.
