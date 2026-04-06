-- ============================================================
-- RLS Security Fix — Enable RLS on all unprotected tables
-- and add appropriate policies
-- ============================================================

-- ── ENABLE RLS ──────────────────────────────────────────────
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_voice ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_mesh_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_meshes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoted_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE siwe_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE venture_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE venture_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_orb_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_claims ENABLE ROW LEVEL SECURITY;

-- ── POLICIES ────────────────────────────────────────────────

-- agent_conversations: owner only
CREATE POLICY "agent_conversations_owner" ON agent_conversations
  FOR ALL USING (auth.uid() = user_id);

-- agent_reports: owner only
CREATE POLICY "agent_reports_owner" ON agent_reports
  FOR ALL USING (auth.uid() = user_id);

-- agent_voice: owner only
CREATE POLICY "agent_voice_owner" ON agent_voice
  FOR ALL USING (auth.uid() = user_id);

-- challenge_progress: owner only
CREATE POLICY "challenge_progress_owner" ON challenge_progress
  FOR ALL USING (auth.uid() = user_id);

-- challenges: public read, service role write
CREATE POLICY "challenges_public_read" ON challenges
  FOR SELECT USING (true);

-- debug_log: service role only (no user access)
CREATE POLICY "debug_log_service_only" ON debug_log
  FOR ALL USING (false);

-- deposit_tracking: owner only
CREATE POLICY "deposit_tracking_owner" ON deposit_tracking
  FOR ALL USING (auth.uid() = user_id);

-- developer_api_keys: owner only (CRITICAL — private keys)
CREATE POLICY "developer_api_keys_owner" ON developer_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- events: public read
CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (true);

-- group_mesh_members: members of that group
CREATE POLICY "group_mesh_members_read" ON group_mesh_members
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "group_mesh_members_write" ON group_mesh_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- group_meshes: public read
CREATE POLICY "group_meshes_public_read" ON group_meshes
  FOR SELECT USING (true);
CREATE POLICY "group_meshes_owner_write" ON group_meshes
  FOR ALL USING (auth.uid() = owner_id);

-- invites: owner only
CREATE POLICY "invites_owner" ON invites
  FOR ALL USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- notification_preferences: owner only
CREATE POLICY "notification_preferences_owner" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- pending_payouts: owner can see their own (CRITICAL — financial)
CREATE POLICY "pending_payouts_owner_read" ON pending_payouts
  FOR SELECT USING (auth.uid() = hunter_user_id);

-- platform_revenue_share: service role only
CREATE POLICY "platform_revenue_share_no_access" ON platform_revenue_share
  FOR ALL USING (false);

-- promoted_matches: owner only
CREATE POLICY "promoted_matches_owner" ON promoted_matches
  FOR ALL USING (auth.uid() = user_id);

-- public_feed: public read, owner write
CREATE POLICY "public_feed_read" ON public_feed
  FOR SELECT USING (true);
CREATE POLICY "public_feed_write" ON public_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- push_notifications: owner only
CREATE POLICY "push_notifications_owner" ON push_notifications
  FOR ALL USING (auth.uid() = user_id);

-- share_cards: public read
CREATE POLICY "share_cards_public_read" ON share_cards
  FOR SELECT USING (true);

-- share_events: owner only
CREATE POLICY "share_events_owner" ON share_events
  FOR ALL USING (auth.uid() = user_id);

-- siwe_nonces: owner only (CRITICAL — auth nonces)
CREATE POLICY "siwe_nonces_owner" ON siwe_nonces
  FOR ALL USING (auth.uid() = user_id);

-- tier_payments: owner only
CREATE POLICY "tier_payments_owner" ON tier_payments
  FOR ALL USING (auth.uid() = user_id);

-- venture_candidates: owner only
CREATE POLICY "venture_candidates_owner" ON venture_candidates
  FOR ALL USING (auth.uid() = user_id);

-- venture_revenue: service role only
CREATE POLICY "venture_revenue_no_access" ON venture_revenue
  FOR ALL USING (false);

-- waitlist: insert only (public signup), no read
CREATE POLICY "waitlist_insert" ON waitlist
  FOR INSERT WITH CHECK (true);

-- warmup_events: owner only
CREATE POLICY "warmup_events_owner" ON warmup_events
  FOR ALL USING (auth.uid() = user_id);

-- world_orb_events: public read
CREATE POLICY "world_orb_events_public_read" ON world_orb_events
  FOR SELECT USING (true);

-- zone_claims: owner only
CREATE POLICY "zone_claims_owner" ON zone_claims
  FOR ALL USING (auth.uid() = user_id);
