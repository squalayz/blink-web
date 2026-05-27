-- Genesis Drops — privacy-preserving special drops.
-- The first opener of a /drop/{slug} link anchors the spawn near THEIR location.
-- Anchor coords stay server-side; clients only ever see the spawn coords (which
-- are within proximity_radius_m of the opener, never the opener's exact GPS).

CREATE TABLE IF NOT EXISTS public.genesis_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  tier text NOT NULL DEFAULT 'mythic',
  image_cid text NOT NULL,
  metadata_cid text,
  blink_reward bigint,
  anchor_lat double precision,
  anchor_lng double precision,
  anchor_user_id uuid REFERENCES public.profiles(id),
  anchor_set_at timestamptz,
  spawn_id uuid REFERENCES public.wild_spawns(id) ON DELETE SET NULL,
  caught_by uuid REFERENCES public.profiles(id),
  caught_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  waive_fee boolean NOT NULL DEFAULT true,
  proximity_radius_m integer NOT NULL DEFAULT 250
);

CREATE INDEX IF NOT EXISTS genesis_drops_slug_idx ON public.genesis_drops (slug);
CREATE INDEX IF NOT EXISTS genesis_drops_spawn_idx ON public.genesis_drops (spawn_id);
CREATE INDEX IF NOT EXISTS genesis_drops_anchor_user_idx ON public.genesis_drops (anchor_user_id);

-- Lock down the base table: only service-role reads/writes. All client reads
-- must go through either the public view below or the API routes, which both
-- omit anchor_lat / anchor_lng.
ALTER TABLE public.genesis_drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS genesis_drops_service_all ON public.genesis_drops;
CREATE POLICY genesis_drops_service_all ON public.genesis_drops
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public-safe view: deliberately omits anchor_lat / anchor_lng. Anchor coords
-- are private even after a drop is opened — anti-cheat references them only
-- server-side.
CREATE OR REPLACE VIEW public.genesis_drops_public AS
SELECT
  id,
  slug,
  name,
  description,
  tier,
  image_cid,
  metadata_cid,
  blink_reward,
  anchor_user_id,
  anchor_set_at,
  spawn_id,
  caught_by,
  caught_at,
  created_at,
  expires_at,
  waive_fee,
  proximity_radius_m
FROM public.genesis_drops;

GRANT SELECT ON public.genesis_drops_public TO anon, authenticated;
