-- MeshTrade: AI agent trading console
-- Adds settings columns to users table and creates meshtrade_log table

-- Add MeshTrade settings to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mt_aggression INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mt_max_trade INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mt_stop_loss INTEGER DEFAULT 15;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mt_take_profit INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mt_unleashed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mt_priority_queue JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mt_watchlist JSONB DEFAULT '[]';

-- MeshTrade log table
CREATE TABLE IF NOT EXISTS meshtrade_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('scan','signal','entry','hold','exit_win','exit_loss','point','reject','error')),
  message TEXT NOT NULL,
  token_symbol TEXT,
  pnl NUMERIC
);

CREATE INDEX IF NOT EXISTS meshtrade_log_user_time ON meshtrade_log(user_id, created_at DESC);
