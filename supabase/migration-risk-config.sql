-- ══════════════════════════════════════════════════════════════
-- MishMesh — Risk Config per Strategy + Portfolio Snapshots
-- Run: psql $SUPABASE_DB_URL -f migration-risk-config.sql
-- ══════════════════════════════════════════════════════════════

-- 1. Risk config columns on agent_balances (user-level overrides)
ALTER TABLE agent_balances
  ADD COLUMN IF NOT EXISTS stop_loss_pct numeric DEFAULT -25,
  ADD COLUMN IF NOT EXISTS take_profit_pct numeric DEFAULT 80,
  ADD COLUMN IF NOT EXISTS trailing_stop_pct numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_daily_loss_pct numeric DEFAULT -30,
  ADD COLUMN IF NOT EXISTS max_position_pct numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_slippage_pct numeric DEFAULT 8,
  ADD COLUMN IF NOT EXISTS max_price_impact_pct numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS cooldown_minutes numeric DEFAULT 15;

-- 2. Portfolio snapshots for circuit breaker
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value_eth numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user ON portfolio_snapshots(user_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own snapshots" ON portfolio_snapshots
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert (cron uses supabaseAdmin)
CREATE POLICY "Service inserts snapshots" ON portfolio_snapshots
  FOR INSERT WITH CHECK (true);
