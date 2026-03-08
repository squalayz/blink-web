-- AutoResearch Loop tables
CREATE TABLE IF NOT EXISTS agent_research_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid,
  experiments_run integer DEFAULT 0,
  rules_added integer DEFAULT 0,
  rules_updated integer DEFAULT 0,
  insights jsonb DEFAULT '[]',
  estimated_improvement numeric DEFAULT 0,
  ran_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_log_user ON agent_research_log(user_id, ran_at DESC);
ALTER TABLE agent_research_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_research" ON agent_research_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_research" ON agent_research_log FOR INSERT WITH CHECK (true);

-- Add columns to agent_profiles for the autoresearch loop
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS program_md text;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS research_enabled boolean DEFAULT true;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS last_research_at timestamptz;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS total_experiments integer DEFAULT 0;
