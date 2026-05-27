-- ════════════════════════════════════════════════════════════════════════════
-- PAID CATCH BYPASS
--
-- After a player exhausts their 3 daily free catches, they can pay 0.005 ETH
-- to the BlinkCatchRouter to bypass the daily limit and earn 5x BLINK rewards.
-- We persist the on-chain payment txHash on the wild_spawns row that consumed
-- it, with a partial UNIQUE index to guarantee one-shot use (replay guard).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.wild_spawns
  ADD COLUMN IF NOT EXISTS paid_catch_tx_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS wild_spawns_paid_catch_tx_hash_uniq
  ON public.wild_spawns (paid_catch_tx_hash)
  WHERE paid_catch_tx_hash IS NOT NULL;
