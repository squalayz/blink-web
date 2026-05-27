-- BLINK Social Discovery — presence, creature spawns, friends, blocks, DMs.
-- Privacy-by-design: only fuzzy locations leave the server.

create table if not exists public.presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  fuzzy_lat double precision not null,
  fuzzy_lng double precision not null,
  fuzzy_radius_m int not null default 300,
  last_seen timestamptz not null default now(),
  is_ghost boolean not null default false
);
create index if not exists presence_last_seen_idx on public.presence (last_seen desc);
create index if not exists presence_loc_idx on public.presence (fuzzy_lat, fuzzy_lng);

create table if not exists public.creature_spawns (
  id uuid primary key default gen_random_uuid(),
  species text not null,
  rarity text not null check (rarity in ('common','uncommon','rare','legendary','mythic')),
  true_lat double precision not null,
  true_lng double precision not null,
  fuzzy_lat double precision not null,
  fuzzy_lng double precision not null,
  fuzzy_radius_m int not null default 300,
  spawn_time timestamptz not null default now(),
  expires_at timestamptz not null,
  caught_by uuid references auth.users(id),
  caught_at timestamptz
);
create index if not exists creature_spawns_expires_idx on public.creature_spawns (expires_at);
create index if not exists creature_spawns_loc_idx on public.creature_spawns (fuzzy_lat, fuzzy_lng);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted','blocked')) default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, recipient_id)
);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_recipient_idx on public.friendships (recipient_id, status);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists user_reports_reported_idx on public.user_reports (reported_id, created_at desc);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists dm_recipient_idx on public.direct_messages (recipient_id, created_at desc);
create index if not exists dm_pair_idx on public.direct_messages (sender_id, recipient_id, created_at desc);

-- Add presence_mode to profiles if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'presence_mode'
  ) then
    alter table public.profiles
      add column presence_mode text default 'public'
      check (presence_mode in ('public','friends','ghost'));
  end if;
end$$;

-- Add privacy_intro_seen marker so we only show the modal once
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'privacy_intro_seen'
  ) then
    alter table public.profiles
      add column privacy_intro_seen boolean default false;
  end if;
end$$;
