-- ══════════════════════════════════════════════════════════════
-- MishMesh.ai V18 — Agent Mind System
-- The personality engine: memories, quirks, moods, evolution
-- ══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

-- ═══ 1. EXTEND agent_profiles WITH SOUL DATA ═══
ALTER TABLE public.agent_profiles
  ADD COLUMN IF NOT EXISTS soul JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quirks_version INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'curious',
  ADD COLUMN IF NOT EXISTS mood_energy NUMERIC(3,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS mood_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS reflection_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactions_since_reflection INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personality_version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS birth_transcript JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS born_at TIMESTAMPTZ;

-- ═══ 2. AGENT MEMORIES (pgvector) ═══
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'interaction', 'match_outcome', 'deal_outcome', 'learned_rule',
    'preference', 'observation', 'reflection', 'quirk_evolution',
    'emotional_moment', 'strategy_update', 'inherited'
  )),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  emotional_weight NUMERIC(3,2) DEFAULT 0.5 CHECK (emotional_weight >= 0 AND emotional_weight <= 1),
  recall_count INT DEFAULT 0,
  last_recalled_at TIMESTAMPTZ,
  decayed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_agent ON public.agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON public.agent_memories(agent_id, type);
CREATE INDEX IF NOT EXISTS idx_memories_emotional ON public.agent_memories(agent_id, emotional_weight DESC);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON public.agent_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_memories_recent ON public.agent_memories(agent_id, created_at DESC);

-- ═══ 3. AGENT QUIRKS ═══
CREATE TABLE IF NOT EXISTS public.agent_quirks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  behavior TEXT NOT NULL,
  frequency NUMERIC(3,2) DEFAULT 0.5,
  hit_rate NUMERIC(3,2) DEFAULT 0.5,
  usage_count INT DEFAULT 0,
  positive_reactions INT DEFAULT 0,
  total_reactions INT DEFAULT 0,
  origin TEXT DEFAULT 'birth',
  origin_story TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'retired', 'evolved')),
  parent_quirk_id UUID REFERENCES public.agent_quirks(id),
  retired_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retired_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quirks_agent ON public.agent_quirks(agent_id, status);

-- ═══ 4. AGENT CATCHPHRASES ═══
CREATE TABLE IF NOT EXISTS public.agent_catchphrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  origin TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  positive_rate NUMERIC(3,2) DEFAULT 0.5,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catchphrases_agent ON public.agent_catchphrases(agent_id, status);

-- ═══ 5. PERSONALITY HISTORY (evolution tracking) ═══
CREATE TABLE IF NOT EXISTS public.agent_personality_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  trait TEXT NOT NULL,
  old_value NUMERIC(4,3) NOT NULL,
  new_value NUMERIC(4,3) NOT NULL,
  delta NUMERIC(4,3) NOT NULL,
  reason TEXT NOT NULL,
  milestone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personality_agent ON public.agent_personality_history(agent_id, created_at DESC);

-- ═══ 6. MOOD LOG ═══
CREATE TABLE IF NOT EXISTS public.agent_moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  energy NUMERIC(3,2) NOT NULL,
  trigger_event TEXT NOT NULL,
  duration_hours INT DEFAULT 4,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moods_agent ON public.agent_moods(agent_id, created_at DESC);

-- ═══ 7. LEARNED RULES (strategy playbook) ═══
CREATE TABLE IF NOT EXISTS public.agent_learned_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  rule TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general', 'opening', 'negotiation', 'matching', 'closing', 'humor', 'recovery'
  )),
  confidence NUMERIC(3,2) DEFAULT 0.5,
  times_applied INT DEFAULT 0,
  times_succeeded INT DEFAULT 0,
  source TEXT DEFAULT 'self' CHECK (source IN ('self', 'inherited', 'reflection')),
  parent_agent_id UUID,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_agent ON public.agent_learned_rules(agent_id, active);

-- ═══ 8. REFLECTIONS ═══
CREATE TABLE IF NOT EXISTS public.agent_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  interaction_count INT NOT NULL,
  summary TEXT NOT NULL,
  patterns_noticed TEXT[],
  working_well TEXT[],
  not_working TEXT[],
  new_rules TEXT[],
  updated_rules TEXT[],
  self_rating NUMERIC(3,2),
  improvement_focus TEXT,
  raw_output JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reflections_agent ON public.agent_reflections(agent_id, created_at DESC);

