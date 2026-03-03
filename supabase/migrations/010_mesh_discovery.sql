-- ══════════════════════════════════════════════════════════
-- MishMesh.ai — Mesh Discovery Engine
-- Autonomous AI agent matchmaking tables
-- ══════════════════════════════════════════════════════════

-- User discovery preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  connection_types TEXT[] DEFAULT '{}', -- ['business','romantic','trading','networking']

  -- Romantic prefs
  interested_in TEXT, -- 'men','women','everyone'
  age_range_min INT DEFAULT 18,
  age_range_max INT DEFAULT 65,
  location_preference TEXT DEFAULT 'anywhere', -- 'nearby','country','anywhere'
  dealbreakers TEXT,
  vibe TEXT, -- 'chill','ambitious','creative','nerdy','adventurous'

  -- Business prefs
  looking_for TEXT[], -- ['co-founders','investors','clients','collaborators','advisors']
  industry TEXT,
  stage TEXT, -- 'idea','building','launched','scaling'
  what_i_bring TEXT,
  what_i_need TEXT,

  -- Trading prefs
  trading_style TEXT, -- 'degen','conservative','mixed'
  trading_looking_for TEXT[], -- ['signals','syndicate','watching']
  preferred_strategies TEXT[],
  min_reputation INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent autonomous actions log
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'evaluate','swipe_right','swipe_left','send_opener','match_found'
  target_user_id UUID REFERENCES users(id),
  reasoning TEXT,
  message_sent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generated openers from agent
CREATE TABLE IF NOT EXISTS agent_openers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user ON agent_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_openers_match ON agent_openers(match_id);
