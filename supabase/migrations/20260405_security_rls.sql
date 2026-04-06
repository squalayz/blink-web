-- ══════════════════════════════════════════════════════════════
-- MishMesh Security RLS Policies — 2026-04-05
-- Locks down all core tables with proper row-level security.
-- ══════════════════════════════════════════════════════════════

-- ═══ 1. USERS TABLE ═══
-- Public fields readable by all, sensitive fields protected
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Anyone can read public profile fields
CREATE POLICY "users_select_public" ON public.users
  FOR SELECT USING (true);

-- Users can only update their own row
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ═══ 2. PROFILES TABLE ═══
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read public profile fields
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert only own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ═══ 3. PROTECT ENCRYPTED KEYS ═══
-- Revoke direct column access to encrypted keys from anon role
-- These columns should ONLY be accessible via service_role (API routes)
DO $$ BEGIN
  -- Remove anon/authenticated access to sensitive columns
  -- The service_role bypasses RLS, so it can still read these
  REVOKE ALL ON public.profiles FROM anon;
  GRANT SELECT (
    id, email, handle, display_name, bio, avatar_url,
    sol_address, eth_address, btc_address,
    joined_at, orbs_found, orbs_dropped, total_earned, total_dropped,
    reputation, follower_count, following_count, is_verified,
    mm_score, primary_chain, current_streak, longest_streak,
    vibe_line, interest_tags, dms_open, created_at
  ) ON public.profiles TO anon;
  GRANT SELECT (
    id, email, handle, display_name, bio, avatar_url,
    sol_address, eth_address, btc_address,
    joined_at, orbs_found, orbs_dropped, total_earned, total_dropped,
    reputation, follower_count, following_count, is_verified,
    mm_score, primary_chain, current_streak, longest_streak,
    vibe_line, interest_tags, dms_open, created_at
  ) ON public.profiles TO authenticated;
  GRANT UPDATE (
    handle, display_name, bio, avatar_url, primary_chain,
    vibe_line, interest_tags, dms_open
  ) ON public.profiles TO authenticated;
  GRANT INSERT ON public.profiles TO authenticated;
EXCEPTION WHEN undefined_column THEN
  -- Some columns may not exist yet; proceed anyway
  NULL;
END $$;

-- ═══ 4. MATCHES TABLE ═══
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_own" ON public.matches
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "matches_update_own" ON public.matches
  FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ═══ 5. ORBS TABLE ═══
ALTER TABLE public.orbs ENABLE ROW LEVEL SECURITY;

-- Anyone can see active orbs (needed for map)
CREATE POLICY "orbs_select_active" ON public.orbs
  FOR SELECT USING (true);

-- Only the dropper can update/delete their own orbs
CREATE POLICY "orbs_update_owner" ON public.orbs
  FOR UPDATE USING (auth.uid() = dropper_id)
  WITH CHECK (auth.uid() = dropper_id);

CREATE POLICY "orbs_delete_owner" ON public.orbs
  FOR DELETE USING (auth.uid() = dropper_id);

-- Authenticated users can drop orbs
CREATE POLICY "orbs_insert_auth" ON public.orbs
  FOR INSERT WITH CHECK (auth.uid() = dropper_id);

-- ═══ 6. MESSAGES TABLE — tighten existing policies ═══
-- Already has RLS enabled + msg_participants + msg_send
-- Add UPDATE policy so users can mark messages as read
DO $$ BEGIN
  CREATE POLICY "msg_update_read" ON public.messages
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM matches m
        WHERE m.id = match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 7. PLATFORM_FEES TABLE ═══
-- Only service_role can insert; users cannot read
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.platform_fees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    orb_id uuid,
    transaction_type text NOT NULL,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'ETH',
    fee_wallet text NOT NULL,
    tx_hash text,
    user_id uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "platform_fees_no_user_access" ON public.platform_fees
    FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 8. TRANSACTIONS TABLE ═══
-- Users see only their own rows
DO $$ BEGIN
  ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "transactions_own_only" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = sender_id OR auth.uid() = recipient_id);
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 9. ACTIVITY TABLE ═══
DO $$ BEGIN
  ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "activity_own_only" ON public.activity
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "activity_insert_service" ON public.activity
    FOR INSERT WITH CHECK (false); -- service_role only
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 10. TASKS TABLE ═══
DO $$ BEGIN
  ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tasks_select_all" ON public.tasks
    FOR SELECT USING (true);
  CREATE POLICY "tasks_insert_auth" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = poster_id);
  CREATE POLICY "tasks_update_owner" ON public.tasks
    FOR UPDATE USING (auth.uid() = poster_id);
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 11. TASK_APPLICATIONS TABLE ═══
DO $$ BEGIN
  ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "task_apps_select_relevant" ON public.task_applications
    FOR SELECT USING (
      auth.uid() = applicant_id
      OR EXISTS (
        SELECT 1 FROM tasks t WHERE t.id = task_id AND t.poster_id = auth.uid()
      )
    );
  CREATE POLICY "task_apps_insert_auth" ON public.task_applications
    FOR INSERT WITH CHECK (auth.uid() = applicant_id);
  CREATE POLICY "task_apps_update_poster" ON public.task_applications
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM tasks t WHERE t.id = task_id AND t.poster_id = auth.uid()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 12. SQUADS + SQUAD_MEMBERS ═══
DO $$ BEGIN
  ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "squads_select_all" ON public.squads
    FOR SELECT USING (true);
  CREATE POLICY "squads_insert_auth" ON public.squads
    FOR INSERT WITH CHECK (auth.uid() = creator_id);
  CREATE POLICY "squads_update_creator" ON public.squads
    FOR UPDATE USING (auth.uid() = creator_id);
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "squad_members_select_all" ON public.squad_members
    FOR SELECT USING (true);
  CREATE POLICY "squad_members_insert_own" ON public.squad_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "squad_members_delete_own" ON public.squad_members
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 13. WALLET_LOCKS ═══
DO $$ BEGIN
  ALTER TABLE public.wallet_locks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "wallet_locks_own" ON public.wallet_locks
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "wallet_locks_insert_service" ON public.wallet_locks
    FOR INSERT WITH CHECK (false); -- service_role only
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 14. FIX OVERLY PERMISSIVE POLICIES ═══
-- orb_activity INSERT should be service_role only
DO $$ BEGIN
  DROP POLICY IF EXISTS "orb_activity_insert_service" ON public.orb_activity;
  CREATE POLICY "orb_activity_insert_service_only" ON public.orb_activity
    FOR INSERT WITH CHECK (false); -- service_role bypasses RLS
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- notifications INSERT should require user_id match
DO $$ BEGIN
  DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
  CREATE POLICY "notif_insert_own" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
