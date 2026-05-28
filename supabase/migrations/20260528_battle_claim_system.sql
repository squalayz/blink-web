-- Battle + Claim system columns for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claim_code VARCHAR(10) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claim_password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claimable_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trainer_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS candy INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trophy_rating INTEGER DEFAULT 1000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battles_won INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battles_lost INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_claimed_tokens NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_claim_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trainer_code VARCHAR(8) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_claim_code ON profiles(claim_code);
CREATE INDEX IF NOT EXISTS idx_profiles_trainer_code ON profiles(trainer_code);

-- Claims ledger (audit trail of every token claim)
CREATE TABLE IF NOT EXISTS claim_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  claim_code VARCHAR(10) NOT NULL,
  points_redeemed INTEGER NOT NULL,
  tokens_sent NUMERIC NOT NULL,
  eth_address VARCHAR(42) NOT NULL,
  tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_claim_ledger_profile ON claim_ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_claim_ledger_code ON claim_ledger(claim_code);

-- Friends system
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);

-- Battle sessions
CREATE TABLE IF NOT EXISTS battle_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wager_points INTEGER DEFAULT 0,
  wager_candy INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, cancelled
  winner_id UUID REFERENCES profiles(id),
  battle_type VARCHAR(20) DEFAULT 'live', -- live, ar
  channel_id VARCHAR(100), -- supabase realtime channel
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_battle_sessions_challenger ON battle_sessions(challenger_id);
CREATE INDEX IF NOT EXISTS idx_battle_sessions_opponent ON battle_sessions(opponent_id);
