// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Trade Report Cards V3
// Grades every trade A-F, generates lessons, tracks post-exit prices
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase";

export interface ReportCard {
  token_symbol: string;
  pnl_pct: number;
  hold_minutes: number;
  exit_reason: string;
  entry_grade: string;
  exit_grade: string;
  overall_grade: string;
  lesson_learned: string;
}

/**
 * Grade an entry: where in the subsequent price range did we enter?
 * Lower = better (bought near the bottom of what came next)
 */
function gradeEntry(pnlPct: number, peakPnlPct: number): string {
  // If peak was negative, we entered at a bad time
  if (peakPnlPct <= 0) return 'F';
  if (peakPnlPct < 5) return 'D';
  // How close to the bottom of the range did we enter?
  // High peak PnL = we entered early before a big move = good
  if (peakPnlPct > 50) return 'A';
  if (peakPnlPct > 25) return 'B';
  if (peakPnlPct > 10) return 'C';
  return 'D';
}

/**
 * Grade an exit: how much of the available upside did we capture?
 */
function gradeExit(pnlPct: number, peakPnlPct: number): string {
  if (peakPnlPct <= 0) return pnlPct > peakPnlPct ? 'B' : 'C'; // no upside existed
  const captureRatio = pnlPct / peakPnlPct;
  if (captureRatio > 0.7) return 'A';
  if (captureRatio > 0.5) return 'B';
  if (captureRatio > 0.3) return 'C';
  if (captureRatio > 0.1) return 'D';
  return 'F';
}

function overallGrade(entry: string, exit: string): string {
  const scores: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const avg = ((scores[entry] || 0) + (scores[exit] || 0)) / 2;
  if (avg >= 3.5) return 'A';
  if (avg >= 2.5) return 'B';
  if (avg >= 1.5) return 'C';
  if (avg >= 0.5) return 'D';
  return 'F';
}

function generateLesson(
  tokenSymbol: string,
  pnlPct: number,
  peakPnlPct: number,
  holdMin: number,
  exitReason: string,
  entryGrade: string,
  exitGrade: string,
): string {
  const parts: string[] = [];

  if (entryGrade === 'F' || entryGrade === 'D') {
    if (pnlPct < -10) parts.push(`Entered ${tokenSymbol} too late — it was already extended.`);
    else parts.push(`Entry timing on ${tokenSymbol} was poor.`);
  } else if (entryGrade === 'A') {
    parts.push(`Great entry on ${tokenSymbol} — caught it early.`);
  }

  if (exitGrade === 'F' && peakPnlPct > 20) {
    parts.push(`Left ${(peakPnlPct - pnlPct).toFixed(0)}% on the table. Consider wider trailing stop.`);
  } else if (exitGrade === 'A') {
    parts.push(`Excellent exit — captured most of the move.`);
  }

  if (pnlPct < 0 && holdMin < 10) {
    parts.push(`Quick loss — consider longer min hold to avoid whipsaws.`);
  }

  if (exitReason.includes('stale') || exitReason.includes('momentum_lost')) {
    if (peakPnlPct > 30) {
      parts.push(`Token pumped ${peakPnlPct.toFixed(0)}% at peak — momentum exit may have been premature.`);
    }
  }

  return parts.join(' ') || `${tokenSymbol}: ${pnlPct > 0 ? 'Winner' : 'Loser'} (${pnlPct.toFixed(1)}%).`;
}

/**
 * Generate a report card for a closed position.
 * Call this when a position is closed.
 */
export async function generateReportCard(
  userId: string,
  position: {
    id: string;
    token_symbol: string;
    token_address: string;
    amount_eth: number;
    price_at_trade: number;
    peak_price: number;
    pnl_eth: number;
    created_at: string;
    closed_at: string;
    reasoning: string;
  },
  strategy: string,
): Promise<ReportCard> {
  const holdMin = (new Date(position.closed_at).getTime() - new Date(position.created_at).getTime()) / 60000;
  const pnlPct = position.amount_eth > 0 ? (position.pnl_eth / position.amount_eth) * 100 : 0;
  const peakPnlPct = position.price_at_trade > 0 && position.peak_price > 0
    ? ((position.peak_price - position.price_at_trade) / position.price_at_trade) * 100
    : 0;

  const entryG = gradeEntry(pnlPct, peakPnlPct);
  const exitG = gradeExit(pnlPct, peakPnlPct);
  const overallG = overallGrade(entryG, exitG);
  const exitReason = position.reasoning || 'unknown';
  const lesson = generateLesson(position.token_symbol, pnlPct, peakPnlPct, holdMin, exitReason, entryG, exitG);

  // Store in trading_history as extra fields (no new table needed)
  await supabaseAdmin.from("trading_history").update({
    entry_grade: entryG,
    exit_grade: exitG,
    overall_grade: overallG,
    lesson_learned: lesson,
  }).eq("id", position.id);

  return {
    token_symbol: position.token_symbol,
    pnl_pct: pnlPct,
    hold_minutes: Math.round(holdMin),
    exit_reason: exitReason,
    entry_grade: entryG,
    exit_grade: exitG,
    overall_grade: overallG,
    lesson_learned: lesson,
  };
}

