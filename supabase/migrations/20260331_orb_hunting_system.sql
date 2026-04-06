-- ============================================================
-- MISHMESH ORB HUNTING SYSTEM — FULL MIGRATION
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. ZONE LORDS — neighborhood ownership
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                        -- e.g. "Downtown Phoenix"
  city text,
  country text,
  lat_center numeric NOT NULL,
  lng_center numeric NOT NULL,
  radius_meters integer DEFAULT 500,
  lord_user_id uuid REFERENCES users(id),    -- current zone lord
  lord_since timestamptz,
  orbs_cracked_in_zone integer DEFAULT 0,
  earn_percent numeric DEFAULT 2.0,          -- % of future drops lord earns
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. ZONE CLAIMS — track who cracked orbs per zone
-- ============================================================
CREATE TABLE IF NOT EXISTS zone_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id),
  user_id uuid REFERENCES users(id),
  orb_id uuid REFERENCES orbs(id),
  cracked_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. ORB HUNTS — active races (multiple hunters → same orb)
-- ============================================================
CREATE TABLE IF NOT EXISTS orb_hunts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orb_id uuid REFERENCES orbs(id) ON DELETE CASCADE,
  hunter_id uuid REFERENCES users(id),
  started_at timestamptz DEFAULT now(),
  lat numeric,                               -- hunter's last known position
  lng numeric,
  status text DEFAULT 'hunting'              -- hunting | won | lost | abandoned
);

-- ============================================================
-- 4. ORB ACTIVITY FEED — global real-time event stream
-- ============================================================
CREATE TABLE IF NOT EXISTS orb_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,                  -- launched | cracked | expired | zone_lord | world_orb
  orb_id uuid REFERENCES orbs(id),
  user_id uuid REFERENCES users(id),         -- actor
  target_user_id uuid REFERENCES users(id), -- recipient if any
  zone_id uuid REFERENCES zones(id),
  lat numeric,
  lng numeric,
  city text,
  country text,
  value_usd numeric,
  currency text,
  rarity text,
  message text,                              -- display text e.g. "@squalay cracked a rare orb in Phoenix"
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for feed queries
CREATE INDEX IF NOT EXISTS orb_activity_created_at_idx ON orb_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS orb_activity_user_id_idx ON orb_activity(user_id);
CREATE INDEX IF NOT EXISTS orb_activity_event_type_idx ON orb_activity(event_type);

-- ============================================================
-- 5. NOTIFICATION PREFERENCES — per-user filter settings
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE,
  -- proximity
  near_me_enabled boolean DEFAULT true,
  near_me_radius_miles integer DEFAULT 5,
  -- value filter
  min_value_usd numeric DEFAULT 0,
  -- rarity toggles
  notify_common boolean DEFAULT false,
  notify_rare boolean DEFAULT true,
  notify_legendary boolean DEFAULT true,
  -- type filters
  notify_nft_only boolean DEFAULT false,
  notify_followed_droppers boolean DEFAULT true,
  notify_zone_alerts boolean DEFAULT true,   -- zone lord perk
  notify_global_events boolean DEFAULT true, -- world orbs, events
  -- push
  fcm_token text,
  push_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. PUSH NOTIFICATION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  orb_id uuid REFERENCES orbs(id)
);

-- ============================================================
-- 7. WORLD ORB EVENTS — special global drops
-- ============================================================
CREATE TABLE IF NOT EXISTS world_orb_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orb_id uuid REFERENCES orbs(id),
  title text NOT NULL,                       -- "The Lost Orb of Tokyo"
  description text,
  value_usd numeric NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  winner_id uuid REFERENCES users(id),
  winner_cracked_at timestamptz,
  status text DEFAULT 'upcoming'             -- upcoming | active | completed
);

-- ============================================================
-- 8. HUNTER STATS — cached stats per user (perf)
-- ============================================================
CREATE TABLE IF NOT EXISTS hunter_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  total_cracked integer DEFAULT 0,
  total_earned_usd numeric DEFAULT 0,
  total_dropped integer DEFAULT 0,
  total_dropped_usd numeric DEFAULT 0,
  zones_owned integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_crack_at timestamptz,
  rank_global integer,
  rank_city integer,
  city text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 9. ADD MISSING COLUMNS TO EXISTING orbs TABLE
