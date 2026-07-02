-- ════════════════════════════════════════════════════════════════════════════
-- BLINK — EIP-712 voucher claim support on claim_ledger.
-- Adds the voucher fields used by /api/claim/voucher + /api/claim/confirm.
-- Also allows the 'expired' status used when a voucher's deadline passes and
-- its points are restored.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE claim_ledger
  ADD COLUMN IF NOT EXISTS voucher_nonce TEXT,
  ADD COLUMN IF NOT EXISTS voucher_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voucher_amount_wei NUMERIC(78, 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_ledger_voucher_nonce
  ON claim_ledger (voucher_nonce)
  WHERE voucher_nonce IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claim_ledger_pending_voucher
  ON claim_ledger (profile_id, status)
  WHERE status = 'pending';
