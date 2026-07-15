-- ════════════════════════════════════════════════════════════════════════════
-- BlinkWorld Airdrop Claim v3 — registration tables
--
-- ⚠️  RUN THIS ON THE BLINKWORLD GAME PROJECT (lutlnwshbbhbwszpzxks),
--     NOT the mishmesh marketing project (kirgpeovueddvqtjxioj).
--     Paste into: https://supabase.com/dashboard/project/lutlnwshbbhbwszpzxks/sql
--
-- The claim page reads claim_codes + airdrop_export (existing, read-only)
-- and writes ONLY to these two new tables. RLS is enabled with NO policies:
-- anon/authenticated are denied everything; the server-side service_role
-- client bypasses RLS.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists airdrop_registrations (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null unique,
  trainer_code text,
  eth_address text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  sent_at timestamptz
);

create table if not exists airdrop_lookup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

alter table airdrop_registrations enable row level security;
alter table airdrop_lookup_attempts enable row level security;
-- NO policies: deny-all for anon/authenticated. service_role bypasses RLS.

create index if not exists airdrop_lookup_attempts_ip_created
  on airdrop_lookup_attempts (ip_hash, created_at desc);
