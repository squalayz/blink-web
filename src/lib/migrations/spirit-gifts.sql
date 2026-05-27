-- BLINK Spirit Gift Links — viral growth engine.
-- Wraps NFT / BLINK token / ETH into a shareable link.
-- DIRECT MODE: intended recipient (first opener claims). PUBLIC HUNT MODE: first claim wins.
-- 24h expiry; unclaimed gifts return to sender.

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_username text,
  recipient_id uuid references auth.users(id),
  asset_type text not null check (asset_type in ('nft','blink','eth')),
  asset_payload jsonb not null,
  mode text not null default 'direct' check (mode in ('direct','public')),
  anonymous boolean not null default false,
  message text,
  status text not null default 'pending'
    check (status in ('pending','spawned','claimed','expired','refunded','failed')),
  spawn_id uuid,
  spawn_anchor_lat double precision,
  spawn_anchor_lng double precision,
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  claimed_at timestamptz,
  refunded_at timestamptz,
  on_chain_escrow_tx text,
  on_chain_claim_tx text
);
create index if not exists gifts_short_code_idx on public.gifts (short_code);
create index if not exists gifts_sender_idx on public.gifts (sender_id, created_at desc);
create index if not exists gifts_expires_idx
  on public.gifts (expires_at) where status in ('pending','spawned');

-- Wire creature_spawns to gifts for the on-map gift creatures.
alter table public.creature_spawns add column if not exists gift_id uuid references public.gifts(id);
alter table public.creature_spawns add column if not exists is_gift boolean default false;

-- Add FK from gifts.spawn_id -> creature_spawns(id) after both columns exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'gifts_spawn_id_fkey'
  ) then
    alter table public.gifts
      add constraint gifts_spawn_id_fkey
      foreign key (spawn_id) references public.creature_spawns(id) on delete set null;
  end if;
end$$;

create table if not exists public.gift_avatars (
  gift_id uuid primary key references public.gifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  avatar_lat double precision not null,
  avatar_lng double precision not null,
  anchor_lat double precision not null,
  anchor_lng double precision not null,
  last_update timestamptz not null default now()
);
