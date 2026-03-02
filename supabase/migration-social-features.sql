-- ============================================================
-- MishMesh Social Features Migration
-- Swipe discovery, locked photos, tips, priority connects
-- ============================================================

-- Add popularity columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS popularity_score integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_connections integer DEFAULT 0;

-- ── Locked Photos ──
CREATE TABLE IF NOT EXISTS locked_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  price_eth numeric(18,8) DEFAULT 0.003,
  unlocked boolean DEFAULT false,
  unlock_tx_hash text,
  unlocked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ── Tips ──
CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount_eth numeric(18,8) NOT NULL,
  tip_type text DEFAULT 'tip' CHECK (tip_type IN ('power_react', 'tip', 'super_tip')),
  tx_hash text,
  created_at timestamptz DEFAULT now()
);

-- ── Priority Connects ──
CREATE TABLE IF NOT EXISTS priority_connects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount_eth numeric(18,8) NOT NULL,
  tx_hash text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at timestamptz DEFAULT now()
);

-- ── Extend messages table ──
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- ══════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════

ALTER TABLE locked_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_connects ENABLE ROW LEVEL SECURITY;

-- locked_photos policies
CREATE POLICY "locked_photos_select" ON locked_photos
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "locked_photos_insert" ON locked_photos
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "locked_photos_update" ON locked_photos
  FOR UPDATE USING (auth.uid() = receiver_id);

-- tips policies
CREATE POLICY "tips_select" ON tips
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "tips_insert" ON tips
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- priority_connects policies
CREATE POLICY "priority_connects_select" ON priority_connects
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "priority_connects_insert" ON priority_connects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_locked_photos_match ON locked_photos(match_id);
CREATE INDEX IF NOT EXISTS idx_locked_photos_receiver ON locked_photos(receiver_id);
CREATE INDEX IF NOT EXISTS idx_locked_photos_sender ON locked_photos(sender_id);
CREATE INDEX IF NOT EXISTS idx_tips_match ON tips(match_id);
CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_id);
CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id);
CREATE INDEX IF NOT EXISTS idx_priority_connects_target ON priority_connects(target_user_id);
CREATE INDEX IF NOT EXISTS idx_priority_connects_status ON priority_connects(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
