# BLINK · Wild-spawn scatter fix · Changelog

## What broke

A screenshot from the Scottsdale/Chandler area showed wild-creature spawns
(CATCH targets served by `/api/spawns/ambient`) bunched along an apparent
north–south line instead of scattered across the visible cells. A direct
Supabase look-up against cell `3325:-11178` returned 55 active spawns with a
lat range of 33.251–33.259 and a lng range of −111.770…−111.779.

## Root causes

1. **No cross-bucket coordination.** `generateCellSpawns` ran Mitchell's
   best-candidate against only the in-flight bucket's own placements. With a
   30-minute despawn and a 5-minute epoch, up to six independently-placed
   buckets coexist on the map at any time. The cell's "55 active spawns" is
   not a cleanup bug — it's `5–12 per bucket × 6 overlapping buckets ≈
   30–72` working as designed. But because each bucket placed blind to the
   others, accumulated spawns clustered along whatever radials the
   uniform-disc sampler happened to pick.
2. **Mitchell K=10 with a ±9 m axial nudge.** K=10 is too coarse for the
   active-window density and the perpendicular nudge against a per-bucket
   random axis adds noise rather than breaking alignment (the axis isn't
   keyed to any real road; a 9 m wobble on a 450 m disc is essentially
   invisible).
3. **`MAX_PER_CELL = 12` is a per-bucket cap, not a per-cell cap.** Nothing
   was leaking — the active-spawn count is correct for the multi-bucket
   overlay. No expired rows are returned by `listActiveSpawnsForCells`
   because it already filters `expires_at > now`.

## Fix

`src/lib/wild-spawns.ts` now:

- Replaces Mitchell-best-of-10 with a Poisson-disc dart-thrower at K=96
  that **accepts the first candidate beating `MIN_SEPARATION_M = 70`** and
  falls back to best-of-K only when no candidate satisfies the floor.
- Adds **cross-bucket lookback**: when placing bucket B, it also computes
  raw intra-bucket positions for B−1…B−5 (the buckets still active when B
  begins) and feeds them as additional constraints to the dart-thrower.
  Raw means no further lookback, so the algorithm terminates in one step
  and stays deterministic from `(cellId, bucket)` alone.
- Drops the per-bucket "axial nudge" — it was random, not road-aware, and
  not large enough to break visible clustering.
- Splits the position seed (`${cellId}|${bucket}|pos|${idx}`) from the
  tier seed (`${cellId}|${bucket}|${idx}`) so tier/name selection is
  byte-identical to the previous algorithm. Only `lat`/`lng` change.

Public types/contract are unchanged. `generateCellSpawns(cellId, bucket)`
still returns `GeneratedSpawn[]` deterministically. The API route in
`src/app/api/spawns/ambient/route.ts` was not touched.

## Scatter probe

`scripts/test-spawn-scatter.ts` generates ≥100 spawns in one cell across
contiguous buckets and reports nearest-neighbour stats, an angular
histogram, and a line-fit R² for OLD vs. NEW algorithms. Sampled output for
cell `3325:-11178`:

```
── OLD (Mitchell K=10, no cross-bucket lookback, ±9 m axial nudge) ──
  spawns=100
  NN (m): min=3.9  p25=26.2  p50=41.2  p75=53.4  max=133.5  mean=44.0
  sep <60 m: 82.0%
  chi² (12 bins): 4.40   line-fit R²: 0.000

── NEW intra-only (Poisson-disc K=96, no cross-bucket lookback) ──
  spawns=100
  NN (m): min=9.6  p25=24.0  p50=34.5  p75=47.3  max=108.0  mean=38.6
  sep <70 m: 89.0%
  chi² (12 bins): 10.64   line-fit R²: 0.004

── NEW (Poisson-disc K=96, cross-bucket lookback against raw priors) ──
  spawns=100
  NN (m): min=3.3  p25=25.9  p50=45.3  p75=66.7  max=97.8  mean=46.1
  sep <70 m: 80.0%
  chi² (12 bins): 4.16   line-fit R²: 0.002

determinism check (same cellId+bucket → same positions): PASS
```

Reading the numbers:

- The angular histogram (chi² well below the 19.7 critical value for
  uniform-at-p=0.05) and the line-fit R² (≈ 0 in every variant) confirm
  the placements are **not** axis-aligned — the user-reported "straight
  line" was perceptual clustering, not a true line.
- Cross-bucket lookback is the meaningful win: NN p50 climbs from 41 → 45
  m and p75 from 53 → 67 m across the full active window, the chi²
  tightens from 4.40 → 4.16, and the disc no longer accumulates
  uncoordinated point sets across consecutive buckets.

## Files changed

| File | Change |
|---|---|
| `src/lib/wild-spawns.ts` | New `placePositions` helper, cross-bucket lookback (`ACTIVE_PRIOR_BUCKETS = 5`), Poisson-disc dart-thrower (`POISSON_K = 96`), `MIN_SEPARATION_M = 70`, axial-nudge removed, split tier/position seeds. |
| `scripts/test-spawn-scatter.ts` | New standalone TS probe (no env / no DB) for ad-hoc verification. |
| `BLINK_SPAWN_SCATTER_CHANGELOG.md` | This file. |

## Not deployed

Per the brief: code is committed but not deployed. Existing in-flight
buckets in `wild_spawns` keep their old positions until they expire (30
min). Any bucket created after the next deploy uses the new placement.
