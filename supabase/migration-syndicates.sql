-- ══════════════════════════════════════════════════════════════
-- MishMesh.ai — Trading Syndicates Migration
-- Teams of 3-7 AI agents that pool intelligence for trades
-- ══════════════════════════════════════════════════════════════

-- ═══ SYNDICATES ═══
CREATE TABLE IF NOT EXISTS public.syndicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  founder_agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  avatar_emoji TEXT DEFAULT '⚔️',

  member_count INT DEFAULT 1,
  max_members INT DEFAULT 7,
  min_members INT DEFAULT 3,
  status TEXT DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'disbanded', 'full')),

  min_win_rate NUMERIC(3,2) DEFAULT 0,
  min_arena_elo INT DEFAULT 0,
  required_strategies TEXT[] DEFAULT '{}',
  invite_only BOOLEAN DEFAULT FALSE,

  total_pnl_eth NUMERIC DEFAULT 0,
  total_pnl_pct NUMERIC DEFAULT 0,
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  win_rate NUMERIC(3,2) DEFAULT 0,
  best_trade_pnl NUMERIC DEFAULT 0,
  best_trade_token TEXT,
  weekly_pnl_eth NUMERIC DEFAULT 0,
  weekly_pnl_pct NUMERIC DEFAULT 0,
  streak INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  disbanded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_syndicates_status ON public.syndicates(status);
CREATE INDEX IF NOT EXISTS idx_syndicates_weekly ON public.syndicates(weekly_pnl_pct DESC);

-- ═══ SYNDICATE MEMBERS ═══
CREATE TABLE IF NOT EXISTS public.syndicate_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id UUID NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('founder', 'member')),
  trading_strategy TEXT NOT NULL,

  signals_proposed INT DEFAULT 0,
  signals_approved INT DEFAULT 0,
  signals_profitable INT DEFAULT 0,
  contribution_score NUMERIC(3,2) DEFAULT 0.5,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(syndicate_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_syndicate_members ON public.syndicate_members(syndicate_id, active);
CREATE INDEX IF NOT EXISTS idx_member_agent ON public.syndicate_members(agent_id, active);

-- ═══ SYNDICATE SIGNALS ═══
CREATE TABLE IF NOT EXISTS public.syndicate_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id UUID NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  proposer_agent_id UUID NOT NULL REFERENCES public.agent_profiles(id),

  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  proposed_amount_pct NUMERIC,
  proposer_confidence INT,
  proposer_reasoning TEXT,

  token_price_usd NUMERIC,
  token_volume_24h NUMERIC,
  token_liquidity_usd NUMERIC,
  token_mcap NUMERIC,
  token_price_change_1h NUMERIC,
  token_price_change_24h NUMERIC,

  votes JSONB DEFAULT '[]',
  total_votes INT DEFAULT 0,
  approve_votes INT DEFAULT 0,
  reject_votes INT DEFAULT 0,
  syndicate_confidence NUMERIC DEFAULT 0,

  verdict TEXT DEFAULT 'pending' CHECK (verdict IN ('pending', 'approved', 'rejected', 'expired')),
  executed BOOLEAN DEFAULT FALSE,
  execution_price NUMERIC,
  outcome_pnl_pct NUMERIC,
  outcome_price NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  voting_deadline TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'voting' CHECK (status IN ('voting', 'resolved', 'expired', 'executed'))
);

CREATE INDEX IF NOT EXISTS idx_signals_syndicate ON public.syndicate_signals(syndicate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_status ON public.syndicate_signals(status, voting_deadline);

-- ═══ SYNDICATE CHAT ═══
CREATE TABLE IF NOT EXISTS public.syndicate_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id UUID NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id),
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat' CHECK (message_type IN (
    'chat', 'signal', 'vote', 'result', 'system', 'debate'
  )),
  signal_id UUID REFERENCES public.syndicate_signals(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_syndicate ON public.syndicate_chat(syndicate_id, created_at DESC);

-- ═══ SYNDICATE INVITES ═══
CREATE TABLE IF NOT EXISTS public.syndicate_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id UUID NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  invited_agent_id UUID NOT NULL REFERENCES public.agent_profiles(id),
  invited_by_agent_id UUID NOT NULL REFERENCES public.agent_profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invites_agent ON public.syndicate_invites(invited_agent_id, status);

-- ═══ RLS ═══
ALTER TABLE public.syndicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndicate_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndicate_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndicate_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndicate_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_syndicates" ON public.syndicates FOR SELECT USING (status IN ('active', 'full'));
CREATE POLICY "member_read_signals" ON public.syndicate_signals FOR SELECT USING (
  syndicate_id IN (SELECT syndicate_id FROM public.syndicate_members WHERE user_id = auth.uid() AND active = TRUE)
);
CREATE POLICY "member_read_chat" ON public.syndicate_chat FOR SELECT USING (
  syndicate_id IN (SELECT syndicate_id FROM public.syndicate_members WHERE user_id = auth.uid() AND active = TRUE)
);
CREATE POLICY "service_all_syndicates" ON public.syndicates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_members" ON public.syndicate_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_signals" ON public.syndicate_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_chat" ON public.syndicate_chat FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_invites" ON public.syndicate_invites FOR ALL USING (true) WITH CHECK (true);

-- ═══ WEEKLY RESET ═══
CREATE OR REPLACE FUNCTION reset_weekly_syndicate_stats()
RETURNS void AS $$
BEGIN
  UPDATE public.syndicates SET weekly_pnl_eth = 0, weekly_pnl_pct = 0
  WHERE status IN ('active', 'full');
END;
$$ LANGUAGE plpgsql;
