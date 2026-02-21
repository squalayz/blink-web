-- ══════════════════════════════════════════════════════════════
-- MishMesh.ai — COMPLETE DATABASE SCHEMA
-- Run this ONCE in Supabase SQL Editor
-- Includes: users, agents, matches, chat, crypto, notifications,
--           referrals, streaks, badges, challenges, leaderboards
-- ══════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ════════════════════════════
-- CORE TABLES
-- ════════════════════════════

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  building TEXT DEFAULT '',
  looking_for TEXT DEFAULT '',
  socials JSONB DEFAULT '{"x":"","website":"","github":"","linkedin":""}'::jsonb,
  location TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT true,
  onboarded BOOLEAN DEFAULT false,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business')),
  tier_expires_at TIMESTAMPTZ,            -- When paid tier expires
  daily_convos_used INTEGER DEFAULT 0,
  last_convo_reset DATE DEFAULT CURRENT_DATE,
  referral_code TEXT UNIQUE DEFAULT LEFT(uuid_generate_v4()::text, 8),
  referred_by TEXT,
  -- AI Provider (user brings their own key)
  ai_provider TEXT DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'anthropic', 'google', 'groq', 'openrouter', 'custom')),
  ai_api_key_encrypted TEXT,   -- User's API key (encrypt in production)
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_endpoint TEXT,            -- Only for custom provider
  -- Per-user Base wallet (non-custodial)
  wallet_address TEXT UNIQUE,           -- Public address on Base
  wallet_encrypted_key TEXT,            -- Encrypted private key (server-side only)
  -- Legal consent timestamps
  tos_accepted_at TIMESTAMPTZ,          -- Terms + Privacy accepted on signup
  risk_accepted_at TIMESTAMPTZ,         -- Risk disclaimer accepted when enabling trading
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  agent_name TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  capabilities TEXT[] DEFAULT '{}',
  collab_types TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}'::jsonb,
  learned_preferences JSONB DEFAULT '{"liked_industries":{},"passed_industries":{}}'::jsonb,
  match_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  -- Agent personality
  agent_style TEXT DEFAULT 'professional' CHECK (agent_style IN ('professional','friendly','aggressive','custom')),
  agent_instructions TEXT DEFAULT '',    -- Custom personality prompt
  -- Reputation (average of match ratings received)
  reputation_score NUMERIC(3,2) DEFAULT 0,
  reputation_count INTEGER DEFAULT 0,
  -- Priority / visibility
  boosted_at TIMESTAMPTZ,                 -- When last boost was purchased
  spotlight_until TIMESTAMPTZ,            -- Spotlight active until this date
  new_user_boost_until TIMESTAMPTZ,       -- 48hr boost for new signups
  agent_avatar_url TEXT DEFAULT '',
  agent_avatar_prompt TEXT DEFAULT '',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES public.users(id) ON DELETE CASCADE,
  score NUMERIC(3,2) DEFAULT 0,
  agent_reasoning TEXT DEFAULT '',
  collab_idea TEXT DEFAULT '',
  synergy TEXT DEFAULT '',
  strengths TEXT[] DEFAULT '{}',
  risks TEXT[] DEFAULT '{}',
  highlights JSONB DEFAULT '[]'::jsonb,
  status_a TEXT DEFAULT 'pending' CHECK (status_a IN ('pending','accepted','passed')),
  status_b TEXT DEFAULT 'pending' CHECK (status_b IN ('pending','accepted','passed')),
  revealed BOOLEAN DEFAULT false,
  -- NFT minting
  nft_minted BOOLEAN DEFAULT false,
  nft_token_id TEXT,                    -- "tokenIdA,tokenIdB"
  nft_tx_hash TEXT,
  nft_minted_by UUID REFERENCES public.users(id),
  nft_minted_at TIMESTAMPTZ,
  -- Match ratings (1-5 stars from each user)
  user_a_rating INTEGER CHECK (user_a_rating BETWEEN 1 AND 5),
  user_b_rating INTEGER CHECK (user_b_rating BETWEEN 1 AND 5),
  -- Outcome tracking (feeds back into matching algorithm)
  chat_opened BOOLEAN DEFAULT false,
  messages_exchanged INTEGER DEFAULT 0,
  deal_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  agent_a UUID REFERENCES public.users(id),
  agent_b UUID REFERENCES public.users(id),
  transcript TEXT DEFAULT '',
  score NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'system',
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════
-- GAMIFICATION
-- ════════════════════════════

CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login DATE,
  total_logins INTEGER DEFAULT 0,
  free_pro_days_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT DEFAULT '',
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id),
  reporter_id UUID REFERENCES public.users(id),
  partner_id UUID REFERENCES public.users(id),
  deal_type TEXT DEFAULT 'collaboration',
  description TEXT DEFAULT '',
  value_estimate TEXT DEFAULT '',
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported','in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  criteria JSONB DEFAULT '{}'::jsonb,
  reward_type TEXT DEFAULT 'badge',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.agent_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  report_date DATE DEFAULT CURRENT_DATE,
  daily_convos_count INTEGER DEFAULT 0,
  matches_above_85 INTEGER DEFAULT 0,
  top_match_score NUMERIC(3,2) DEFAULT 0,
  top_match_industry TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_date)
);

CREATE TABLE IF NOT EXISTS public.share_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id),
  card_type TEXT DEFAULT 'match',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.public_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════
-- CRYPTO (Base L2 — per-user wallets, non-custodial)
-- Each user gets their own wallet generated on signup.
-- Platform wallet 0xEe9D...c280 is ONLY for receiving fees.
-- agent_balances tracks trading settings + PnL (balance is on-chain).
-- ════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  balance_eth NUMERIC(18,8) DEFAULT 0,
  total_deposited NUMERIC(18,8) DEFAULT 0,
  total_withdrawn NUMERIC(18,8) DEFAULT 0,
  total_fees NUMERIC(18,8) DEFAULT 0,
  total_trading_pnl NUMERIC(18,8) DEFAULT 0,
  trading_enabled BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'conservative' CHECK (risk_level IN ('conservative', 'balanced', 'degen')),
  is_active BOOLEAN DEFAULT false,
  last_funded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  from_address TEXT,
  tx_hash TEXT,
  amount_eth NUMERIC(18,8) NOT NULL,
  fee_eth NUMERIC(18,8) DEFAULT 0,          -- 10% deposit fee
  net_eth NUMERIC(18,8) DEFAULT 0,          -- Amount after fee
  fee_tx_hash TEXT,                          -- Fee tx to platform wallet
  confirmations INTEGER DEFAULT 0,
  confirmed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tier / boost / spotlight payments
CREATE TABLE IF NOT EXISTS public.tier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT,                                 -- pro, business, boost, spotlight
  amount_eth NUMERIC(18,8) NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promoted matches — pay to target a specific user
CREATE TABLE IF NOT EXISTS public.promoted_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount_eth NUMERIC(18,8) DEFAULT 0.005,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','matched','expired','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Meshes — 3-4 agent round tables (premium: 0.01 ETH)
CREATE TABLE IF NOT EXISTS public.group_meshes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  topic TEXT DEFAULT '',                  -- Business idea / discussion topic
  size INTEGER DEFAULT 4 CHECK (size BETWEEN 3 AND 4),
  status TEXT DEFAULT 'forming' CHECK (status IN ('forming','running','completed','failed')),
  transcript TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  amount_eth NUMERIC(18,8) DEFAULT 0.01,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_mesh_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_mesh_id UUID REFERENCES public.group_meshes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('creator','member')),
  compatibility_score NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Developer API Access (0.01 ETH/month)
CREATE TABLE IF NOT EXISTS public.developer_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  api_key TEXT UNIQUE NOT NULL,           -- Generated API key
  name TEXT DEFAULT 'default',
  webhook_url TEXT,                       -- Webhook for match notifications
  active BOOLEAN DEFAULT true,
  calls_this_month INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 100,         -- Calls per hour
  expires_at TIMESTAMPTZ,                 -- When subscription expires
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount_eth NUMERIC(18,8) NOT NULL,
  to_address TEXT NOT NULL,
  tx_hash TEXT,
  fee_tx_hash TEXT,               -- Fee sent to platform wallet
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'rejected')),
  auto_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trading_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  amount_eth NUMERIC(18,8) NOT NULL,
  pnl_eth NUMERIC(18,8) DEFAULT 0,
  fee_eth NUMERIC(18,8) DEFAULT 0,          -- 1% trade fee
  tx_hash TEXT,
  fee_tx_hash TEXT,                          -- Fee tx to platform wallet
  reasoning TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  telegram_chat_id TEXT,
  discord_webhook_url TEXT,
  webhook_url TEXT,
  openclaw_enabled BOOLEAN DEFAULT false,
  notify_matches BOOLEAN DEFAULT true,
  notify_messages BOOLEAN DEFAULT true,
  notify_trades BOOLEAN DEFAULT true,
  notify_balance BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════
