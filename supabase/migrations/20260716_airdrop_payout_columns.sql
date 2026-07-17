-- ════════════════════════════════════════════════════════════════════════════
-- BlinkWorld Airdrop — on-chain payout columns for airdrop_registrations.
--
-- ⚠️  RUN THIS ON THE BLINKWORLD GAME PROJECT (lutlnwshbbhbwszpzxks),
--     NOT the mishmesh marketing project (kirgpeovueddvqtjxioj).
--     Paste into: https://supabase.com/dashboard/project/lutlnwshbbhbwszpzxks/sql
--
-- Supports the auto-send flow: admin clicks Approve → server sends BLINK via
-- BlinkPayoutVault → row stores the tx hash and flips to 'sent'.
-- ════════════════════════════════════════════════════════════════════════════

alter table airdrop_registrations
  add column if not exists payout_tx_hash text,          -- mainnet tx hash of the payout
  add column if not exists payout_amount_wei text,       -- exact amount sent (wei, 18 dec)
  add column if not exists payout_basis numeric,         -- airdrop_basis snapshot used
  add column if not exists payout_error text,            -- last failure (shown in admin, retryable)
  add column if not exists payout_locked_at timestamptz; -- in-flight lock (double-click guard)

-- one payout per tx hash — a hash can never be attached to two rows
create unique index if not exists airdrop_registrations_payout_tx
  on airdrop_registrations (payout_tx_hash) where payout_tx_hash is not null;