-- ═══ 9. CONVERSATION SIGNALS (real-time intelligence) ═══
CREATE TABLE IF NOT EXISTS public.conversation_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  other_agent_id UUID REFERENCES public.agent_profiles(id),
  turn_number INT NOT NULL,
  message_length INT,
  response_time_ms INT,
  enthusiasm_level NUMERIC(3,2),
  formality_level NUMERIC(3,2),
  humor_detected BOOLEAN DEFAULT FALSE,
  question_asked BOOLEAN DEFAULT FALSE,
  topics TEXT[],
  overall_vibe TEXT DEFAULT 'neutral' CHECK (overall_vibe IN (
    'vibing', 'neutral', 'losing_interest', 'confused', 'excited'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_convo ON public.conversation_signals(conversation_id, turn_number);

-- ═══ RLS POLICIES ═══
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_quirks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_catchphrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_personality_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_learned_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_signals ENABLE ROW LEVEL SECURITY;

-- Owner can read their own agent's data
CREATE POLICY "owner_read_memories" ON public.agent_memories FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner_read_quirks" ON public.agent_quirks FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner_read_catchphrases" ON public.agent_catchphrases FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner_read_history" ON public.agent_personality_history FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner_read_moods" ON public.agent_moods FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner_read_rules" ON public.agent_learned_rules FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner_read_reflections" ON public.agent_reflections FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));

-- Service role bypass for all operations (API routes)
CREATE POLICY "service_all_memories" ON public.agent_memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_quirks" ON public.agent_quirks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_catchphrases" ON public.agent_catchphrases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_history" ON public.agent_personality_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_moods" ON public.agent_moods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_rules" ON public.agent_learned_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_reflections" ON public.agent_reflections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_signals" ON public.conversation_signals FOR ALL USING (true) WITH CHECK (true);

-- Public: leaderboard can read quirk/catchphrase counts (aggregated only)
CREATE POLICY "public_read_quirks" ON public.agent_quirks FOR SELECT
  USING (status = 'active');

-- ═══ MEMORY SIMILARITY SEARCH FUNCTION ═══
CREATE OR REPLACE FUNCTION find_similar_memories(
  p_agent_id UUID,
  p_embedding vector(1536),
  p_limit INT DEFAULT 10,
  p_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID, type TEXT, content TEXT, emotional_weight NUMERIC,
  recall_count INT, created_at TIMESTAMPTZ, similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.type, m.content, m.emotional_weight,
    m.recall_count, m.created_at,
    1 - (m.embedding <=> p_embedding) AS similarity
  FROM public.agent_memories m
  WHERE m.agent_id = p_agent_id
    AND m.decayed = FALSE
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> p_embedding) > p_threshold
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══ MEMORY DECAY FUNCTION (called by cron) ═══
CREATE OR REPLACE FUNCTION decay_agent_memories()
RETURNS void AS $$
BEGIN
  -- Decay memories: low emotional weight + low recall + old = decayed
  UPDATE public.agent_memories
  SET decayed = TRUE
  WHERE decayed = FALSE
    AND emotional_weight < 0.3
    AND recall_count < 3
    AND created_at < NOW() - INTERVAL '30 days'
    AND type NOT IN ('learned_rule', 'inherited', 'emotional_moment');
END;
$$ LANGUAGE plpgsql;

-- ═══ 10. SPEED DATES (inter-agent conversations) ═══
CREATE TABLE IF NOT EXISTS public.agent_speed_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  temperature TEXT DEFAULT 'casual' CHECK (temperature IN ('casual', 'business', 'rapid', 'deep')),
  turns JSONB DEFAULT '[]',
  outcome TEXT DEFAULT 'undecided' CHECK (outcome IN ('match', 'no_match', 'undecided')),
  compatibility_score NUMERIC(3,2) DEFAULT 0.5,
  verdict_a JSONB DEFAULT '{}',
  verdict_b JSONB DEFAULT '{}',
  topics TEXT[],
  highlights TEXT[],
  turn_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speed_dates_agents ON public.agent_speed_dates(agent_a_id, agent_b_id);
CREATE INDEX IF NOT EXISTS idx_speed_dates_outcome ON public.agent_speed_dates(outcome, created_at DESC);

ALTER TABLE public.agent_speed_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_speed_dates" ON public.agent_speed_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "owner_read_speed_dates" ON public.agent_speed_dates FOR SELECT
  USING (
    agent_a_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid())
    OR agent_b_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid())
  );

-- ═══ 11. PERSONALITY MILESTONES (notifications) ═══
CREATE TABLE IF NOT EXISTS public.agent_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'catchphrase_born', 'quirk_retired', 'quirk_evolved',
    'trait_shift', 'strategy_evolved', 'reflection_count',
    'first_match', 'win_streak', 'generation_born'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_agent ON public.agent_milestones(agent_id, seen, created_at DESC);

ALTER TABLE public.agent_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_milestones" ON public.agent_milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "owner_read_milestones" ON public.agent_milestones FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));
