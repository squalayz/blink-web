-- ════════════════════════════════════════════════════════════════════════════
-- BlinkWorld Airdrop — payout HISTORY for incremental (delta) payouts.
--
-- ⚠️  RUN THIS ON THE BLINKWORLD GAME PROJECT (lutlnwshbbhbwszpzxks),
--     NOT the mishmesh marketing project (kirgpeovueddvqtjxioj).
--     Paste into: https://supabase.com/dashboard/project/lutlnwshbbhbwszpzxks/sql
--
-- Players keep earning Blinks after being paid, so Approve now sends only the
-- DELTA of newly earned basis. Each on-chain send gets one row here;
-- airdrop_registrations.payout_basis becomes the CUMULATIVE basis paid so far
-- (kept in sync on every confirmed payout), and payout_tx_hash always holds
-- the LATEST tx.
--
-- The payout API refuses to send until this table exists (and the backfill
-- below has run) — otherwise already-paid basis could be double-counted.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists airdrop_payouts (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null,           -- matches airdrop_registrations.profile_id
  tx_hash text not null unique,       -- one history row per mainnet tx, ever
  amount_wei text not null,           -- exact $BLINK sent (wei, 18 dec)
  basis_delta numeric not null,       -- newly-earned basis covered by this send
  basis_total_after numeric not null, -- cumulative basis paid after this send
  created_at timestamptz default now()
);

create index if not exists airdrop_payouts_profile
  on airdrop_payouts (profile_id, created_at desc);

alter table airdrop_payouts enable row level security;
-- NO policies: deny-all for anon/authenticated. service_role bypasses RLS.

-- ── Backfill: fold every already-sent payout into the history ───────────────
-- For pre-history rows, payout_basis was the basis snapshot at send time,
-- which IS the cumulative total paid (exactly one payout had happened).
insert into airdrop_payouts (profile_id, tx_hash, amount_wei, basis_delta, basis_total_after, created_at)
select
  profile_id,
  payout_tx_hash,
  coalesce(payout_amount_wei, '0'),
  coalesce(payout_basis, 0),
  coalesce(payout_basis, 0),
  coalesce(sent_at, updated_at, now())
from airdrop_registrations
where payout_tx_hash is not null
on conflict (tx_hash) do nothing;
