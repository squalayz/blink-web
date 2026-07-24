-- ════════════════════════════════════════════════════════════════════════════
-- BlinkWorld Airdrop — admin "ignore user" flag for airdrop_registrations.
--
-- ⚠️  RUN THIS ON THE BLINKWORLD GAME PROJECT (lutlnwshbbhbwszpzxks),
--     NOT the mishmesh marketing project (kirgpeovueddvqtjxioj).
--     Paste into: https://supabase.com/dashboard/project/lutlnwshbbhbwszpzxks/sql
--
-- Ignored users stay visible in the admin panel (rendered faded) but the
-- payout API refuses to send them tokens and approve is blocked until the
-- admin unignores them. Reject stays possible.
-- ════════════════════════════════════════════════════════════════════════════

alter table airdrop_registrations
  add column if not exists ignored boolean not null default false;
