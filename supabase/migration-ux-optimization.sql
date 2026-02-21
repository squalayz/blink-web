-- ══════════════════════════════════════════════════════
-- MIGRATION: UX Optimization Systems
-- Run AFTER migration-wallet-auth.sql
-- ══════════════════════════════════════════════════════

-- 1. Progressive disclosure — unlock levels
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS unlock_level INTEGER DEFAULT 0;
-- Level 0: Fresh (just onboarded)
-- Level 1: First match received
-- Level 2: First funded trade
-- Level 3: 5+ matches (leaderboard + reputation unlocked)
-- Level 4: 10+ matches (NFT minting unlocked)
-- Level 5: Pro tier (all features)

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS warmup_complete BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_match_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sounds_enabled BOOLEAN DEFAULT false;

-- 2. Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  -- Frequency
  frequency TEXT DEFAULT 'smart' CHECK (frequency IN ('realtime', 'daily', 'weekly', 'critical')),
  -- Channels
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  telegram_enabled BOOLEAN DEFAULT false,
  -- Categories (which events trigger notifications)
  notify_matches BOOLEAN DEFAULT true,
  notify_messages BOOLEAN DEFAULT true,
  notify_low_balance BOOLEAN DEFAULT true,
  notify_trades BOOLEAN DEFAULT true,
  notify_leaderboard BOOLEAN DEFAULT false,
  notify_mesh_growth BOOLEAN DEFAULT false,
  -- Smart batching
  last_digest_sent TIMESTAMPTZ DEFAULT NOW(),
  first_week_boost BOOLEAN DEFAULT true,  -- More frequent in first week
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dead match revival tracking
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_nudge_at TIMESTAMPTZ;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS nudge_count INTEGER DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'archived'));
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS collab_idea TEXT;  -- Agent-generated collab suggestion for dead matches

-- 4. API key health tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_key_status TEXT DEFAULT 'unknown' CHECK (api_key_status IN ('healthy', 'failing', 'expired', 'unknown'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_key_last_check TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_key_error TEXT;

-- 5. Warm-up feed (simulated agent activity for new users)
CREATE TABLE IF NOT EXISTS public.warmup_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('scanning', 'analyzing', 'found_potential', 'initiating', 'conversation', 'match_found')),
  target_name TEXT DEFAULT '',         -- "Scanning @devmark..."
  detail TEXT DEFAULT '',              -- Extra context
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warmup_user ON public.warmup_events(user_id, created_at DESC);

-- 6. Social share tracking
CREATE TABLE IF NOT EXISTS public.share_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('match', 'leaderboard', 'profile', 'nft', 'trade')),
  target_id TEXT,                      -- match_id, nft_id, etc.
  platform TEXT DEFAULT 'twitter',     -- Where shared
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Auto-create notification_preferences for new users
CREATE OR REPLACE FUNCTION create_notification_prefs() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_notif_prefs ON public.users;
CREATE TRIGGER trg_create_notif_prefs
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION create_notification_prefs();

-- 8. Unlock level auto-update function
CREATE OR REPLACE FUNCTION update_unlock_level() RETURNS TRIGGER AS $$
DECLARE
  match_count INTEGER;
  has_trade BOOLEAN;
  user_tier TEXT;
BEGIN
  SELECT COUNT(*) INTO match_count FROM public.matches
    WHERE (user_a = NEW.user_a OR user_b = NEW.user_a) AND score >= 70;
  SELECT tier INTO user_tier FROM public.users WHERE id = NEW.user_a;
  SELECT EXISTS(SELECT 1 FROM public.trading_history WHERE user_id = NEW.user_a) INTO has_trade;

  UPDATE public.users SET
    unlock_level = CASE
      WHEN user_tier IN ('pro', 'business') THEN 5
      WHEN match_count >= 10 THEN 4
      WHEN match_count >= 5 THEN 3
      WHEN has_trade THEN 2
      WHEN match_count >= 1 THEN 1
      ELSE 0
    END,
    first_match_at = CASE WHEN first_match_at IS NULL AND match_count >= 1 THEN NOW() ELSE first_match_at END
  WHERE id = NEW.user_a;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_unlock ON public.matches;
CREATE TRIGGER trg_update_unlock
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION update_unlock_level();

-- Grants
GRANT SELECT, INSERT ON public.warmup_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT ON public.share_events TO authenticated;
