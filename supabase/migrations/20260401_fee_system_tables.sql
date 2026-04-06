-- MishMesh Fee System Tables
-- Created: 2026-04-01

-- 1. failed_platform_fees — logs any fee that failed to send to platform wallet
CREATE TABLE IF NOT EXISTS failed_platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orb_id uuid REFERENCES orbs(id),
  payout_id uuid,
  currency text NOT NULL,
  amount numeric NOT NULL,
  platform_wallet text NOT NULL,
  failure_reason text,
  status text DEFAULT 'pending',
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_failed_platform_fees_status ON failed_platform_fees(status, created_at);

-- 2. profiles.referred_by — tracks who referred each user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- 3. hex_fee_payments withdrawal tracking
ALTER TABLE hex_fee_payments ADD COLUMN IF NOT EXISTS withdrawal_status text DEFAULT 'pending';
ALTER TABLE hex_fee_payments ADD COLUMN IF NOT EXISTS withdrawal_tx_hash text;
ALTER TABLE hex_fee_payments ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;