/**
 * Get recent report cards for AI prompt.
 */
export async function getReportCardsForPrompt(userId: string, limit = 10): Promise<string> {
  const { data: trades } = await supabaseAdmin.from("trading_history")
    .select("token_symbol, amount_eth, pnl_eth, entry_grade, exit_grade, overall_grade, lesson_learned, created_at, closed_at, peak_price, price_at_trade")
    .eq("user_id", userId)
    .not("closed_at", "is", null)
    .neq("action", "skip")
    .order("closed_at", { ascending: false })
    .limit(limit);

  if (!trades?.length) return "No closed trades yet — build your track record.";

  const winners = trades.filter(t => (t.pnl_eth || 0) > 0);
  const losers = trades.filter(t => (t.pnl_eth || 0) < 0);
  const avgWinPct = winners.length > 0
    ? winners.reduce((s, t) => s + ((t.pnl_eth || 0) / (t.amount_eth || 1)) * 100, 0) / winners.length
    : 0;
  const avgLossPct = losers.length > 0
    ? losers.reduce((s, t) => s + ((t.pnl_eth || 0) / (t.amount_eth || 1)) * 100, 0) / losers.length
    : 0;

  const cardLines = trades.slice(0, 10).map((t, i) => {
    const pnl = t.amount_eth > 0 ? ((t.pnl_eth || 0) / t.amount_eth * 100).toFixed(1) : "0";
    const grade = t.overall_grade || "?";
    const entryG = t.entry_grade || "?";
    const exitG = t.exit_grade || "?";
    const lesson = t.lesson_learned || "";
    return `${i + 1}. ${t.token_symbol}: ${Number(pnl) >= 0 ? "+" : ""}${pnl}% | Grade: ${grade} (entry:${entryG} exit:${exitG}) | ${lesson}`;
  });

  const patterns: string[] = [];
  const dOrF = trades.filter(t => t.entry_grade === 'D' || t.entry_grade === 'F').length;
  if (dOrF > trades.length * 0.4) patterns.push(`You chase too often: ${dOrF}/${trades.length} entries graded D or F (entering late)`);
  const goodExits = trades.filter(t => t.exit_grade === 'A' || t.exit_grade === 'B').length;
  if (goodExits > trades.length * 0.5) patterns.push(`Your exits are solid: ${goodExits}/${trades.length} exits graded B or above`);
  if (avgWinPct > 0) patterns.push(`Avg winner: +${avgWinPct.toFixed(1)}% | Avg loser: ${avgLossPct.toFixed(1)}%`);

  return `TRADE REPORT CARDS (last ${trades.length}):\n${cardLines.join("\n")}\n\nPATTERNS:\n${patterns.join("\n") || "Not enough data for pattern analysis yet."}`;
}

/**
 * Update post-exit prices for recently closed positions.
 * Call this from the SLTP cron every 3 min.
 */
export async function updatePostExitPrices(): Promise<void> {
  // Find positions closed in the last 4 hours that don't have post-exit prices yet
  const fourHoursAgo = new Date(Date.now() - 4 * 3600_000).toISOString();
  const { data: recentlyClosed } = await supabaseAdmin.from("trading_history")
    .select("id, token_address, closed_at, price_30min_after, price_1h_after")
    .not("closed_at", "is", null)
    .gte("closed_at", fourHoursAgo)
    .eq("action", "buy")
    .limit(20);

  if (!recentlyClosed?.length) return;

  for (const pos of recentlyClosed) {
    const closedAt = new Date(pos.closed_at).getTime();
    const now = Date.now();
    const minSinceClose = (now - closedAt) / 60_000;

    // Only update if enough time has passed and field is null
    const updates: Record<string, number> = {};

    if (minSinceClose >= 30 && !pos.price_30min_after) {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.token_address}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          const pair = data.pairs?.find((p: any) => p.chainId === "base");
          if (pair) {
            const price = parseFloat(pair.priceUsd || "0");
            if (price > 0) {
              if (minSinceClose >= 30 && !pos.price_30min_after) updates.price_30min_after = price;
              if (minSinceClose >= 60 && !pos.price_1h_after) updates.price_1h_after = price;
            }
          }
        }
      } catch {}
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from("trading_history").update(updates).eq("id", pos.id);
    }
  }
}
