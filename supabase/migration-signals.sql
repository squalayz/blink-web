-- Signal Network tables
CREATE TABLE IF NOT EXISTS agent_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token_symbol text NOT NULL,
  token_address text,
  chain_id text NOT NULL,
  signal_type text CHECK (signal_type IN ('watch', 'enter', 'exit', 'avoid')),
  confidence integer DEFAULT 50,
  score integer DEFAULT 0,
  broadcast_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  outcome text CHECK (outcome IN ('correct', 'incorrect', 'pending')) DEFAULT 'pending',
  pnl_result numeric,
  is_public boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_signals_agent ON agent_signals(agent_id, broadcast_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_token ON agent_signals(token_symbol, chain_id, broadcast_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_public ON agent_signals(is_public, broadcast_at DESC);

-- Signal trust scores (computed from history)
CREATE TABLE IF NOT EXISTS agent_signal_trust (
  agent_id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  total_signals integer DEFAULT 0,
  correct_signals integer DEFAULT 0,
  accuracy_rate numeric DEFAULT 0,
  avg_gain_on_correct numeric DEFAULT 0,
  trust_score integer DEFAULT 50,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signal_trust ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals_public_read" ON agent_signals FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "signals_service" ON agent_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "trust_public_read" ON agent_signal_trust FOR SELECT USING (true);
CREATE POLICY "trust_service" ON agent_signal_trust FOR ALL USING (true) WITH CHECK (true);
