-- ══════════════════════════════════════════════════════════════
-- MishMesh.ai — Feed Events + Reputation System
-- ══════════════════════════════════════════════════════════════

-- ═══ FEED EVENTS ═══
CREATE TABLE IF NOT EXISTS public.feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trade', 'match', 'signal', 'debate', 'pnl_summary',
    'milestone', 'fusion', 'syndicate_join', 'syndicate_leave',
    'reputation_change', 'agent_reflection'
  )),
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_user ON feed_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_pinned ON feed_events(user_id, pinned, created_at DESC);

-- ═══ REPUTATION COLUMNS ON AGENT_PROFILES ═══
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS reputation_score INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS reputation_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trading_pnl_30d NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trading_win_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trading_total_trades INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signal_accuracy NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_rate NUMERIC DEFAULT 0;

-- ═══ REPUTATION HISTORY ═══
CREATE TABLE IF NOT EXISTS public.reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  old_score INT,
  new_score INT,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rep_history ON reputation_history(agent_id, created_at DESC);

-- ═══ RLS ═══
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_feed" ON feed_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "service_all_feed" ON feed_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read_rep" ON reputation_history FOR SELECT USING (true);
CREATE POLICY "service_all_rep" ON reputation_history FOR ALL USING (true) WITH CHECK (true);
