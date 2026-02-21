-- ══════════════════════════════════════════════════════
-- MIGRATION: Viral Mechanics
-- Run AFTER migration-ux-optimization.sql
-- ══════════════════════════════════════════════════════

-- 1. Streak system
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_checkin DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_badge TEXT;  -- 'dedicated_builder' etc.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false;

-- 2. Agent voice messages (dashboard personality)
CREATE TABLE IF NOT EXISTS public.agent_voice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'insight' CHECK (message_type IN ('insight', 'trade', 'nudge', 'greeting', 'weekly', 'milestone', 'exit')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_voice_user ON public.agent_voice(user_id, created_at DESC);

-- 3. Personalized invites
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT LEFT(uuid_generate_v4()::text, 12),
  invitee_name TEXT DEFAULT '',          -- Who they're inviting
  agent_message TEXT DEFAULT '',          -- AI-generated personalized invite
  claimed_by UUID REFERENCES public.users(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(invite_code);

-- 4. Seasonal events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- 'Mesh Madness', 'Speed Date Night', etc.
  event_type TEXT NOT NULL CHECK (event_type IN ('mesh_madness', 'speed_date', 'industry_clash', 'the_purge', 'custom')),
  description TEXT DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,      -- multipliers, rules, etc.
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Match stories (auto-generated after 5+ messages)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS story_generated BOOLEAN DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS story_text TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS story_public BOOLEAN DEFAULT false;  -- user opted in to share
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS card_image_url TEXT;  -- generated match card
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS nft_token_id TEXT;    -- if minted
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS nft_minted_at TIMESTAMPTZ;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS nft_tx_hash TEXT;

-- 6. Streak check-in function
CREATE OR REPLACE FUNCTION checkin_streak(uid UUID) RETURNS JSONB AS $$
DECLARE
  user_row RECORD;
  new_streak INTEGER;
  streak_broken BOOLEAN := false;
BEGIN
  SELECT current_streak, longest_streak, last_checkin INTO user_row
    FROM public.users WHERE id = uid;

  IF user_row.last_checkin IS NULL OR user_row.last_checkin < CURRENT_DATE - 1 THEN
    new_streak := 1;  -- Reset
    streak_broken := user_row.last_checkin IS NOT NULL AND user_row.last_checkin < CURRENT_DATE - 1;
  ELSIF user_row.last_checkin = CURRENT_DATE THEN
    RETURN jsonb_build_object('streak', user_row.current_streak, 'already_checked_in', true);
  ELSE
    new_streak := user_row.current_streak + 1;
  END IF;

  UPDATE public.users SET
    current_streak = new_streak,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), new_streak),
    last_checkin = CURRENT_DATE,
    streak_badge = CASE
      WHEN new_streak >= 30 THEN 'dedicated_builder'
      WHEN new_streak >= 7 THEN 'consistent'
      ELSE streak_badge
    END
  WHERE id = uid;

  -- Auto-grant free boost at 7-day streak
  IF new_streak = 7 THEN
    INSERT INTO public.notifications (user_id, type, message, metadata)
    VALUES (uid, 'streak_reward', '🔥 7-day streak! Free boost applied.', '{"reward":"free_boost"}'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'streak', new_streak,
    'longest', GREATEST(COALESCE(user_row.longest_streak, 0), new_streak),
    'broken', streak_broken,
    'reward', CASE WHEN new_streak = 7 THEN 'free_boost' WHEN new_streak = 30 THEN 'badge' ELSE null END
  );
END;
$$ LANGUAGE plpgsql;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.agent_voice TO authenticated;
GRANT SELECT, INSERT ON public.invites TO authenticated;
GRANT SELECT ON public.events TO authenticated, anon;
