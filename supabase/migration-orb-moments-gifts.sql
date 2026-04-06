-- Migration: orb_moments + gift_orbs tables
-- Created: 2026-03-31

-- orb_moments table
CREATE TABLE IF NOT EXISTS orb_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  orb_id uuid,
  image_url text NOT NULL,
  frame_style text DEFAULT 'polaroid',
  orb_type text DEFAULT 'crypto',
  orb_currency text,
  orb_amount numeric,
  orb_rarity text DEFAULT 'common',
  action_type text NOT NULL DEFAULT 'catch',
  location_name text,
  latitude numeric,
  longitude numeric,
  caption text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- gift_orbs table
CREATE TABLE IF NOT EXISTS gift_orbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orb_id uuid,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_handle text,
  sender_display_name text,
  sender_avatar_url text,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gift_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 12),
  currency text NOT NULL,
  amount numeric NOT NULL,
  message text,
  is_mystery boolean DEFAULT false,
  expires_at timestamptz,
  claimed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  latitude numeric,
  longitude numeric,
  location_name text,
  referral_tracked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE orb_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_orbs ENABLE ROW LEVEL SECURITY;

-- orb_moments policies
CREATE POLICY IF NOT EXISTS "Public moments viewable" ON orb_moments FOR SELECT USING (is_public = true);
CREATE POLICY IF NOT EXISTS "Users manage own moments" ON orb_moments FOR ALL USING (auth.uid() = user_id);

-- gift_orbs policies
CREATE POLICY IF NOT EXISTS "Anyone can view gift by code" ON gift_orbs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Sender manages own gifts" ON gift_orbs FOR ALL USING (auth.uid() = sender_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orb_moments_user ON orb_moments(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_moments_public ON orb_moments(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_orbs_code ON gift_orbs(gift_code);
CREATE INDEX IF NOT EXISTS idx_gift_orbs_sender ON gift_orbs(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_orbs_status ON gift_orbs(status);
