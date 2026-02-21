-- ══════════════════════════════════════════════════════
-- MIGRATION: Production Optimizations (run after all other migrations)
-- Indexes, constraints, concurrent trade protection, cleanup
-- ══════════════════════════════════════════════════════

-- ═══ MISSING INDEXES (query performance) ═══

-- Users: wallet lookup (auth hot path)
CREATE INDEX IF NOT EXISTS idx_users_wallet ON public.users(wallet_address) WHERE wallet_address IS NOT NULL;

-- Users: referral code (invite system)
CREATE INDEX IF NOT EXISTS idx_users_referral ON public.users(referral_code) WHERE referral_code IS NOT NULL;

-- Matches: per-user lookup (dashboard hot path)
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches(user_a, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches(user_b, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_revealed ON public.matches(revealed) WHERE revealed = true;

-- Agent profiles: boosted/spotlight queries (matching priority)
CREATE INDEX IF NOT EXISTS idx_agents_boosted ON public.agent_profiles(boosted_at DESC NULLS LAST) WHERE boosted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_spotlight ON public.agent_profiles(spotlight_until) WHERE spotlight_until IS NOT NULL;

-- Notifications: per-user unread (bell icon hot path)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read = false;

-- Fusions: per-user lookup
CREATE INDEX IF NOT EXISTS idx_fusions_parent_a ON public.fusions(parent_a_user_id);
CREATE INDEX IF NOT EXISTS idx_fusions_parent_b ON public.fusions(parent_b_user_id);
CREATE INDEX IF NOT EXISTS idx_fusions_status ON public.fusions(status);

-- Token launches: compound index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_launches_live_volume ON public.token_launches(volume_24h DESC) WHERE status = 'LIVE';
CREATE INDEX IF NOT EXISTS idx_launches_live_holders ON public.token_launches(holder_count DESC) WHERE status = 'LIVE';
CREATE INDEX IF NOT EXISTS idx_launches_live_price ON public.token_launches(current_price DESC) WHERE status = 'LIVE';

-- Token holdings: compound for portfolio queries
CREATE INDEX IF NOT EXISTS idx_holdings_user_balance ON public.token_holdings(user_id, balance DESC) WHERE balance > 0;

-- Ventures
CREATE INDEX IF NOT EXISTS idx_ventures_status ON public.ventures(status);
CREATE INDEX IF NOT EXISTS idx_ventures_founder ON public.ventures(founder_id);

-- ═══ CONCURRENT TRADE PROTECTION ═══
-- Advisory lock function for atomic price updates

CREATE OR REPLACE FUNCTION atomic_token_trade(
  p_launch_id UUID,
  p_user_id UUID,
  p_trade_type TEXT,
  p_amount NUMERIC,
  p_expected_price NUMERIC,
  p_max_slippage NUMERIC DEFAULT 0.05
) RETURNS JSONB AS $$
DECLARE
  v_launch RECORD;
  v_actual_price NUMERIC;
  v_slippage NUMERIC;
BEGIN
  -- Lock the row for this token
  SELECT * INTO v_launch
  FROM public.token_launches
  WHERE id = p_launch_id AND status = 'LIVE'
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token not found or not live');
  END IF;

  v_actual_price := v_launch.current_price;

  -- Check slippage tolerance
  IF p_expected_price > 0 THEN
    v_slippage := ABS(v_actual_price - p_expected_price) / p_expected_price;
    IF v_slippage > p_max_slippage THEN
      RETURN jsonb_build_object('error', 'Price moved beyond slippage tolerance', 'expected', p_expected_price, 'actual', v_actual_price);
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'price', v_actual_price, 'liquidity', v_launch.total_liquidity);
END;
$$ LANGUAGE plpgsql;

-- ═══ PRICE HISTORY CLEANUP (keep 30 days) ═══

CREATE OR REPLACE FUNCTION cleanup_old_price_history() RETURNS void AS $$
BEGIN
  DELETE FROM public.token_price_history
  WHERE recorded_at < NOW() - INTERVAL '30 days'
    AND period IN ('1m', '5m');

  DELETE FROM public.token_price_history
  WHERE recorded_at < NOW() - INTERVAL '90 days'
    AND period = '1h';
END;
$$ LANGUAGE plpgsql;

-- ═══ MATERIALIZED VIEW: Live token stats (refreshed by cron) ═══

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_token_leaderboard AS
SELECT
  tl.id,
  tl.token_name,
  tl.token_symbol,
  tl.current_price,
  tl.volume_24h,
  tl.holder_count,
  tl.market_cap,
  tl.launched_at,
  f.name AS fusion_name,
  f.generation AS fusion_generation,
  COALESCE(
    (SELECT COUNT(*) FROM public.token_trades WHERE launch_id = tl.id AND created_at > NOW() - INTERVAL '1 hour'),
    0
  ) AS trades_1h
FROM public.token_launches tl
LEFT JOIN public.fusions f ON f.id = tl.fusion_id
WHERE tl.status = 'LIVE'
ORDER BY tl.volume_24h DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_id ON public.mv_token_leaderboard(id);

-- Refresh function (called by cron)
CREATE OR REPLACE FUNCTION refresh_leaderboard() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_token_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ═══ CONSTRAINTS: Data integrity ═══

-- Ensure token prices can't go negative
ALTER TABLE public.token_launches ADD CONSTRAINT chk_price_non_negative CHECK (current_price >= 0);
ALTER TABLE public.token_launches ADD CONSTRAINT chk_liquidity_non_negative CHECK (total_liquidity >= 0);
ALTER TABLE public.token_holdings ADD CONSTRAINT chk_balance_non_negative CHECK (balance >= 0);
ALTER TABLE public.token_trades ADD CONSTRAINT chk_trade_amount_positive CHECK (token_amount > 0 AND eth_amount > 0);
