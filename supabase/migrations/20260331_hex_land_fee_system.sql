-- ============================================================
-- MISHMESH HEX LAND + FEE SYSTEM — FULL MIGRATION
-- Run in Supabase SQL Editor after 20260331_orb_hunting_system.sql
-- ============================================================

-- ============================================================
-- 1. HEX PLOTS — core land ownership table
-- ============================================================
CREATE TABLE IF NOT EXISTS hex_plots (
  hex_id text PRIMARY KEY,                        -- H3 index string (resolution 7)
  owner_id uuid REFERENCES users(id),
  legacy_owner_id uuid REFERENCES users(id),      -- first-ever claimer, never changes
  legacy_owner_wallet text,                       -- wallet addr for legacy payouts
  owned_since timestamptz,
  nft_token_id text,
  nft_contract_address text,
  nft_chain text DEFAULT 'base',
  -- fee settings (owner configurable within tier caps)
  deploy_fee_percent numeric DEFAULT 8.0,
  crack_fee_percent numeric DEFAULT 3.0,
  -- tier system (auto-updated monthly)
  fee_tier text DEFAULT 'pioneer',               -- pioneer|established|hot_zone|landmark|mega_node
  monthly_orb_volume integer DEFAULT 0,          -- recalculated every 30 days
  -- earnings tracking
  total_earned_usd numeric DEFAULT 0,
  last_30d_earned_usd numeric DEFAULT 0,
  all_time_orbs_cracked integer DEFAULT 0,
  all_time_orbs_deployed integer DEFAULT 0,
  -- district/territory
  district_id uuid,
  is_district_part boolean DEFAULT false,
  is_territory_part boolean DEFAULT false,
  -- marketplace
  status text DEFAULT 'active',                  -- active|contested|for_sale|rented|unclaimed
  for_sale_price_usd numeric,
  rent_price_usd_month numeric,
  renter_id uuid REFERENCES users(id),
  rent_expires_at timestamptz,
  -- display
  owner_color text DEFAULT '#6366f1',
  -- location metadata
  city text,
  country text,
  lat_center numeric,
  lng_center numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hex_plots_owner_id_idx ON hex_plots(owner_id);
CREATE INDEX IF NOT EXISTS hex_plots_fee_tier_idx ON hex_plots(fee_tier);
CREATE INDEX IF NOT EXISTS hex_plots_status_idx ON hex_plots(status);
CREATE INDEX IF NOT EXISTS hex_plots_district_id_idx ON hex_plots(district_id);

-- ============================================================
-- 2. HEX FEE PAYMENTS — full waterfall log per transaction
-- ============================================================
CREATE TABLE IF NOT EXISTS hex_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orb_id uuid REFERENCES orbs(id),
  hex_id text REFERENCES hex_plots(hex_id),
  transaction_type text NOT NULL,                -- deploy | crack
  orb_value_usd numeric NOT NULL,
  -- waterfall breakdown
  platform_cut_usd numeric DEFAULT 0,
  owner_cut_usd numeric DEFAULT 0,
  district_cut_usd numeric DEFAULT 0,
  territory_cut_usd numeric DEFAULT 0,
  referrer_cut_usd numeric DEFAULT 0,
  legacy_cut_usd numeric DEFAULT 0,
  hunter_receives_usd numeric DEFAULT 0,
  -- who gets what
  platform_wallet text,
  owner_id uuid REFERENCES users(id),
  district_owner_id uuid REFERENCES users(id),
  territory_owner_id uuid REFERENCES users(id),
  referrer_id uuid REFERENCES users(id),
  legacy_owner_id uuid REFERENCES users(id),
  hunter_id uuid REFERENCES users(id),
  -- status
  status text DEFAULT 'pending',                 -- pending | settled | failed
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hex_fee_payments_orb_id_idx ON hex_fee_payments(orb_id);
CREATE INDEX IF NOT EXISTS hex_fee_payments_hex_id_idx ON hex_fee_payments(hex_id);
CREATE INDEX IF NOT EXISTS hex_fee_payments_owner_id_idx ON hex_fee_payments(owner_id);
CREATE INDEX IF NOT EXISTS hex_fee_payments_created_at_idx ON hex_fee_payments(created_at DESC);

-- ============================================================
-- 3. HEX DISTRICTS — 5-19 connected hexes
-- ============================================================
CREATE TABLE IF NOT EXISTS hex_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id),
  name text NOT NULL,
  tier text DEFAULT 'district',                  -- district | territory
  hex_ids text[] NOT NULL,                       -- array of H3 hex_ids
  hex_count integer DEFAULT 0,
  -- fee caps
  max_deploy_fee_percent numeric DEFAULT 15.0,
  max_crack_fee_percent numeric DEFAULT 5.0,
  -- platform revenue share (territory only)
  platform_revenue_share_percent numeric DEFAULT 0,
  -- display
  brand_label text,
  brand_color text DEFAULT '#6366f1',
  verified boolean DEFAULT false,
  -- rules
  rules jsonb DEFAULT '{"min_orb_value_usd": 0, "nft_only": false, "allowed_currencies": ["SOL","ETH","BTC"]}',
  -- earnings
  total_earned_usd numeric DEFAULT 0,
  last_30d_earned_usd numeric DEFAULT 0,
  -- governance (territory only)
  governance_votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update hex_plots foreign key to districts
