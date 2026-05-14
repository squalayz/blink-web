-- ════════════════════════════════════════════════════════════════════════════
-- BLINK Phase 3 — User BLINK Holdings cache
-- Stores the latest on-chain snapshot of a wallet's BLINK Genesis + Mythic
-- token holdings. Populated server-side after SIWE login (Alchemy) and on
-- /api/wallet/refresh.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists user_blink_holdings (
  wallet text primary key,
  genesis_ids int[] not null default '{}',
  mythic_ids int[] not null default '{}',
  last_refreshed timestamptz not null default now()
);

create index if not exists idx_user_blink_holdings_refreshed
  on user_blink_holdings (last_refreshed desc);

-- RLS: anyone authenticated can read; only the service role writes.
alter table user_blink_holdings enable row level security;

drop policy if exists "read_own_or_public_holdings" on user_blink_holdings;
create policy "read_own_or_public_holdings"
  on user_blink_holdings
  for select
  using (true);

drop policy if exists "service_role_writes_holdings" on user_blink_holdings;
create policy "service_role_writes_holdings"
  on user_blink_holdings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