-- ============================================================
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS fling_origin_lat numeric;
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS fling_origin_lng numeric;
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS fling_force numeric;           -- 0-1, controls distance
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS fling_direction numeric;       -- degrees 0-360
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id);
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS is_world_orb boolean DEFAULT false;
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS hunter_count integer DEFAULT 0; -- how many racing for it

-- ============================================================
-- 10. REALTIME — enable on key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orb_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE orb_hunts;
ALTER PUBLICATION supabase_realtime ADD TABLE orbs;
ALTER PUBLICATION supabase_realtime ADD TABLE world_orb_events;

-- ============================================================
-- 11. RLS POLICIES
-- ============================================================

-- orb_activity: anyone can read, system inserts
ALTER TABLE orb_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orb_activity_read_all" ON orb_activity FOR SELECT USING (true);
CREATE POLICY "orb_activity_insert_service" ON orb_activity FOR INSERT WITH CHECK (true);

-- notification_prefs: users own their own
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_own" ON notification_prefs USING (auth.uid() = user_id);

-- hunter_stats: public read
ALTER TABLE hunter_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hunter_stats_read_all" ON hunter_stats FOR SELECT USING (true);

-- zones: public read
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_read_all" ON zones FOR SELECT USING (true);

-- orb_hunts: hunters see their own + same orb hunters
ALTER TABLE orb_hunts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orb_hunts_own" ON orb_hunts USING (auth.uid() = hunter_id);

-- ============================================================
-- 12. HELPER FUNCTION — auto-generate activity feed entry on orb crack
-- ============================================================
CREATE OR REPLACE FUNCTION on_orb_cracked()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'claimed' AND OLD.status != 'claimed' THEN
    INSERT INTO orb_activity (
      event_type, orb_id, user_id, lat, lng,
      value_usd, currency, rarity, message
    ) VALUES (
      'cracked',
      NEW.id,
      NEW.claimed_by,
      NEW.lat,
      NEW.lng,
      NEW.amount_usd,
      NEW.currency,
      NEW.rarity,
      'Someone cracked a ' || NEW.rarity || ' orb'
    );

    -- Update hunter stats
    INSERT INTO hunter_stats (user_id, total_cracked, total_earned_usd, last_crack_at)
    VALUES (NEW.claimed_by, 1, COALESCE(NEW.amount_usd, 0), now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_cracked = hunter_stats.total_cracked + 1,
      total_earned_usd = hunter_stats.total_earned_usd + COALESCE(NEW.amount_usd, 0),
      last_crack_at = now(),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orb_cracked ON orbs;
CREATE TRIGGER trg_orb_cracked
  AFTER UPDATE ON orbs
  FOR EACH ROW EXECUTE FUNCTION on_orb_cracked();

-- ============================================================
-- 13. HELPER FUNCTION — auto-generate activity on orb launch
-- ============================================================
CREATE OR REPLACE FUNCTION on_orb_launched()
RETURNS trigger AS $$
BEGIN
  INSERT INTO orb_activity (
    event_type, orb_id, user_id, lat, lng,
    value_usd, currency, rarity, message
  ) VALUES (
    'launched',
    NEW.id,
    NEW.dropper_id,
    NEW.lat,
    NEW.lng,
    NEW.amount_usd,
    NEW.currency,
    NEW.rarity,
    'A ' || NEW.rarity || ' orb was launched'
  );

  -- Update dropper stats
  INSERT INTO hunter_stats (user_id, total_dropped, total_dropped_usd)
  VALUES (NEW.dropper_id, 1, COALESCE(NEW.amount_usd, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    total_dropped = hunter_stats.total_dropped + 1,
    total_dropped_usd = hunter_stats.total_dropped_usd + COALESCE(NEW.amount_usd, 0),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orb_launched ON orbs;
CREATE TRIGGER trg_orb_launched
  AFTER INSERT ON orbs
  FOR EACH ROW EXECUTE FUNCTION on_orb_launched();
