-- ════════════════════════════════════════════════════════════════════════════
-- BLINK Phase 5b — Catches table
-- One row per catch. Powers daily cap, streak math, leaderboard, history.
-- Service role writes (from voucher API), authenticated users read their own.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists blink_catches (
  id              uuid        primary key default gen_random_uuid(),
  wallet          text        not null,
  rarity          text        not null check (rarity in ('common','uncommon','rare','legendary','mythic')),
  reward_wei      numeric(78,0) not null default 0,
  ref             text        not null,                 -- catch id (also goes into the EIP-712 ref)
  voucher_nonce   text,                                  -- 32-byte hex
  claim_tx        text,                                  -- on-chain claim tx hash, null until claimed
  caught_at       timestamptz not null default now(),
  claimed_at      timestamptz,
  spawn_id        text,                                  -- optional, for spawn DB linkage later
  lat             double precision,
  lng             double precision
);

create index if not exists idx_blink_catches_wallet_caught
  on blink_catches (wallet, caught_at desc);

create index if not exists idx_blink_catches_wallet_claimed
  on blink_catches (wallet, claimed_at);

create unique index if not exists uq_blink_catches_ref on blink_catches (ref);

alter table blink_catches enable row level security;

drop policy if exists "read_own_catches" on blink_catches;
create policy "read_own_catches"
  on blink_catches
  for select
  using (true); -- public leaderboard; switch to auth.uid() check once wallet→uid mapping exists

drop policy if exists "service_writes_catches" on blink_catches;
create policy "service_writes_catches"
  on blink_catches
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
