-- Wild creature spawns (virtual until caught).
-- Apply via Supabase Management API:
--   curl -X POST 'https://api.supabase.com/v1/projects/<ref>/database/query' \
--     -H 'Authorization: Bearer <sbp_...>' \
--     -H 'Content-Type: application/json' \
--     -d '{"query": "<this file contents>"}'

CREATE TABLE IF NOT EXISTS public.wild_spawns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  s2_cell_id text NOT NULL,
  epoch_bucket bigint NOT NULL,
  spawn_index int NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  tier text NOT NULL,
  name text NOT NULL,
  image_cid text NOT NULL,
  spawned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  caught_by uuid REFERENCES public.profiles(id),
  caught_at timestamptz,
  mint_tx_hash text,
  nft_token_id text,
  blink_reward_tx_hash text,
  UNIQUE (s2_cell_id, epoch_bucket, spawn_index)
);

CREATE INDEX IF NOT EXISTS wild_spawns_uncaught_active
  ON public.wild_spawns (lat, lng, expires_at)
  WHERE caught_by IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_catches_remaining int NOT NULL DEFAULT 3;
