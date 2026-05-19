-- ════════════════════════════════════════════════════════════════════════════
-- CATCH IDENTITY CALIBRATION
--
-- Add `creature_id` to wild_spawns and orbs so the integer creature identity
-- is locked at spawn-time and carried end-to-end. Drives AR visual selection
-- AND NFT metadata generation off the same key (src/lib/creature-registry.ts).
--
-- Additive only. Existing rows keep their name/image_cid and are resolved by
-- legacy_resolveCreature() until they expire naturally.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.wild_spawns
  ADD COLUMN IF NOT EXISTS creature_id INT;

ALTER TABLE public.orbs
  ADD COLUMN IF NOT EXISTS creature_id INT;

CREATE INDEX IF NOT EXISTS wild_spawns_creature_id_idx
  ON public.wild_spawns (creature_id);

CREATE INDEX IF NOT EXISTS orbs_creature_id_idx
  ON public.orbs (creature_id)
  WHERE creature_id IS NOT NULL;
