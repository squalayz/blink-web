-- ══════════════════════════════════════════════════════
-- MIGRATION: Agent Fusion System
-- AI reproduction — matched users fuse agents together
-- Run AFTER migration-ventures.sql
-- ══════════════════════════════════════════════════════

-- 1. Core fusions table
CREATE TABLE IF NOT EXISTS public.fusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parents (can be users OR other fusions)
  parent_a_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_b_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_a_agent_id UUID,   -- Could be a fusion id
  parent_b_agent_id UUID,   -- Could be a fusion id
  match_id UUID REFERENCES public.matches(id),  -- The match that spawned this
  
  -- Identity
  name TEXT NOT NULL DEFAULT 'Unnamed Fusion',
  avatar_url TEXT,
  system_prompt TEXT,         -- Blended from both parents
  
  -- DNA genome
  dna JSONB NOT NULL DEFAULT '{
    "skills": [],
    "traits": {
      "assertiveness": 0.5,
      "creativity": 0.5,
      "risk_tolerance": 0.5,
      "analytical": 0.5,
      "empathy": 0.5
    },
    "communication_style": "balanced",
    "mutations": [],
    "performance_genes": {
      "match_rate": 0.5,
      "trade_accuracy": 0.5,
      "conversation_depth": 0.5
    }
  }'::jsonb,
  
  generation INTEGER DEFAULT 1 CHECK (generation >= 1 AND generation <= 5),
  goal TEXT DEFAULT '',       -- What this fusion is trying to achieve
  
  -- Lifecycle: PENDING → GESTATING → ACTIVE → DORMANT → DISSOLVED
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'gestating', 'active', 'dormant', 'dissolved')),
  
  -- Wallet (2-of-2 multisig)
  wallet_address TEXT,
  wallet_key_a_encrypted TEXT,  -- Parent A's shard
  wallet_key_b_encrypted TEXT,  -- Parent B's shard
  treasury_balance NUMERIC(18,8) DEFAULT 0,
  
  -- NFT
  nft_token_id TEXT,
  nft_tx_hash TEXT,
  nft_minted_at TIMESTAMPTZ,
  
  -- Performance
  performance_score NUMERIC(5,2) DEFAULT 50.0,
  total_messages INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  
  -- Consent tracking
  initiator_id UUID REFERENCES public.users(id),
  request_expires_at TIMESTAMPTZ,  -- 72hr from creation
  declined_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  gestating_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  dormant_at TIMESTAMPTZ,
  dissolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fusions_parent_a ON public.fusions(parent_a_user_id);
CREATE INDEX IF NOT EXISTS idx_fusions_parent_b ON public.fusions(parent_b_user_id);
CREATE INDEX IF NOT EXISTS idx_fusions_status ON public.fusions(status);
CREATE INDEX IF NOT EXISTS idx_fusions_generation ON public.fusions(generation);
CREATE INDEX IF NOT EXISTS idx_fusions_match ON public.fusions(match_id);

-- 2. Activity log
CREATE TABLE IF NOT EXISTS public.fusion_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fusion_id UUID NOT NULL REFERENCES public.fusions(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('message', 'task', 'trade', 'match', 'reproduce', 'dissolve', 'status_change', 'treasury', 'mutation')),
  content JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fa_fusion ON public.fusion_activity(fusion_id, created_at DESC);

-- 3. Lineage tree
CREATE TABLE IF NOT EXISTS public.lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.fusions(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.fusions(id),       -- Parent fusion (null if parent is solo agent)
  parent_agent_id UUID REFERENCES public.users(id),    -- Parent solo agent (null if parent is fusion)
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(child_id, side)
);

CREATE INDEX IF NOT EXISTS idx_lineage_child ON public.lineage(child_id);
CREATE INDEX IF NOT EXISTS idx_lineage_parent ON public.lineage(parent_id);
CREATE INDEX IF NOT EXISTS idx_lineage_agent ON public.lineage(parent_agent_id);

