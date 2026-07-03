-- Living Echoes Feed — the iOS app's posts / post_reactions / post_comments
-- tables (schema mirrored from the app backend's generated types), so the
-- web Feed tab's Following & Nearby scopes and the Echo composer go live.
-- Run in the Supabase SQL editor.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'echo',
  echo_type text,
  caption text,
  image_url text,
  creature_name text,
  creature_slug text,
  rarity text,
  visibility text not null default 'friends' check (visibility in ('private','friends','community')),
  status text not null default 'active',
  lat double precision,
  lng double precision,
  reaction_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_visibility_created_idx on public.posts (visibility, created_at desc);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'spark',
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- RLS: owners write; visibility drives reads (private = author only,
-- friends = author + accepted friends, community = any signed-in explorer).
alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select using (
  author_id = auth.uid()
  or visibility = 'community'
  or (
    visibility = 'friends' and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.recipient_id = posts.author_id)
          or (f.recipient_id = auth.uid() and f.requester_id = posts.author_id))
    )
  )
);

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert with check (author_id = auth.uid());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete using (author_id = auth.uid());

drop policy if exists post_reactions_select on public.post_reactions;
create policy post_reactions_select on public.post_reactions for select using (true);

drop policy if exists post_reactions_write on public.post_reactions;
create policy post_reactions_write on public.post_reactions for insert with check (user_id = auth.uid());

drop policy if exists post_reactions_delete on public.post_reactions;
create policy post_reactions_delete on public.post_reactions for delete using (user_id = auth.uid());

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select on public.post_comments for select using (true);

drop policy if exists post_comments_insert on public.post_comments;
create policy post_comments_insert on public.post_comments for insert with check (author_id = auth.uid());

-- Keep the denormalized counters in sync.
create or replace function public.bump_post_counters() returns trigger as $$
begin
  if tg_table_name = 'post_reactions' then
    update public.posts set reaction_count = (
      select count(*) from public.post_reactions where post_id = coalesce(new.post_id, old.post_id)
    ) where id = coalesce(new.post_id, old.post_id);
  else
    update public.posts set comment_count = (
      select count(*) from public.post_comments where post_id = coalesce(new.post_id, old.post_id)
    ) where id = coalesce(new.post_id, old.post_id);
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists post_reactions_counter on public.post_reactions;
create trigger post_reactions_counter after insert or delete on public.post_reactions
  for each row execute function public.bump_post_counters();

drop trigger if exists post_comments_counter on public.post_comments;
create trigger post_comments_counter after insert or delete on public.post_comments
  for each row execute function public.bump_post_counters();
