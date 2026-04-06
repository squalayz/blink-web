-- Orb Trails: sequences of linked orbs where each is hidden until previous cracked

CREATE TABLE IF NOT EXISTS trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SOL',
  orb_count integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'active',
  time_limit_hours integer,
  is_public boolean NOT NULL DEFAULT true,
  is_sponsored boolean NOT NULL DEFAULT false,
  brand_name text,
  brand_logo_url text,
  brand_color text,
  brand_cta_url text,
  brand_cta_text text,
  starts_at timestamptz,
  expires_at timestamptz,
  completed_count integer NOT NULL DEFAULT 0,
  started_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trails_status_check CHECK (status IN ('active', 'completed', 'expired', 'draft')),
  CONSTRAINT trails_orb_count_check CHECK (orb_count >= 2 AND orb_count <= 10)
);

CREATE TABLE IF NOT EXISTS trail_orbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid REFERENCES trails(id) ON DELETE CASCADE NOT NULL,
  orb_id uuid REFERENCES orbs(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL,
  clue_text text NOT NULL,
  hint_image_url text,
  hint_audio_url text,
  hint_unlocked_after_minutes integer NOT NULL DEFAULT 30,
  is_finale boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trail_orbs_position_check CHECK (position >= 1 AND position <= 10),
  UNIQUE(trail_id, position),
  UNIQUE(trail_id, orb_id)
);

CREATE TABLE IF NOT EXISTS trail_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid REFERENCES trails(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_position integer NOT NULL DEFAULT 1,
  orbs_cracked integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completion_time_seconds integer,
  finish_rank integer,
  UNIQUE(trail_id, user_id)
);

CREATE TABLE IF NOT EXISTS trail_hint_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid REFERENCES trails(id) ON DELETE CASCADE NOT NULL,
  trail_orb_id uuid REFERENCES trail_orbs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trail_orb_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trails_status ON trails(status);
CREATE INDEX IF NOT EXISTS idx_trails_creator ON trails(creator_id);
CREATE INDEX IF NOT EXISTS idx_trails_created ON trails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trail_orbs_trail ON trail_orbs(trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_progress_trail ON trail_progress(trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_progress_user ON trail_progress(user_id);

-- RLS
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_orbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_hint_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trails_select" ON trails FOR SELECT USING (is_public = true OR creator_id = auth.uid());
CREATE POLICY "trails_insert" ON trails FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "trails_update" ON trails FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "trail_orbs_select" ON trail_orbs FOR SELECT USING (true);
CREATE POLICY "trail_orbs_insert" ON trail_orbs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trails WHERE id = trail_id AND creator_id = auth.uid())
);

CREATE POLICY "trail_progress_select" ON trail_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "trail_progress_insert" ON trail_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "trail_progress_update" ON trail_progress FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "trail_hints_select" ON trail_hint_purchases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "trail_hints_insert" ON trail_hint_purchases FOR INSERT WITH CHECK (user_id = auth.uid());