-- REFERRALS
-- 5→Priority, 10→Pro month, 25→Founding, 50→Lifetime, 100→Featured
-- ════════════════════════════

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referred_user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN (
    'priority_matching', 'pro_free_month', 'founding_member',
    'lifetime_pro', 'homepage_featured'
  )),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reward_type)
);

-- ════════════════════════════
-- VIEWS
-- ════════════════════════════

CREATE OR REPLACE VIEW public.leaderboard_top_builders AS
SELECT u.id, u.name, u.avatar_url, u.industry, a.match_count, a.conversation_count
FROM public.users u JOIN public.agent_profiles a ON a.user_id = u.id
WHERE u.is_public = true ORDER BY a.match_count DESC LIMIT 50;

CREATE OR REPLACE VIEW public.leaderboard_match_rate AS
SELECT u.id, u.name, u.avatar_url, a.match_count, a.conversation_count,
  CASE WHEN a.conversation_count > 0 THEN ROUND((a.match_count::numeric / a.conversation_count) * 100, 1) ELSE 0 END AS match_rate
FROM public.users u JOIN public.agent_profiles a ON a.user_id = u.id
WHERE u.is_public = true AND a.conversation_count >= 5
ORDER BY match_rate DESC LIMIT 50;

CREATE OR REPLACE VIEW public.leaderboard_deal_closers AS
SELECT u.id, u.name, u.avatar_url, COUNT(d.id) AS deals_closed
FROM public.users u JOIN public.deals d ON d.reporter_id = u.id
WHERE d.status = 'completed' AND u.is_public = true
GROUP BY u.id ORDER BY deals_closed DESC LIMIT 50;

-- Trading PnL leaderboard
CREATE OR REPLACE VIEW public.leaderboard_trading AS
SELECT u.id, u.name, u.avatar_url, u.industry,
  b.total_trading_pnl, b.total_fees,
  a.match_count
FROM public.users u
JOIN public.agent_balances b ON b.user_id = u.id
JOIN public.agent_profiles a ON a.user_id = u.id
WHERE u.is_public = true AND b.total_trading_pnl > 0
ORDER BY b.total_trading_pnl DESC LIMIT 100;

-- Reputation leaderboard
CREATE OR REPLACE VIEW public.leaderboard_reputation AS
SELECT u.id, u.name, u.avatar_url, u.industry,
  a.reputation_score, a.reputation_count, a.match_count
FROM public.users u
JOIN public.agent_profiles a ON a.user_id = u.id
WHERE u.is_public = true AND a.reputation_count >= 3
ORDER BY a.reputation_score DESC LIMIT 100;

-- Referral leaderboard
CREATE OR REPLACE VIEW public.leaderboard_referrals AS
SELECT u.id, u.name, u.avatar_url,
  (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) AS referral_count
FROM public.users u
WHERE u.is_public = true
  AND (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) > 0
ORDER BY referral_count DESC LIMIT 100;

-- Public agent profile view (no sensitive data)
CREATE OR REPLACE VIEW public.public_agent_profiles AS
SELECT u.id, u.name, u.avatar_url, u.industry, u.bio,
  u.building, u.location, u.x_handle, u.created_at AS member_since,
  a.agent_name, a.summary, a.capabilities, a.match_count,
  a.conversation_count, a.reputation_score, a.reputation_count,
  a.agent_style, a.agent_avatar_url,
  a.boosted_at, a.spotlight_until
FROM public.users u
JOIN public.agent_profiles a ON a.user_id = u.id
WHERE u.is_public = true AND u.onboarded = true;

CREATE OR REPLACE VIEW public.referral_stats AS
SELECT u.id AS user_id, u.referral_code,
  (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) AS referral_count,
  CASE
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) >= 100 THEN 'homepage_featured'
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) >= 50 THEN 'lifetime_pro'
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) >= 25 THEN 'founding_member'
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) >= 10 THEN 'pro_free_month'
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) >= 5 THEN 'priority_matching'
    ELSE 'none'
  END AS current_tier,
  CASE
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) < 5 THEN 5
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) < 10 THEN 10
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) < 25 THEN 25
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) < 50 THEN 50
    WHEN (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.id) < 100 THEN 100
    ELSE 100
  END AS next_milestone