ALTER TABLE hex_plots ADD CONSTRAINT fk_hex_district 
  FOREIGN KEY (district_id) REFERENCES hex_districts(id) ON DELETE SET NULL;

-- ============================================================
-- 4. HEX CHALLENGES — hostile takeover system
-- ============================================================
CREATE TABLE IF NOT EXISTS hex_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hex_id text REFERENCES hex_plots(hex_id),
  challenger_id uuid REFERENCES users(id),
  defender_id uuid REFERENCES users(id),
  stake_amount_usd numeric NOT NULL,             -- must be >= 2x last_30d_earned_usd
  defender_counter_stake numeric DEFAULT 0,
  initiated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,               -- initiated_at + 48hrs
  fast_tracked boolean DEFAULT false,            -- paid $5 to resolve in 6hrs
  status text DEFAULT 'pending',                 -- pending | defender_won | challenger_won | expired
  resolved_at timestamptz,
  platform_fee_usd numeric,                      -- 5% of stake
  winner_id uuid REFERENCES users(id),
  payout_usd numeric
);

CREATE INDEX IF NOT EXISTS hex_challenges_hex_id_idx ON hex_challenges(hex_id);
CREATE INDEX IF NOT EXISTS hex_challenges_challenger_id_idx ON hex_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS hex_challenges_defender_id_idx ON hex_challenges(defender_id);
CREATE INDEX IF NOT EXISTS hex_challenges_status_idx ON hex_challenges(status);

-- ============================================================
-- 5. PLATFORM REVENUE SHARE — mega node payouts
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_revenue_share (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hex_id text REFERENCES hex_plots(hex_id),
  owner_id uuid REFERENCES users(id),
  amount_usd numeric NOT NULL,
  share_percent numeric DEFAULT 0.25,
  period_month text NOT NULL,                    -- e.g. '2026-04'
  calculated_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  status text DEFAULT 'pending'                  -- pending | paid
);

-- ============================================================
-- 6. ORB BOOSTS — paid visibility
-- ============================================================
CREATE TABLE IF NOT EXISTS orb_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orb_id uuid REFERENCES orbs(id),
  user_id uuid REFERENCES users(id),
  amount_paid_usd numeric NOT NULL,
  boosted_at timestamptz DEFAULT now(),
  boosted_until timestamptz NOT NULL,
  status text DEFAULT 'active'                   -- active | expired
);

CREATE INDEX IF NOT EXISTS orb_boosts_orb_id_idx ON orb_boosts(orb_id);
CREATE INDEX IF NOT EXISTS orb_boosts_boosted_until_idx ON orb_boosts(boosted_until);

