-- Wallet locks (funds locked when orb is dropped)
CREATE TABLE IF NOT EXISTS wallet_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  orb_id UUID REFERENCES orbs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'released', 'claimed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missions definitions
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'daily' CHECK (type IN ('daily', 'weekly', 'special')),
  reward_type TEXT DEFAULT 'points' CHECK (reward_type IN ('points', 'crypto', 'badge')),
  reward_amount NUMERIC DEFAULT 0,
  reward_currency TEXT,
  requirement_type TEXT NOT NULL,
  requirement_count INTEGER DEFAULT 1,
  icon TEXT DEFAULT '🎯',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mission progress per user
CREATE TABLE IF NOT EXISTS mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  mission_id UUID REFERENCES missions(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'complete', 'claimed')),
  progress INTEGER DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- Insert some default daily missions
INSERT INTO missions (title, description, type, reward_type, reward_amount, requirement_type, requirement_count, icon) VALUES
  ('First Hunt', 'Find and crack your first orb', 'special', 'points', 100, 'crack', 1, '🔮'),
  ('Daily Hunter', 'Crack 1 orb today', 'daily', 'points', 50, 'crack', 1, '🎯'),
  ('Orb Dropper', 'Drop your first orb', 'special', 'points', 75, 'drop', 1, '💎'),
  ('Explorer', 'Visit 3 different locations', 'weekly', 'points', 150, 'location', 3, '🗺️'),
  ('Social Butterfly', 'Send 5 messages', 'weekly', 'points', 100, 'message', 5, '💬')
ON CONFLICT DO NOTHING;
