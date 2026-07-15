# BlinkWorld Token Claim v3 — `/claim`

Code-only airdrop registration. **Zero email, zero OTP, zero wallet-connect.**
Live at `https://blinkworld.xyz/claim` (unlinked, `noindex`, excluded from
sitemap and robots-allowed paths).

## The credential

The player's **private Blink Code** (`XXXX-XXXX`, alphabet without `0/O/1/I/L`)
is the only credential. The public `BL-XXXX` trainer/buddy code is explicitly
rejected with a helpful message (the private alphabet excludes `L`, so no real
code can start with `BL`). `profiles.wallet_code` is ignored entirely.

## Data flow

Everything player-related lives on the **BlinkWorld game project**
(`lutlnwshbbhbwszpzxks`) — *not* the marketing site's Supabase project. A
dedicated server-only client (`src/lib/blinkworld-admin.ts`) uses
`BLINKWORLD_SUPABASE_URL` + `BLINKWORLD_SUPABASE_SERVICE_ROLE_KEY`.

- **Read-only**: `claim_codes` (code → profile_id), `airdrop_export` (view —
  balances, flags). Players only ever see `blink_lifetime`; `airdrop_basis`,
  `flagged`, `flag_reasons` are admin/CSV-only. The `email` column is never
  read.
- **Writes**: only the two new tables from
  `supabase/migrations/20260715_airdrop_v3_blinkworld.sql`:
  `airdrop_registrations` (one row per profile) and `airdrop_lookup_attempts`
  (hashed-IP rate-limit log). Both are RLS-enabled with **no policies**
  (deny-all; service_role bypasses).

## Flow (one screen, three stages)

1. **Code entry** — auto-uppercase, auto-dash after 4 chars.
2. **Balance reveal** — count-up hero of lifetime Blink Balls.
3. **Address** — paste ETH address (validated + checksummed with viem
   `getAddress`), press-and-hold ring to lock → status `pending`.

Returning players see their status (`pending / approved / rejected / sent`)
and can edit the address **only while pending**.

## API

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /api/claim/lookup` | none (rate-limited) | code → balance + 20-min httpOnly HMAC session cookie bound to profile_id |
| `POST /api/claim/submit` | session cookie | validate + upsert `airdrop_registrations` |
| `GET /api/claim/status` | session cookie | registration + balance for returning visitors |
| `POST/DELETE /api/claim/admin/login` | password | `CLAIM_ADMIN_PASSWORD` (fallback `ADMIN_PASSWORD`) → 12-h httpOnly cookie |
| `GET /api/claim/admin/registrations` | admin cookie | list joined with fresh `airdrop_export` |
| `POST /api/claim/admin/update` | admin cookie | `pending / approved / rejected / sent` transitions |
| `GET /api/claim/admin/export` | admin cookie | CSV with fresh `airdrop_basis`, flags, timestamps |

Rate limit: max **5 failed** and **30 total** lookups per hour per IP,
tracked as `sha256(ip + CLAIM_SESSION_SECRET)` — raw IPs and full codes are
never stored or logged (first 2 chars max).

Legacy Orb-Bank routes (`/api/claim/execute|voucher|confirm|me`) are untouched
and remain blocked by the marketing-only middleware gate; only the v3 routes
above are allowlisted.

## Env (server-only — see `.env.example`)

```
BLINKWORLD_SUPABASE_URL=https://lutlnwshbbhbwszpzxks.supabase.co
BLINKWORLD_SUPABASE_SERVICE_ROLE_KEY=   # game project service role — never in client bundles
CLAIM_SESSION_SECRET=                   # random 32+ chars, signs session cookies
CLAIM_ADMIN_PASSWORD=                   # /claim/admin gate
```

Add the same four to Vercel env vars for production.

## Distribution model (no contract yet)

This page **only registers addresses**. No tokens move on registration.

1. Players register → `pending`.
2. Admin reviews at `/claim/admin` (flagged accounts get a REVIEW badge),
   approves or rejects.
3. Admin exports the CSV — amounts come from a **fresh** `airdrop_export.airdrop_basis`
   read at export time.
4. A future batch send / claim contract distributes tokens; admin then marks
   rows `sent`.
