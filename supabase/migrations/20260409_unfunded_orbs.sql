-- Migration: Unfunded Orbs (Launch-then-Fund flow)
-- Adds support for orbs created via fling gesture that start as 'unfunded'
-- and must be funded within a deadline window.
--
-- Status values for orbs (text column, no enum constraint):
--   pending   — funded and live on the map
--   claimed   — found by another user
--   cracked   — cracked open
--   cancelled — cancelled by dropper
--   expired   — deadline passed or manually expired
--   failed    — transaction failed
--   unfunded  — NEW: created via fling, awaiting funding

-- Add fund_deadline column (when unfunded orb expires if not funded)
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS fund_deadline timestamptz;

-- Add funded_at column (when funds were confirmed)
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS funded_at timestamptz;

-- Index for cleanup cron: find expired unfunded orbs efficiently
CREATE INDEX IF NOT EXISTS idx_orbs_unfunded_deadline
  ON orbs (fund_deadline)
  WHERE status = 'unfunded';