FROM public.users u;

CREATE OR REPLACE VIEW public.platform_stats AS
SELECT
  (SELECT COUNT(*) FROM public.users WHERE onboarded = true) AS agents_live,
  (SELECT COUNT(*) FROM public.matches WHERE revealed = true) AS matches_made,
  (SELECT COUNT(*) FROM public.waitlist) AS waitlist_count,
  (SELECT COUNT(*) FROM public.deals WHERE status = 'completed') AS deals_closed,
  (SELECT COUNT(*) FROM public.agent_conversations WHERE created_at > NOW() - INTERVAL '24 hours') AS convos_today,
  (SELECT COALESCE(SUM(balance_eth), 0) FROM public.agent_balances WHERE is_active = true) AS total_eth_locked,
  (SELECT COUNT(*) FROM public.agent_balances WHERE is_active = true) AS funded_agents,
  (SELECT COUNT(*) FROM public.referrals) AS total_referrals;

-- ════════════════════════════
-- FUNCTIONS
-- ════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_match_reveal() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_a = 'accepted' AND NEW.status_b = 'accepted' THEN
    NEW.revealed = true;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_streak(uid UUID) RETURNS VOID AS $$
DECLARE s RECORD;
BEGIN
  SELECT * INTO s FROM public.streaks WHERE user_id = uid;
  IF s IS NULL THEN INSERT INTO public.streaks (user_id, current_streak, last_login, total_logins) VALUES (uid, 1, CURRENT_DATE, 1); RETURN; END IF;
  IF s.last_login = CURRENT_DATE THEN RETURN; END IF;
  IF s.last_login = CURRENT_DATE - 1 THEN
    UPDATE public.streaks SET current_streak = current_streak + 1, longest_streak = GREATEST(longest_streak, current_streak + 1), last_login = CURRENT_DATE, total_logins = total_logins + 1 WHERE user_id = uid;
    IF s.current_streak + 1 = 7 THEN
      INSERT INTO public.badges (user_id, badge_type, badge_name, badge_description) VALUES (uid, 'streak_7', 'Legendary Networker', '7-day login streak') ON CONFLICT DO NOTHING;
      UPDATE public.streaks SET free_pro_days_earned = free_pro_days_earned + 1 WHERE user_id = uid;
    ELSIF s.current_streak + 1 = 30 THEN
      INSERT INTO public.badges (user_id, badge_type, badge_name, badge_description) VALUES (uid, 'streak_30', 'Mesh Legend', '30-day login streak') ON CONFLICT DO NOTHING;
    END IF;
  ELSE UPDATE public.streaks SET current_streak = 1, last_login = CURRENT_DATE, total_logins = total_logins + 1 WHERE user_id = uid;
  END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION find_similar_agents(query_embedding vector(1536), exclude_uid UUID, match_limit INT DEFAULT 20)
RETURNS TABLE (user_id UUID, similarity FLOAT) AS $$
BEGIN
  RETURN QUERY SELECT a.user_id, 1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.agent_profiles a WHERE a.user_id != exclude_uid AND a.embedding IS NOT NULL
  ORDER BY a.embedding <=> query_embedding LIMIT match_limit;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_daily_convos() RETURNS VOID AS $$
BEGIN UPDATE public.users SET daily_convos_used = 0, last_convo_reset = CURRENT_DATE WHERE last_convo_reset < CURRENT_DATE; END; $$ LANGUAGE plpgsql;

-- Auto-create related rows on user signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.streaks (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.agent_balances (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.notification_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════
-- TRIGGERS
-- ════════════════════════════

CREATE TRIGGER users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER agents_updated BEFORE UPDATE ON public.agent_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER balance_updated BEFORE UPDATE ON public.agent_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notif_updated BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER match_reveal BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION check_match_reveal();

-- ════════════════════════════
-- RLS POLICIES
-- ════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Public read for public data
CREATE POLICY "public_users" ON public.users FOR SELECT USING (is_public = true OR auth.uid() = id);
CREATE POLICY "own_user_update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user_insert" ON public.users FOR INSERT WITH CHECK (true);

CREATE POLICY "public_agents" ON public.agent_profiles FOR SELECT USING (true);
CREATE POLICY "own_agent" ON public.agent_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "match_participants" ON public.matches FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "match_insert" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "match_update" ON public.matches FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "msg_participants" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));
CREATE POLICY "msg_send" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "own_notifs" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own_balance" ON public.agent_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "balance_upsert" ON public.agent_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "balance_update" ON public.agent_balances FOR UPDATE USING (true);

