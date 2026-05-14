# Domain Migration: mishmesh.ai → blinkworld.xyz

Pasquale bought blinkworld.xyz (the BLINK universe domain). This is now the primary domain. mishmesh.ai stays as a 301 redirect to blinkworld.xyz.

## Task

Find and update ALL references from `mishmesh.ai` to `blinkworld.xyz` in user-facing surfaces:

### Must update
- `src/app/layout.tsx` — `metadataBase`, `openGraph.url`, any URL refs
- `src/app/sitemap.ts` — `BASE` constant
- `src/middleware.ts` — CORS allowlist (add `blinkworld.xyz` + `www.blinkworld.xyz` — KEEP mishmesh.ai entries since we're 301'ing from it)
- `src/app/privacy/page.tsx` — `legal@mishmesh.ai` → `legal@blinkworld.xyz`
- `src/app/terms/page.tsx` — same
- `src/app/acceptable-use/page.tsx` — `abuse@mishmesh.ai` → `abuse@blinkworld.xyz`
- `src/app/support/page.tsx` — `support@mishmesh.ai` → `support@blinkworld.xyz`, and any "mishmesh.ai/privacy" → "blinkworld.xyz/privacy"
- `src/app/api/auth/create-wallet/route.ts` — if there's `@wallet.mishmesh.ai`, change to `@wallet.blinkworld.xyz`
- `public/manifest.json` — name, short_name, start_url
- `public/robots.txt` — sitemap line
- `README.md` — any mishmesh URL refs
- Any other JSX text mentioning the old domain in user-visible copy

### Keep unchanged (for now)
- Telegram bot env vars / WebApp URLs (separate config)
- Test/internal fixtures that reference mishmesh.ai purely as test data
- Git history / commit messages
- The `npm` package name (`name: blink` is already fine)

### Add a NEW file: `next.config.js` redirect

If `next.config.js` doesn't already have it: add a redirect block so requests to mishmesh.ai paths get a 301 to blinkworld.xyz (Vercel will route both domains here):

```js
async redirects() {
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'mishmesh.ai' }],
      destination: 'https://blinkworld.xyz/:path*',
      permanent: true,
    },
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.mishmesh.ai' }],
      destination: 'https://blinkworld.xyz/:path*',
      permanent: true,
    },
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.blinkworld.xyz' }],
      destination: 'https://blinkworld.xyz/:path*',
      permanent: true,
    },
  ];
}
```

(Preserve any existing redirects/headers in next.config.js if present.)

## Commit & verify

- One commit: `feat(domain): migrate primary domain to blinkworld.xyz with mishmesh.ai 301 redirect`
- `npm run build` must pass
- Write a short note in `BLINK_DOMAIN_MIGRATION_CHANGELOG.md` summarizing what was changed
