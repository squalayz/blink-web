CREATE TABLE IF NOT EXISTS agent_hunt_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agent_profiles(id) ON DELETE CASCADE,
  token_address text NOT NULL,
  token_symbol text NOT NULL,
  chain_id text DEFAULT 'base',
  strategy text DEFAULT 'momentum' CHECK (strategy IN ('sniper','momentum','safe')),
  position_size_usd numeric DEFAULT 50,
  take_profit_pct numeric DEFAULT 50,
  stop_loss_pct numeric DEFAULT -20,
  note text,
  status text DEFAULT 'active' CHECK (status IN ('active','filled','cancelled','expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token_address)
);
CREATE INDEX IF NOT EXISTS idx_hunt_orders_user ON agent_hunt_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_hunt_orders_agent ON agent_hunt_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_hunt_orders_status ON agent_hunt_orders(status);
