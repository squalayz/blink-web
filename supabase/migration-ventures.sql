-- ══════════════════════════════════════════════════════
-- MIGRATION: The Venture System
-- Agents assemble teams and create ventures autonomously
-- Run AFTER migration-viral-mechanics.sql
-- ══════════════════════════════════════════════════════

-- 1. Core ventures table
CREATE TABLE IF NOT EXISTS public.ventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,              -- User's original idea (1 paragraph)
  
  -- AI-generated business plan
  business_plan JSONB DEFAULT '{}'::jsonb,
  -- Structure: { problem, solution, why_this_team, revenue_model, roadmap_90d, estimated_costs }

  founder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Status lifecycle: drafting → assembling → reviewing → active → funded → building → completed → archived
  status TEXT DEFAULT 'drafting' CHECK (status IN (
    'drafting', 'assembling', 'reviewing', 'active', 'funded', 'building', 'completed', 'archived'
  )),

  -- Assembly config (AI-determined roles)
  roles_needed JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ role: "Mobile Developer", skills: ["React Native"], filled: false, locked_user_id: null }]

  -- Team metrics
  team_synergy_score NUMERIC(5,2) DEFAULT 0,
  team_size INTEGER DEFAULT 0,

  -- Venture wallet (auto-generated on creation)
  wallet_address TEXT UNIQUE,
  wallet_encrypted_key TEXT,

  -- Funding
  total_funded_eth NUMERIC(18,8) DEFAULT 0,
  funding_goal_eth NUMERIC(18,8),
  
  -- Fees
  creation_fee_paid BOOLEAN DEFAULT false,  -- 0.01 ETH
  
  -- Metadata
  industry TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assembled_at TIMESTAMPTZ,               -- When full team locked in
  funded_at TIMESTAMPTZ                    -- When funding goal reached
);

CREATE INDEX IF NOT EXISTS idx_ventures_founder ON public.ventures(founder_id);
CREATE INDEX IF NOT EXISTS idx_ventures_status ON public.ventures(status);
CREATE INDEX IF NOT EXISTS idx_ventures_industry ON public.ventures(industry);

-- 2. Team members
CREATE TABLE IF NOT EXISTS public.venture_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL,                     -- "Mobile Developer", "Growth Marketer", etc.
  role_index INTEGER DEFAULT 0,           -- Position in roles_needed array
  fit_score INTEGER DEFAULT 0,            -- 0-100 compatibility with venture
  
  -- Member status
  status TEXT DEFAULT 'invited' CHECK (status IN ('candidate', 'locked', 'invited', 'accepted', 'declined', 'left')),
  
  -- Their agent's contribution to business plan
  plan_section TEXT,                       -- Which section they write
  plan_content TEXT,                       -- Their agent's contribution
  
  -- Equity / revenue share
  equity_pct NUMERIC(5,2) DEFAULT 0,      -- % of venture revenue

  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(venture_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_vm_venture ON public.venture_members(venture_id);
CREATE INDEX IF NOT EXISTS idx_vm_user ON public.venture_members(user_id);

-- 3. Investments
CREATE TABLE IF NOT EXISTS public.venture_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  amount_eth NUMERIC(18,8) NOT NULL,
  equity_pct NUMERIC(5,4) DEFAULT 0,      -- Calculated based on total pool
  
  -- On-chain tracking
  tx_hash TEXT,
  block_number BIGINT,
  
  -- Platform fee (10%)
  platform_fee_eth NUMERIC(18,8) DEFAULT 0,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'refunded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vi_venture ON public.venture_investments(venture_id);
CREATE INDEX IF NOT EXISTS idx_vi_investor ON public.venture_investments(investor_id);

-- 4. Venture team chat (separate from 1:1 match chat)
CREATE TABLE IF NOT EXISTS public.venture_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'agent', 'plan_update', 'investment')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vmsg_venture ON public.venture_messages(venture_id, created_at DESC);

-- 5. Assembly candidates (agents being evaluated for roles)
CREATE TABLE IF NOT EXISTS public.venture_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  role_index INTEGER NOT NULL,            -- Which role they're being considered for
  
  fit_score INTEGER DEFAULT 0,
  reasoning TEXT,                          -- Why agent thinks they fit
  
  status TEXT DEFAULT 'evaluating' CHECK (status IN ('evaluating', 'proposed', 'locked', 'passed', 'rejected')),
  
  proposed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(venture_id, user_id, role_index)
);

-- 6. Revenue distribution tracking
CREATE TABLE IF NOT EXISTS public.venture_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  
  amount_eth NUMERIC(18,8) NOT NULL,
  source TEXT DEFAULT 'manual',           -- 'manual', 'smart_contract', 'platform'
  
  -- Distribution snapshot
  distributions JSONB DEFAULT '[]'::jsonb,
  -- [{ user_id, equity_pct, amount_eth, tx_hash }]
  
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Auto-update team size + synergy
CREATE OR REPLACE FUNCTION update_venture_team_stats() RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
  avg_fit NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(fit_score), 0)
    INTO member_count, avg_fit
    FROM public.venture_members
    WHERE venture_id = COALESCE(NEW.venture_id, OLD.venture_id)
      AND status IN ('locked', 'accepted');

  UPDATE public.ventures SET
    team_size = member_count,
    team_synergy_score = ROUND(avg_fit, 2),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.venture_id, OLD.venture_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venture_team_stats ON public.venture_members;
CREATE TRIGGER trg_venture_team_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.venture_members
  FOR EACH ROW EXECUTE FUNCTION update_venture_team_stats();

-- 8. Auto-update total funded
CREATE OR REPLACE FUNCTION update_venture_funding() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ventures SET
    total_funded_eth = (
      SELECT COALESCE(SUM(amount_eth), 0)
      FROM public.venture_investments
      WHERE venture_id = NEW.venture_id AND status = 'confirmed'
    ),
    updated_at = NOW()
  WHERE id = NEW.venture_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venture_funding ON public.venture_investments;
CREATE TRIGGER trg_venture_funding
  AFTER INSERT OR UPDATE ON public.venture_investments
  FOR EACH ROW EXECUTE FUNCTION update_venture_funding();

-- 9. RLS policies
ALTER TABLE public.ventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_messages ENABLE ROW LEVEL SECURITY;

-- Public ventures are visible to all
CREATE POLICY ventures_read ON public.ventures FOR SELECT USING (
  is_public = true OR founder_id = auth.uid() OR
  EXISTS(SELECT 1 FROM public.venture_members WHERE venture_id = id AND user_id = auth.uid())
);

-- Members can read their venture's messages
CREATE POLICY vmsg_read ON public.venture_messages FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.venture_members WHERE venture_id = venture_messages.venture_id AND user_id = auth.uid() AND status IN ('locked', 'accepted'))
  OR EXISTS(SELECT 1 FROM public.ventures WHERE id = venture_messages.venture_id AND founder_id = auth.uid())
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.ventures TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.venture_members TO authenticated;
GRANT SELECT, INSERT ON public.venture_investments TO authenticated;
GRANT SELECT, INSERT ON public.venture_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.venture_candidates TO authenticated;
GRANT SELECT, INSERT ON public.venture_revenue TO authenticated;
