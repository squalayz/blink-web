-- Adds tx_status tracking to gifts so the sweeper can reconcile any claim
-- transaction whose receipt the request handler did not get to confirm
-- (timeouts, RPC hiccups, crashes between broadcast and DB write).
--
-- Values used by the application:
--   'broadcast' — tx submitted but receipt not yet observed
--   'confirmed' — receipt observed with status=1
--   'failed'    — receipt status=0 or tx not found after >30 min
--
-- Apply this once via the Supabase SQL editor before /api/gifts/sweep-tx
-- is hit by Vercel cron. Until then the new column simply doesn't exist
-- and the inserts will fail loudly — that's an acceptable temporary state
-- since gift-escrow now waits for the receipt before returning ok.

ALTER TABLE gifts ADD COLUMN IF NOT EXISTS tx_status text;
CREATE INDEX IF NOT EXISTS gifts_tx_status_idx
  ON gifts (tx_status, claimed_at)
  WHERE tx_status IS NOT NULL;