-- ============================================================
-- 7. SUBSCRIPTIONS — creator, analytics, insurance plans
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  plan text NOT NULL,                            -- creator | analytics | insurance
  price_usd_month numeric NOT NULL,
  started_at timestamptz DEFAULT now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  active boolean DEFAULT true,
  stripe_subscription_id text,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_idx ON subscriptions(plan);

-- ============================================================
-- 8. HEX MARKETPLACE LISTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS hex_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hex_id text REFERENCES hex_plots(hex_id),
  seller_id uuid REFERENCES users(id),
  listing_type text NOT NULL,                    -- sale | rent
  price_usd numeric NOT NULL,
  rent_period text,                              -- monthly | weekly
  listed_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  status text DEFAULT 'active',                  -- active | sold | cancelled | expired
  buyer_id uuid REFERENCES users(id),
  sold_at timestamptz,
  platform_fee_usd numeric
);

-- ============================================================
-- 9. ADD HEX COLUMNS TO EXISTING orbs TABLE
-- ============================================================
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS hex_id text REFERENCES hex_plots(hex_id);
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS hex_owner_id uuid REFERENCES users(id);
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS hex_legacy_owner_id uuid REFERENCES users(id);
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES users(id);
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS fee_waterfall_id uuid;               -- ref to hex_fee_payments

-- ============================================================
-- 10. CORE FUNCTION — compute full fee waterfall
-- ============================================================
CREATE OR REPLACE FUNCTION compute_fee_waterfall(
  p_orb_id uuid,
  p_transaction_type text  -- 'deploy' or 'crack'
)
RETURNS jsonb AS $$
DECLARE
  v_orb orbs%ROWTYPE;
  v_hex hex_plots%ROWTYPE;
  v_district hex_districts%ROWTYPE;
  v_orb_value numeric;
  v_platform_cut numeric := 0;
  v_owner_cut numeric := 0;
  v_district_cut numeric := 0;
  v_territory_cut numeric := 0;
  v_referrer_cut numeric := 0;
  v_legacy_cut numeric := 0;
  v_hunter_receives numeric;
  v_total_fees numeric := 0;
  v_deploy_fee_pct numeric;
  v_crack_fee_pct numeric;
