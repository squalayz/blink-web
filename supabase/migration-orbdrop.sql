-- MishMesh OrbDrop Migration
-- Drop crypto into the world. Hunt it down. Crack it open.

-- Orbs table
create table if not exists orbs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'crypto', -- crypto, token, nft
  currency text not null default 'SOL', -- SOL, ETH, BTC
  amount numeric not null,
  amount_usd numeric,
  claim_fee_usd numeric not null default 0.10,
  message text,
  lat numeric not null,
  lng numeric not null,
  dropper_id uuid references auth.users(id),
  dropper_name text,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  rarity text not null default 'common', -- common, rare, legendary
  status text not null default 'active', -- active, claimed, expired
  tx_hash text,
  created_at timestamptz default now()
);

-- Orb claims
create table if not exists orb_claims (
  id uuid primary key default gen_random_uuid(),
  orb_id uuid references orbs(id),
  user_id uuid references auth.users(id),
  fee_paid_usd numeric,
  tx_hash text,
  created_at timestamptz default now()
);

-- Profiles (replaces old users table)
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  username text unique,
  avatar_color text default '#9945FF',
  wallet_address text,
  bio text,
  profile_pic_url text,
  handle text unique,
  follower_count integer default 0,
  following_count integer default 0,
  reputation integer default 0,
  is_verified boolean default false,
  orbs_found integer default 0,
  orbs_dropped integer default 0,
  total_earned_usd numeric default 0,
  total_dropped_usd numeric default 0,
  created_at timestamptz default now()
);

-- Note: Create a "avatars" bucket in Supabase Storage, set to public

-- Enable RLS
alter table orbs enable row level security;
alter table orb_claims enable row level security;
alter table profiles enable row level security;

-- Policies
create policy "Orbs viewable by all" on orbs for select using (true);
create policy "Users can insert orbs" on orbs for insert with check (auth.uid() = dropper_id);
create policy "Users can update own orbs" on orbs for update using (auth.uid() = dropper_id);
create policy "Claims viewable by owner" on orb_claims for select using (auth.uid() = user_id);
create policy "Users can insert claims" on orb_claims for insert with check (auth.uid() = user_id);
create policy "Profiles viewable by all" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Enable realtime
alter publication supabase_realtime add table orbs;
