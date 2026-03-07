-- Co-Hunt sessions: two matched users hunting together
CREATE TABLE IF NOT EXISTS co_hunts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_b uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  chain text NOT NULL DEFAULT 'base',
  status text DEFAULT 'active' CHECK (status IN ('invited', 'active', 'ended')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  user_a_tokens jsonb DEFAULT '[]',  -- tokens user_a's agent is watching
  user_b_tokens jsonb DEFAULT '[]',  -- tokens user_b's agent is watching
  shared_tokens jsonb DEFAULT '[]',  -- tokens BOTH agents are in simultaneously
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_co_hunts_user_a ON co_hunts(user_a);
CREATE INDEX IF NOT EXISTS idx_co_hunts_user_b ON co_hunts(user_b);

ALTER TABLE co_hunts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co_hunt_select" ON co_hunts FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "co_hunt_insert" ON co_hunts FOR INSERT WITH CHECK (auth.uid() = user_a);
CREATE POLICY "co_hunt_update" ON co_hunts FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Add hunt_alerts_enabled to notification_settings
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS hunt_alerts_enabled boolean DEFAULT true;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS hunt_alert_min_score integer DEFAULT 75;
