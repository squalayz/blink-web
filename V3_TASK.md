# TRADING ENGINE V3 — Full Rewrite Task

## FILES TO MODIFY
- `src/lib/trading-v2.ts` — Main trading engine (REWRITE most of this)
- `src/app/api/cron/fast/route.ts` — Fast cron (may need updates)
- `src/app/api/cron/route.ts` — Main cron (may need updates)
- `src/app/api/trading/scan/route.ts` — Scan endpoint (update for regime)
- `src/app/api/wallet/route.ts` — Wallet API (add new fields)
- `src/app/trading/page.tsx` — Trading dashboard (show regime, tiers, grades)
- `src/app/dashboard/page.tsx` — Main dashboard (show regime, grades)

## DATABASE
- Supabase project: `kirgpeovueddvqtjxioj.supabase.co`
- Use `supabaseAdmin` from `@/lib/supabase` for all queries
- For schema changes, add columns to existing tables via the trading engine init (ALTER TABLE IF NOT EXISTS pattern), OR use supabaseAdmin.rpc() — do NOT create migration files
- Existing tables: `trading_history`, `agent_balances`, `users`, `agent_profiles`, `notifications`, `portfolio_snapshots`, `deposits`, `withdrawals`, `debug_log`

## CRITICAL CONSTRAINTS
- Must build with `npm run build` (Next.js + SWC). No TypeScript errors.
- All code in single file `trading-v2.ts` (or create new files in `src/lib/` if needed)
- Keep existing exports: `runAutonomousTradingV2`, `runSLTPEngine`, `runSingleUserTrading`
- Keep existing wallet/fee infrastructure: `getWalletBalance`, `collectTradeFee`, `getSigner`, `getProvider`, `FEES` from `./wallet`
- Keep existing AI infrastructure: `getUserAIConfig`, `callUserLLM` from `./ai-providers`
- Keep existing Uniswap V3 swap logic (Quoter V2 + SwapRouter)
- `ethers` v6 (ethers.parseEther, ethers.formatEther, ethers.Contract, etc.)
- GAS_RESERVE_ETH = 0.002 must be maintained
- All new DB columns should use ALTER TABLE with IF NOT EXISTS or be handled gracefully

## BUILD ORDER (implement in this order)
1. **Graduated take-profit tiers** — partial sells at 25%/50%/100% profit per strategy
2. **Replace stale position rule** with momentum-based position age rules per strategy  
3. **Market regime detector** — ETH price + volume → bull/bear/chop/volatile
4. **Anti-churn protection** — rebuy cooldown, round trip limit, loss streak cooldown
5. **Kelly position sizing** — confidence × win rate × regime → position size
6. **Enhanced AI prompt** — full context with regime, history, grades, patterns
7. **Trade report cards + grading** — grade entries/exits A-F, store lessons
8. **Dynamic token discovery** — strategy-specific filters (mcap, age, buy/sell ratio)
9. **Post-exit price tracking** — schedule checks at +30min, +1h to grade exits
10. **Feed report cards back into AI** — close the learning loop

## DETAILED SPECS

### 1. Graduated Take-Profit Tiers
Track `tiers_hit` (array of tier indices hit) and `remaining_size_pct` on each position in trading_history.
When a tier triggers, sell only that % of the position, tighten trailing stop.

Per-strategy tiers:
- meme_scout: [25% @ +25%, 25% @ +50%, 25% @ +100%] — last 25% moonbag with 10% trail
- momentum: [30% @ +15%, 30% @ +35%, 30% @ +60%]
- sniper: [30% @ +30%, 30% @ +80%, 30% @ +150%]
- blue_chip: [30% @ +10%, 30% @ +25%, 30% @ +40%]
- mean_reversion: [40% @ +10%, 40% @ +20%]
- hodl_dca: no tiers (never auto-sell)

### 2. Position Age Rules (replace stale sell)
Per-strategy min_hold, review_after, max_hold minutes.
At review time, check momentum (volume declining, price below entry trend).
- meme_scout: min 10min, review 30min, max 120min
- sniper: min 5min, review 20min, max 60min  
- blue_chip: min 60min, review 240min, max 1440min
- hodl_dca: min 1440min, review 4320min, max 43200min

### 3. Market Regime Detector
Use ETH price from CoinGecko or existing cache. Classify:
- bull_trending: ETH 4h >+3%, 24h >+5%
- bear_trending: ETH 4h <-3%, 24h <-5%
- sideways_chop: ETH 24h change <2%, low vol
- high_volatility: large swings
Adjust risk params per regime (position size, stops, TP targets).

### 4. Anti-Churn
- Rebuy cooldown per strategy (30-1440min)
- Max 3 round trips per hour
- 3-loss streak → 30min cooldown
- Min expected gain > 3% (must exceed fees)

### 5. Kelly Sizing
f = (bp - q) / b, half-Kelly, scaled by confidence and regime.
Min 2%, max per risk config. If win rate <40%, cap at 5%.

### 6. Enhanced AI Prompt
Include: regime, full portfolio with tier info, trade history with grades, 
token candidates with user's history per token, pattern analysis.
AI can return MULTIPLE actions (sell + buy in one response).

### 7. Trade Report Cards
New table `trade_report_cards` with grades A-F for entry/exit.
Grade entry: where in the 4h price range did we enter?
Grade exit: what % of available upside did we capture?
AI generates `lesson_learned` text.

### 8. Dynamic Token Discovery  
Strategy-specific filters:
- meme_scout: mcap <$10M, age 2h-168h, vol >$50k
- sniper: age <24h, vol >$20k, buy_sell_ratio >0.6
- blue_chip: liq >$100k, mcap >$10M, age >720h
- momentum: 1h change 5-150%, volume confirming
- mean_reversion: 24h change <-15%, liq >$50k, not actively crashing

### 9. Post-Exit Price Tracking
When position closes, store the current price. The SLTP engine (runs every 3min) 
should check recently closed positions and fill in price_30min_after, price_1h_after
if enough time has passed. Use this data for grading.

### 10. Learning Loop
Feed last 10 report cards into AI prompt with grades and lessons.
Include pattern analysis: win rate, avg win/loss, best/worst setups, tendencies.

## TESTING
After implementing, run `npm run build` to verify no TS errors.
When completely finished, run this command to notify me:
openclaw system event --text "Done: V3 Trading Engine complete — graduated TP tiers, market regime, anti-churn, Kelly sizing, trade report cards, learning loop" --mode now
