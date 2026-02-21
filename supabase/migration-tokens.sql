-- ══════════════════════════════════════════════════════
-- MIGRATION: Agent Token Launch System
-- Fusion Agents launch tradeable ERC-20 tokens
-- Run AFTER migration-fusions.sql
-- ══════════════════════════════════════════════════════

-- 1. Token launches
CREATE TABLE IF NOT EXISTS public.token_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fusion_id UUID NOT NULL REFERENCES public.fusions(id) ON DELETE CASCADE,
  
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_address TEXT,             -- Set after deploy
  bonding_curve_address TEXT,     -- Set after deploy
  
  founder_a_user_id UUID NOT NULL REFERENCES public.users(id),
  founder_b_user_id UUID NOT NULL REFERENCES public.users(id),
  
  founder_a_eth NUMERIC(18,8),
  founder_b_eth NUMERIC(18,8),
  founder_a_funded BOOLEAN DEFAULT false,
  founder_b_funded BOOLEAN DEFAULT false,
  founder_a_agreed BOOLEAN DEFAULT false,
  founder_b_agreed BOOLEAN DEFAULT false,
  
  total_liquidity NUMERIC(18,8) DEFAULT 0,
  total_supply NUMERIC DEFAULT 1000000,
  
  -- Cached market data (updated by sync job)
  current_price NUMERIC(18,12) DEFAULT 0,
  price_24h_ago NUMERIC(18,12) DEFAULT 0,
  market_cap NUMERIC(18,8) DEFAULT 0,
  volume_24h NUMERIC(18,8) DEFAULT 0,
  holder_count INTEGER DEFAULT 2,       -- Starts with 2 founders
  total_trades INTEGER DEFAULT 0,
  
  -- PROPOSING → AGREED → FUNDING → LIVE → CANCELLED
  status TEXT NOT NULL DEFAULT 'PROPOSING' CHECK (status IN ('PROPOSING', 'AGREED', 'FUNDING', 'LIVE', 'CANCELLED')),
  
  -- On-chain
  launch_id_onchain TEXT,         -- bytes32 from contract
  deploy_tx_hash TEXT,
  
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One token per fusion
  UNIQUE(fusion_id)
);

CREATE INDEX IF NOT EXISTS idx_launches_fusion ON public.token_launches(fusion_id);
CREATE INDEX IF NOT EXISTS idx_launches_status ON public.token_launches(status);
CREATE INDEX IF NOT EXISTS idx_launches_founder_a ON public.token_launches(founder_a_user_id);
CREATE INDEX IF NOT EXISTS idx_launches_founder_b ON public.token_launches(founder_b_user_id);
CREATE INDEX IF NOT EXISTS idx_launches_volume ON public.token_launches(volume_24h DESC);

-- 2. Trade history
CREATE TABLE IF NOT EXISTS public.token_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES public.token_launches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  token_amount NUMERIC(18,8) NOT NULL,
  eth_amount NUMERIC(18,8) NOT NULL,
  price_per_token NUMERIC(18,12) NOT NULL,
  platform_fee NUMERIC(18,8) DEFAULT 0,
  
  tx_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_launch ON public.token_trades(launch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.token_trades(user_id, created_at DESC);

-- 3. Holdings (cached balances)
CREATE TABLE IF NOT EXISTS public.token_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES public.token_launches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  
  balance NUMERIC(18,8) NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(18,12) DEFAULT 0,
  total_invested NUMERIC(18,8) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(launch_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_holdings_launch ON public.token_holdings(launch_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.token_holdings(user_id);

-- 4. Price history (for charts)
CREATE TABLE IF NOT EXISTS public.token_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES public.token_launches(id) ON DELETE CASCADE,
  
  price NUMERIC(18,12) NOT NULL,
  volume NUMERIC(18,8) DEFAULT 0,
  
  -- OHLC for candlestick
  open_price NUMERIC(18,12),
  high_price NUMERIC(18,12),
  low_price NUMERIC(18,12),
  close_price NUMERIC(18,12),
  
  period TEXT DEFAULT '1h' CHECK (period IN ('1m', '5m', '1h', '4h', '1d')),
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_hist ON public.token_price_history(launch_id, period, recorded_at DESC);

-- 5. Auto-update trade stats
CREATE OR REPLACE FUNCTION update_token_stats() RETURNS TRIGGER AS $$
BEGIN
  -- Update holder count
  UPDATE public.token_launches SET
    holder_count = (SELECT COUNT(DISTINCT user_id) FROM public.token_holdings WHERE launch_id = NEW.launch_id AND balance > 0),
    total_trades = (SELECT COUNT(*) FROM public.token_trades WHERE launch_id = NEW.launch_id),
    updated_at = NOW()
  WHERE id = NEW.launch_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_token_stats ON public.token_trades;
CREATE TRIGGER trg_token_stats
  AFTER INSERT ON public.token_trades
  FOR EACH ROW EXECUTE FUNCTION update_token_stats();

-- 6. RLS
ALTER TABLE public.token_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_price_history ENABLE ROW LEVEL SECURITY;

-- Marketplace is PUBLIC — no login to browse
CREATE POLICY tl_public_read ON public.token_launches FOR SELECT USING (true);
CREATE POLICY tt_public_read ON public.token_trades FOR SELECT USING (true);

-- Holdings: own only
CREATE POLICY th_own_read ON public.token_holdings FOR SELECT USING (user_id = auth.uid());
-- Price history: public
CREATE POLICY tp_public_read ON public.token_price_history FOR SELECT USING (true);

-- Write: authenticated only
CREATE POLICY tl_auth_insert ON public.token_launches FOR INSERT WITH CHECK (
  founder_a_user_id = auth.uid() OR founder_b_user_id = auth.uid()
);
CREATE POLICY tl_auth_update ON public.token_launches FOR UPDATE USING (
  founder_a_user_id = auth.uid() OR founder_b_user_id = auth.uid()
);

-- Grants
GRANT SELECT ON public.token_launches TO anon, authenticated;
GRANT SELECT ON public.token_trades TO anon, authenticated;
GRANT SELECT ON public.token_price_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.token_holdings TO authenticated;
GRANT INSERT, UPDATE ON public.token_launches TO authenticated;
GRANT INSERT ON public.token_trades TO authenticated;
GRANT INSERT ON public.token_price_history TO authenticated;