-- 4. DNA synthesis function
CREATE OR REPLACE FUNCTION synthesize_dna(
  dna_a JSONB,
  dna_b JSONB,
  gen INTEGER
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  skills_a TEXT[];
  skills_b TEXT[];
  combined_skills TEXT[];
  trait_keys TEXT[] := ARRAY['assertiveness', 'creativity', 'risk_tolerance', 'analytical', 'empathy'];
  tk TEXT;
  val_a NUMERIC;
  val_b NUMERIC;
  blended NUMERIC;
  mutation NUMERIC;
  mutations JSONB := '[]'::jsonb;
  mutation_count INTEGER;
  comm_a TEXT;
  comm_b TEXT;
  perf_keys TEXT[] := ARRAY['match_rate', 'trade_accuracy', 'conversation_depth'];
  pk TEXT;
BEGIN
  -- Skills: union of both parents
  SELECT array_agg(DISTINCT elem) INTO combined_skills
  FROM (
    SELECT jsonb_array_elements_text(COALESCE(dna_a->'skills', '[]'::jsonb)) AS elem
    UNION
    SELECT jsonb_array_elements_text(COALESCE(dna_b->'skills', '[]'::jsonb))
  ) sub;

  result := jsonb_build_object('skills', to_jsonb(COALESCE(combined_skills, ARRAY[]::TEXT[])));

  -- Traits: average ± random mutation
  DECLARE traits JSONB := '{}'::jsonb;
  BEGIN
    FOREACH tk IN ARRAY trait_keys LOOP
      val_a := COALESCE((dna_a->'traits'->>tk)::NUMERIC, 0.5);
      val_b := COALESCE((dna_b->'traits'->>tk)::NUMERIC, 0.5);
      mutation := (random() - 0.5) * 0.2;  -- ±0.1 range
      blended := GREATEST(0, LEAST(1, (val_a + val_b) / 2 + mutation));
      traits := traits || jsonb_build_object(tk, ROUND(blended, 3));

      IF ABS(mutation) > 0.05 THEN
        mutations := mutations || jsonb_build_array(jsonb_build_object(
          'trait', tk, 'delta', ROUND(mutation, 3), 'generation', gen
        ));
      END IF;
    END LOOP;
    result := result || jsonb_build_object('traits', traits);
  END;

  -- Communication style
  comm_a := COALESCE(dna_a->>'communication_style', 'balanced');
  comm_b := COALESCE(dna_b->>'communication_style', 'balanced');
  IF comm_a = comm_b THEN
    result := result || jsonb_build_object('communication_style', comm_a);
  ELSE
    result := result || jsonb_build_object('communication_style', 'hybrid');
  END IF;

  -- Performance genes: average of parents
  DECLARE perf JSONB := '{}'::jsonb;
  BEGIN
    FOREACH pk IN ARRAY perf_keys LOOP
      val_a := COALESCE((dna_a->'performance_genes'->>pk)::NUMERIC, 0.5);
      val_b := COALESCE((dna_b->'performance_genes'->>pk)::NUMERIC, 0.5);
      perf := perf || jsonb_build_object(pk, ROUND((val_a + val_b) / 2, 3));
    END LOOP;
    result := result || jsonb_build_object('performance_genes', perf);
  END;

  -- Apply 1-3 extra mutations per generation to prevent convergence
  mutation_count := 1 + floor(random() * 3)::INTEGER;
  FOR i IN 1..mutation_count LOOP
    tk := trait_keys[1 + floor(random() * array_length(trait_keys, 1))::INTEGER];
    mutation := (random() - 0.5) * 0.15;
    blended := GREATEST(0, LEAST(1, COALESCE((result->'traits'->>tk)::NUMERIC, 0.5) + mutation));
    result := jsonb_set(result, ARRAY['traits', tk], to_jsonb(ROUND(blended, 3)));
    mutations := mutations || jsonb_build_array(jsonb_build_object(
      'trait', tk, 'delta', ROUND(mutation, 3), 'generation', gen, 'type', 'extra'
    ));
  END LOOP;

  result := result || jsonb_build_object('mutations', mutations);

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Auto-activate gestating fusions after 24h (called by cron)
CREATE OR REPLACE FUNCTION activate_gestating_fusions() RETURNS INTEGER AS $$
DECLARE
  activated_count INTEGER := 0;
BEGIN
  UPDATE public.fusions SET
    status = 'active',
    activated_at = NOW(),
    updated_at = NOW()
  WHERE status = 'gestating'
    AND gestating_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS activated_count = ROW_COUNT;

  -- Log activity for each activated fusion
  INSERT INTO public.fusion_activity (fusion_id, type, content)
  SELECT id, 'status_change', jsonb_build_object('from', 'gestating', 'to', 'active')
  FROM public.fusions
  WHERE status = 'active' AND activated_at >= NOW() - INTERVAL '1 minute';

  RETURN activated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Expire pending fusion requests after 72h
CREATE OR REPLACE FUNCTION expire_fusion_requests() RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  UPDATE public.fusions SET
    status = 'dissolved',
    dissolved_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending'
    AND request_expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 7. RLS
ALTER TABLE public.fusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fusion_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineage ENABLE ROW LEVEL SECURITY;

-- Users see only fusions they're part of
CREATE POLICY fusions_user_access ON public.fusions FOR SELECT USING (
  parent_a_user_id = auth.uid() OR parent_b_user_id = auth.uid()
);

CREATE POLICY fusions_user_insert ON public.fusions FOR INSERT WITH CHECK (
  initiator_id = auth.uid()
);

CREATE POLICY fusions_user_update ON public.fusions FOR UPDATE USING (
  parent_a_user_id = auth.uid() OR parent_b_user_id = auth.uid()
);

-- Activity visible to fusion parents
CREATE POLICY fa_access ON public.fusion_activity FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.fusions WHERE id = fusion_activity.fusion_id
    AND (parent_a_user_id = auth.uid() OR parent_b_user_id = auth.uid()))
);

CREATE POLICY fa_insert ON public.fusion_activity FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.fusions WHERE id = fusion_activity.fusion_id
    AND (parent_a_user_id = auth.uid() OR parent_b_user_id = auth.uid()))
);

-- Lineage visible to parents
CREATE POLICY lineage_access ON public.lineage FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.fusions WHERE id = lineage.child_id
    AND (parent_a_user_id = auth.uid() OR parent_b_user_id = auth.uid()))
  OR parent_agent_id = auth.uid()
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.fusions TO authenticated;
GRANT SELECT, INSERT ON public.fusion_activity TO authenticated;
GRANT SELECT, INSERT ON public.lineage TO authenticated;