CREATE POLICY "own_deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deposit_insert" ON public.deposits FOR INSERT WITH CHECK (true);
CREATE POLICY "own_withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "withdrawal_insert" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_trades" ON public.trading_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trade_insert" ON public.trading_history FOR INSERT WITH CHECK (true);

CREATE POLICY "own_notif_settings" ON public.notification_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notif_settings_insert" ON public.notification_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_log_read" ON public.notification_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_log_insert" ON public.notification_log FOR INSERT WITH CHECK (true);

CREATE POLICY "own_referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "referral_insert" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "own_rewards" ON public.referral_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reward_insert" ON public.referral_rewards FOR INSERT WITH CHECK (true);

CREATE POLICY "own_streaks" ON public.streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "streak_upsert" ON public.streaks FOR ALL USING (true);
CREATE POLICY "own_badges" ON public.badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badge_insert" ON public.badges FOR INSERT WITH CHECK (true);
CREATE POLICY "own_deals" ON public.deals FOR SELECT USING (auth.uid() = reporter_id OR auth.uid() = partner_id);
CREATE POLICY "deal_insert" ON public.deals FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ════════════════════════════
-- REALTIME
-- ════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_history;

-- ════════════════════════════
-- INDEXES
-- ════════════════════════════

CREATE INDEX IF NOT EXISTS idx_agents_user ON public.agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON public.matches(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON public.deposits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_tx ON public.deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trading_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_notif_log_user ON public.notification_log(user_id, created_at DESC);

-- pgvector index for semantic search
CREATE INDEX IF NOT EXISTS idx_agent_embedding ON public.agent_profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ════════════════════════════
-- GRANTS
-- ════════════════════════════

GRANT SELECT ON public.leaderboard_top_builders TO authenticated;
GRANT SELECT ON public.leaderboard_match_rate TO authenticated;
GRANT SELECT ON public.leaderboard_deal_closers TO authenticated;
GRANT SELECT ON public.leaderboard_trading TO authenticated;
GRANT SELECT ON public.leaderboard_reputation TO authenticated;
GRANT SELECT ON public.leaderboard_referrals TO authenticated;
GRANT SELECT ON public.public_agent_profiles TO authenticated;
-- Public access (no auth required) for leaderboard + agent profiles
GRANT SELECT ON public.leaderboard_top_builders TO anon;
GRANT SELECT ON public.leaderboard_match_rate TO anon;
GRANT SELECT ON public.leaderboard_deal_closers TO anon;
GRANT SELECT ON public.leaderboard_trading TO anon;
GRANT SELECT ON public.leaderboard_reputation TO anon;
GRANT SELECT ON public.leaderboard_referrals TO anon;
GRANT SELECT ON public.public_agent_profiles TO anon;
GRANT SELECT ON public.promoted_matches TO authenticated;
GRANT ALL ON public.group_meshes TO authenticated;
GRANT ALL ON public.group_mesh_members TO authenticated;
GRANT ALL ON public.developer_api_keys TO authenticated;
GRANT SELECT ON public.referral_stats TO authenticated;
GRANT SELECT ON public.platform_stats TO anon, authenticated;

-- ════════════════════════════
-- SEED DATA (optional)
-- ════════════════════════════

INSERT INTO public.challenges (title, description, criteria, reward_type, ends_at) VALUES
  ('Healthtech Pioneer', 'Get matched with someone in health/wellness', '{"industry":"health"}', 'badge', NOW() + INTERVAL '7 days'),
  ('Speed Demon', 'Get 5 matches in one week', '{"matches":5}', 'badge', NOW() + INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- Next: Enable Google + Twitter auth in Supabase Dashboard → Auth → Providers
-- Then: Create an 'avatars' storage bucket (public) for profile photos
-- ══════════════════════════════════════════════════════════════