BEGIN
  -- Get orb
  SELECT * INTO v_orb FROM orbs WHERE id = p_orb_id;
  v_orb_value := COALESCE(v_orb.amount_usd, 0);

  -- Platform cut (always first)
  IF p_transaction_type = 'deploy' THEN
    v_platform_cut := v_orb_value * 0.10;
  ELSIF p_transaction_type = 'crack' THEN
    v_platform_cut := v_orb_value * 0.02;
  END IF;
  v_total_fees := v_platform_cut;

  -- Get hex
  IF v_orb.hex_id IS NOT NULL THEN
    SELECT * INTO v_hex FROM hex_plots WHERE hex_id = v_orb.hex_id;

    IF v_hex IS NOT NULL AND v_hex.owner_id IS NOT NULL THEN
      -- Determine fee % by tier
      IF p_transaction_type = 'deploy' THEN
        v_deploy_fee_pct := CASE v_hex.fee_tier
          WHEN 'pioneer'     THEN LEAST(v_hex.deploy_fee_percent, 8.0)
          WHEN 'established' THEN LEAST(v_hex.deploy_fee_percent, 6.0)
          WHEN 'hot_zone'    THEN LEAST(v_hex.deploy_fee_percent, 4.0)
          WHEN 'landmark'    THEN LEAST(v_hex.deploy_fee_percent, 2.0)
          WHEN 'mega_node'   THEN LEAST(v_hex.deploy_fee_percent, 1.0)
          ELSE 8.0
        END;
        v_owner_cut := v_orb_value * (v_deploy_fee_pct / 100);
      ELSE
        v_crack_fee_pct := CASE v_hex.fee_tier
          WHEN 'pioneer'     THEN LEAST(v_hex.crack_fee_percent, 3.0)
          WHEN 'established' THEN LEAST(v_hex.crack_fee_percent, 2.5)
          WHEN 'hot_zone'    THEN LEAST(v_hex.crack_fee_percent, 2.0)
          WHEN 'landmark'    THEN LEAST(v_hex.crack_fee_percent, 1.0)
          WHEN 'mega_node'   THEN LEAST(v_hex.crack_fee_percent, 0.5)
          ELSE 3.0
        END;
        v_owner_cut := v_orb_value * (v_crack_fee_pct / 100);
      END IF;
      v_total_fees := v_total_fees + v_owner_cut;

      -- District cut
      IF v_hex.is_district_part AND v_hex.district_id IS NOT NULL THEN
        v_district_cut := v_orb_value * 0.01;
        v_total_fees := v_total_fees + v_district_cut;
      END IF;

      -- Territory cut
      IF v_hex.is_territory_part THEN
        v_territory_cut := v_orb_value * 0.005;
        v_total_fees := v_total_fees + v_territory_cut;
      END IF;

      -- Legacy cut (permanent 0.5% to first-ever claimer)
      IF v_hex.legacy_owner_id IS NOT NULL THEN
        v_legacy_cut := v_orb_value * 0.005;
        v_total_fees := v_total_fees + v_legacy_cut;
      END IF;
    END IF;
  END IF;

  -- Referrer cut
  IF v_orb.referrer_id IS NOT NULL THEN
    v_referrer_cut := v_orb_value * 0.01;
    v_total_fees := v_total_fees + v_referrer_cut;
  END IF;

  -- Hunter receives remainder
  v_hunter_receives := GREATEST(0, v_orb_value - v_total_fees);

  -- Return full breakdown
  RETURN jsonb_build_object(
    'orb_value_usd',       v_orb_value,
    'platform_cut_usd',    ROUND(v_platform_cut, 4),
    'owner_cut_usd',       ROUND(v_owner_cut, 4),
    'district_cut_usd',    ROUND(v_district_cut, 4),
    'territory_cut_usd',   ROUND(v_territory_cut, 4),
    'referrer_cut_usd',    ROUND(v_referrer_cut, 4),
    'legacy_cut_usd',      ROUND(v_legacy_cut, 4),
    'hunter_receives_usd', ROUND(v_hunter_receives, 4),
    'total_fees_usd',      ROUND(v_total_fees, 4),
    'hex_id',              v_orb.hex_id,
    'fee_tier',            COALESCE(v_hex.fee_tier, 'none'),
    'owner_id',            v_hex.owner_id,
    'legacy_owner_id',     v_hex.legacy_owner_id,
    'referrer_id',         v_orb.referrer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. FUNCTION — update hex fee tier based on monthly volume
-- ============================================================
CREATE OR REPLACE FUNCTION update_hex_fee_tiers()
RETURNS void AS $$
BEGIN
  -- Recalculate monthly_orb_volume from last 30 days
  UPDATE hex_plots hp
  SET monthly_orb_volume = (
    SELECT COUNT(*) FROM orbs o
    WHERE o.hex_id = hp.hex_id
    AND o.created_at > now() - interval '30 days'
  );

  -- Update fee tier based on volume
  UPDATE hex_plots SET
    fee_tier = CASE
      WHEN monthly_orb_volume >= 10000 THEN 'mega_node'
      WHEN monthly_orb_volume >= 2000  THEN 'landmark'
      WHEN monthly_orb_volume >= 500   THEN 'hot_zone'
      WHEN monthly_orb_volume >= 100   THEN 'established'
      ELSE 'pioneer'
    END,
    -- Cap fees to tier maximums
    deploy_fee_percent = CASE
      WHEN monthly_orb_volume >= 10000 THEN LEAST(deploy_fee_percent, 1.0)
      WHEN monthly_orb_volume >= 2000  THEN LEAST(deploy_fee_percent, 2.0)
      WHEN monthly_orb_volume >= 500   THEN LEAST(deploy_fee_percent, 4.0)
      WHEN monthly_orb_volume >= 100   THEN LEAST(deploy_fee_percent, 6.0)
      ELSE LEAST(deploy_fee_percent, 8.0)
    END,
    crack_fee_percent = CASE
      WHEN monthly_orb_volume >= 10000 THEN LEAST(crack_fee_percent, 0.5)
      WHEN monthly_orb_volume >= 2000  THEN LEAST(crack_fee_percent, 1.0)
      WHEN monthly_orb_volume >= 500   THEN LEAST(crack_fee_percent, 2.0)
      WHEN monthly_orb_volume >= 100   THEN LEAST(crack_fee_percent, 2.5)
      ELSE LEAST(crack_fee_percent, 3.0)
    END,
    updated_at = now();

  -- Unlock platform revenue share for mega nodes
  UPDATE hex_plots SET
    updated_at = now()
  WHERE fee_tier = 'mega_node';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. FUNCTION — auto-claim hex on first orb crack
-- ============================================================
CREATE OR REPLACE FUNCTION claim_hex_on_crack()
RETURNS trigger AS $$
DECLARE
  v_existing hex_plots%ROWTYPE;
BEGIN
  IF NEW.status = 'claimed' AND OLD.status != 'claimed' AND NEW.hex_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM hex_plots WHERE hex_id = NEW.hex_id;

    IF v_existing.hex_id IS NULL THEN
      -- Unclaimed hex — first crack claims it
      INSERT INTO hex_plots (
        hex_id, owner_id, legacy_owner_id, legacy_owner_wallet,
        owned_since, status, fee_tier,
        deploy_fee_percent, crack_fee_percent,
        city, country
      ) VALUES (
        NEW.hex_id,
        NEW.claimed_by,
        NEW.claimed_by,  -- legacy owner = first claimer, forever
        (SELECT wallet_eth FROM users WHERE id = NEW.claimed_by),
        now(),
        'active',
        'pioneer',
        8.0,
        3.0,
        NEW.dropper_name,  -- temp, geocode properly in API
        NULL
      );

      -- Activity feed: hex claimed
      INSERT INTO orb_activity (
        event_type, orb_id, user_id, lat, lng, hex_id, message
      ) VALUES (
        'hex_claimed', NEW.id, NEW.claimed_by, NEW.lat, NEW.lng, NEW.hex_id,
        'A new hex was just claimed!'
      );

    ELSIF v_existing.status = 'active' AND v_existing.owner_id IS NOT NULL THEN
      -- Hex already owned — record fee payment
      INSERT INTO hex_fee_payments (
        orb_id, hex_id, transaction_type, orb_value_usd,
        owner_id, legacy_owner_id, hunter_id,
        platform_cut_usd, owner_cut_usd, legacy_cut_usd, hunter_receives_usd
      )
      SELECT
        NEW.id,
        NEW.hex_id,
        'crack',
        COALESCE(NEW.amount_usd, 0),
        v_existing.owner_id,
        v_existing.legacy_owner_id,
        NEW.claimed_by,
        COALESCE(NEW.amount_usd, 0) * 0.02,
        COALESCE(NEW.amount_usd, 0) * 0.005,
        COALESCE(NEW.amount_usd, 0) * 0.005,
        COALESCE(NEW.amount_usd, 0) * 0.965;

      -- Update hex earnings
      UPDATE hex_plots SET
        total_earned_usd = total_earned_usd + COALESCE(NEW.amount_usd, 0) * 0.005,
        last_30d_earned_usd = last_30d_earned_usd + COALESCE(NEW.amount_usd, 0) * 0.005,
        all_time_orbs_cracked = all_time_orbs_cracked + 1,
        updated_at = now()
      WHERE hex_id = NEW.hex_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_claim_hex ON orbs;
CREATE TRIGGER trg_claim_hex
  AFTER UPDATE ON orbs
  FOR EACH ROW EXECUTE FUNCTION claim_hex_on_crack();

-- ============================================================
-- 13. FUNCTION — record deploy fee when orb is created
-- ============================================================
CREATE OR REPLACE FUNCTION on_orb_deployed_hex_fee()
RETURNS trigger AS $$
DECLARE
  v_hex hex_plots%ROWTYPE;
BEGIN
  IF NEW.hex_id IS NOT NULL THEN
    SELECT * INTO v_hex FROM hex_plots WHERE hex_id = NEW.hex_id;

    IF v_hex.hex_id IS NOT NULL AND v_hex.owner_id IS NOT NULL THEN
      INSERT INTO hex_fee_payments (
        orb_id, hex_id, transaction_type, orb_value_usd,
        owner_id, legacy_owner_id, hunter_id,
        platform_cut_usd, owner_cut_usd, legacy_cut_usd, hunter_receives_usd
      ) VALUES (
        NEW.id,
        NEW.hex_id,
        'deploy',
        COALESCE(NEW.amount_usd, 0),
        v_hex.owner_id,
        v_hex.legacy_owner_id,
        NEW.dropper_id,
        COALESCE(NEW.amount_usd, 0) * 0.10,
        COALESCE(NEW.amount_usd, 0) * (v_hex.deploy_fee_percent / 100),
        COALESCE(NEW.amount_usd, 0) * 0.005,
        0  -- deployer pays, doesn't receive
      );

      UPDATE hex_plots SET
        total_earned_usd = total_earned_usd + COALESCE(NEW.amount_usd, 0) * (deploy_fee_percent / 100),
        last_30d_earned_usd = last_30d_earned_usd + COALESCE(NEW.amount_usd, 0) * (deploy_fee_percent / 100),
        all_time_orbs_deployed = all_time_orbs_deployed + 1,
        updated_at = now()
      WHERE hex_id = NEW.hex_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orb_deployed_hex_fee ON orbs;
CREATE TRIGGER trg_orb_deployed_hex_fee
  AFTER INSERT ON orbs
  FOR EACH ROW EXECUTE FUNCTION on_orb_deployed_hex_fee();

-- ============================================================
-- 14. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE hex_plots;
ALTER PUBLICATION supabase_realtime ADD TABLE hex_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE hex_fee_payments;

-- ============================================================
-- 15. RLS POLICIES
-- ============================================================
ALTER TABLE hex_plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hex_plots_read_all" ON hex_plots FOR SELECT USING (true);
CREATE POLICY "hex_plots_owner_update" ON hex_plots FOR UPDATE USING (auth.uid() = owner_id);

ALTER TABLE hex_fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hex_fee_read_own" ON hex_fee_payments FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = hunter_id OR auth.uid() = legacy_owner_id);

ALTER TABLE hex_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hex_challenges_read_all" ON hex_challenges FOR SELECT USING (true);
CREATE POLICY "hex_challenges_own" ON hex_challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);

ALTER TABLE hex_districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hex_districts_read_all" ON hex_districts FOR SELECT USING (true);
CREATE POLICY "hex_districts_owner_update" ON hex_districts FOR UPDATE USING (auth.uid() = owner_id);

ALTER TABLE orb_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orb_boosts_read_all" ON orb_boosts FOR SELECT USING (true);
CREATE POLICY "orb_boosts_own_insert" ON orb_boosts FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own" ON subscriptions USING (auth.uid() = user_id);

ALTER TABLE hex_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hex_listings_read_all" ON hex_listings FOR SELECT USING (true);
CREATE POLICY "hex_listings_seller" ON hex_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- ============================================================
-- 16. INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS orbs_hex_id_idx ON orbs(hex_id);
CREATE INDEX IF NOT EXISTS orbs_hex_status_idx ON orbs(hex_id, status);
