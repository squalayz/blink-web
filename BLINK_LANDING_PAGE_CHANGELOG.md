# BlinkWorld Landing Page — Changelog (2026-07-06)

## What changed
- `src/app/page.tsx` — root route now renders the marketing landing page with clean SEO metadata (title, description, OG, Twitter card)
- `src/app/landing-page.tsx` — full landing page: hero, beta ticker, 6 feature cards, how-it-works, creature showcase (5 rarities), privacy-first section, FAQ accordion, final CTA, footer
- `src/app/marketing-shell.tsx` — shared shell for marketing pages
- `src/app/privacy/page.tsx` — plain-English privacy policy (Apple has this URL on file)
- `src/app/terms/page.tsx` — terms of service (13+, virtual items no monetary value, safety disclaimer)
- `src/app/support/page.tsx` — support page with email CTA (support@blinkworld.xyz)

## Compliance verification (done post-build)
- Banned-word grep across all new/modified pages (crypto/token/coin/blockchain/NFT/web3/wallet/etc. incl. meta tags): ZERO matches
- Production build: PASSES
- /u/[username] and /b/[code] routes: untouched, still build
- Orbs framed as "collect", no store badges, no fake testimonials
