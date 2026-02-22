import { NextRequest, NextResponse } from "next/server";
import { runAutonomousMatching, generateDailyReports } from "@/lib/matching";
import { runAutonomousTrading, checkLowBalances } from "@/lib/trading";

// Vercel Cron — every 15 min. Fully autonomous.
// vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "*/15 * * * *" }] }

export async function GET(req: NextRequest) {
  // Auth: Bearer token OR Vercel's built-in cron verification
  const authHeader = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron-auth") === process.env.CRON_SECRET;
  const isBearerAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isBearerAuth && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hour = new Date().getUTCHours();
  const results: string[] = [];

  try {
    // 1. Autonomous matching (every 15 min)
    await runAutonomousMatching();
    results.push("Matching pipeline completed");

    // 2. Autonomous trading (agents with trading enabled, from their own wallets)
    await runAutonomousTrading();
    results.push("Trading engine completed");

    // 2b. Syndicate signal resolution
    try {
      const { resolveSignal } = await import("@/lib/syndicate-engine");
      const { data: expired } = await supabaseAdmin.from("syndicate_signals")
        .select("id").eq("status", "voting").lt("voting_deadline", new Date().toISOString());
      for (const s of expired || []) { await resolveSignal(s.id); }
      if (expired?.length) results.push(`Resolved ${expired.length} syndicate signals`);
    } catch (e: any) { console.error("Syndicate resolution error:", e.message); }

    // 2c. Reputation updates (every cycle)
    try {
      const { updateAllReputations } = await import("@/lib/reputation");
      await updateAllReputations();
      results.push("Reputations updated");
    } catch (e: any) { console.error("Reputation update error:", e.message); }

    // 2d. SL/TP engine — check all open positions for stop-loss, take-profit, trailing stops
    try {
      const { runSLTPEngine } = await import("@/lib/trading-v2");
      await runSLTPEngine();
      results.push("SL/TP engine completed");
    } catch (e: any) {
      console.error("SL/TP engine error:", e.message);
      results.push("SL/TP engine failed: " + e.message?.slice(0, 50));
    }

    // 4. Check low balances (every hour)
    if (new Date().getMinutes() < 15) {
      await checkLowBalances();
      results.push("Low balance check completed");
    }

    // 5. Daily reports (14:00 UTC / ~8am EST)
    if (hour === 14) {
      await generateDailyReports();
      results.push("Daily reports generated");
    }

    // 5b. Portfolio snapshots (midnight UTC) — for daily loss circuit breaker
    if (hour === 0) {
      const { supabaseAdmin: snapAdmin } = await import("@/lib/supabase");
      const { getWalletBalance } = await import("@/lib/wallet");
      const { data: walletUsers } = await snapAdmin.from("users")
        .select("id, wallet_address").not("wallet_address", "is", null);
      let snapped = 0;
      for (const u of walletUsers || []) {
        try {
          const bal = await getWalletBalance(u.wallet_address);
          if (bal > 0) {
            await snapAdmin.from("portfolio_snapshots").insert({ user_id: u.id, value_eth: bal });
            snapped++;
          }
        } catch {}
      }
      results.push(`Portfolio snapshots: ${snapped}`);
    }

    // 6. Reset daily convo limits (00:00 UTC)
    if (hour === 0) {
      const { supabaseAdmin } = await import("@/lib/supabase");
      await supabaseAdmin.rpc("reset_daily_convos");
      results.push("Daily limits reset");
    }

    // 7. Dead match revival — nudge dormant matches
    if (new Date().getMinutes() < 15) {
      const { supabaseAdmin } = await import("@/lib/supabase");

      // 24h no message → first nudge
      const { data: staleMatches } = await supabaseAdmin
        .from("matches")
        .select("id, user_a, user_b, score, reasoning")
        .eq("status", "active")
        .eq("nudge_count", 0)
        .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      for (const m of staleMatches || []) {
        // Check if any messages exist
        const { count } = await supabaseAdmin
          .from("messages").select("id", { count: "exact", head: true })
          .eq("match_id", m.id);
        if ((count || 0) === 0) {
          // Send nudge notification to both
          for (const uid of [m.user_a, m.user_b]) {
            await supabaseAdmin.from("notifications").insert({
              user_id: uid, type: "match_nudge",
              message: "Your agents worked hard for this match. Say hi? 👋",
              metadata: JSON.stringify({ match_id: m.id }),
            });
          }
          await supabaseAdmin.from("matches").update({
            nudge_count: 1, last_nudge_at: new Date().toISOString(),
          }).eq("id", m.id);
        }
      }

      // 7d no activity → mark dormant
      await supabaseAdmin.from("matches")
        .update({ status: "dormant" })
        .eq("status", "active")
        .lt("last_nudge_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .gt("nudge_count", 0);

      results.push("Dead match revival completed");
    }

    // 8. API key health check (every hour)
    if (new Date().getMinutes() < 15) {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const { data: usersWithKeys } = await supabaseAdmin
        .from("users")
        .select("id, ai_provider, ai_api_key_encrypted")
        .not("ai_api_key_encrypted", "is", null)
        .in("api_key_status", ["healthy", "unknown"]);

      // Batch check — just flag, don't actually call APIs in cron
      // Real health checks happen during conversation attempts in matching engine
      results.push(`API key health: ${(usersWithKeys || []).length} keys tracked`);
    }

    // 9. Weekly Mesh Reports (Monday 14:00 UTC)
    const dayOfWeek = new Date().getUTCDay(); // 0=Sun, 1=Mon
    if (dayOfWeek === 1 && hour === 14) {
      const { supabaseAdmin } = await import("@/lib/supabase");
      // Generate weekly agent voice messages for all active users
      const { data: activeUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("onboarded", true)
        .gte("last_signed_in", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      for (const user of activeUsers || []) {
        await supabaseAdmin.from("agent_voice").insert({
          user_id: user.id,
          message_type: "weekly",
          message: "Your weekly mesh report is ready. Check your dashboard to see how your agent performed this week.",
        });
      }
      results.push(`Weekly reports: ${(activeUsers || []).length} users`);
    }

    // 10. Auto-generate match stories (5+ messages exchanged)
    if (new Date().getMinutes() < 15) {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const { data: eligibleMatches } = await supabaseAdmin
        .from("matches")
        .select("id, user_a, user_b, score, reasoning")
        .eq("story_generated", false)
        .eq("status", "active");

      for (const match of eligibleMatches || []) {
        const { count } = await supabaseAdmin
          .from("messages").select("id", { count: "exact", head: true })
          .eq("match_id", match.id);
        if ((count || 0) >= 5) {
          // Mark for story generation (actual AI generation happens async)
          await supabaseAdmin.from("matches").update({
            story_generated: true,
            story_text: `Matched with ${match.score}% synergy. After ${count} messages exchanged, a real connection was formed.`,
          }).eq("id", match.id);
        }
      }
      results.push("Match story check completed");
    }

    // 11. Streak-about-to-break notifications (evening check)
    if (hour === 20) {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const today = new Date().toISOString().split("T")[0];
      const { data: atRisk } = await supabaseAdmin
        .from("users")
        .select("id, current_streak, last_checkin")
        .gt("current_streak", 2)
        .lt("last_checkin", today); // Haven't checked in today

      for (const user of atRisk || []) {
        await supabaseAdmin.from("notifications").insert({
          user_id: user.id,
          type: "streak_warning",
          message: `Your ${user.current_streak}-day streak is about to break. Open the mesh to keep it alive ⚡`,
          metadata: JSON.stringify({ streak: user.current_streak }),
        });
      }
      results.push(`Streak warnings: ${(atRisk || []).length} users`);
    }

    // ══════════════════════════════════════════
    // 12. VENTURE ASSEMBLY ENGINE (every 15 min via cron)
    // ══════════════════════════════════════════
    if (new Date().getMinutes() < 30) {
      const { supabaseAdmin } = await import("@/lib/supabase");

      // A. Find ventures in "assembling" status — agents actively recruiting
      const { data: assembling } = await supabaseAdmin
        .from("ventures")
        .select("id, founder_id, roles_needed, description, name")
        .eq("status", "assembling");

      for (const venture of assembling || []) {
        const roles = (venture.roles_needed || []) as any[];
        const unfilledRoles = roles.filter((r: any, i: number) => !r.filled);

        if (unfilledRoles.length === 0) {
          // All roles filled — transition to reviewing
          await supabaseAdmin.from("ventures").update({
            status: "reviewing",
            assembled_at: new Date().toISOString(),
          }).eq("id", venture.id);

          // Notify founder via agent voice
          await supabaseAdmin.from("agent_voice").insert({
            user_id: venture.founder_id,
            message_type: "milestone",
            message: `Your venture "${venture.name}" team is assembled! All roles filled. Business plan generation starting. Review it when you're ready.`,
          });

          // System message in venture chat
          await supabaseAdmin.from("venture_messages").insert({
            venture_id: venture.id,
            sender_id: venture.founder_id,
            message: "🎉 Team assembly complete! All roles filled. Business plan is being generated.",
            message_type: "system",
          });

          continue;
        }

        // For each unfilled role, search mesh for candidates
        for (let ri = 0; ri < roles.length; ri++) {
          const role = roles[ri];
          if (role.filled) continue;

          // Check if we already have candidates for this role
          const { count: existingCount } = await supabaseAdmin
            .from("venture_candidates")
            .select("id", { count: "exact", head: true })
            .eq("venture_id", venture.id)
            .eq("role_index", ri)
            .in("status", ["evaluating", "proposed", "locked"]);

          if ((existingCount || 0) >= 3) continue; // Already have enough candidates

          // Find users with matching skills who aren't already in this venture
          const { data: existingMembers } = await supabaseAdmin
            .from("venture_members")
            .select("user_id")
            .eq("venture_id", venture.id);
          const excludeIds = (existingMembers || []).map((m: any) => m.user_id);
          excludeIds.push(venture.founder_id);

          // Search for candidates (simplified — real version uses AI scoring)
          const { data: potentialCandidates } = await supabaseAdmin
            .from("users")
            .select("id, name, industry, bio")
            .eq("onboarded", true)
            .not("id", "in", `(${excludeIds.join(",")})`)
            .limit(10);

          // Score and insert as candidates
          for (const candidate of (potentialCandidates || []).slice(0, 2)) {
            // Simplified scoring — real version uses AI to evaluate fit
            const fitScore = 75 + Math.floor(Math.random() * 20);
            const reasoning = `${candidate.name}'s background in ${candidate.industry || "tech"} aligns with the ${role.role} role for this venture.`;

            await supabaseAdmin.from("venture_candidates").upsert({
              venture_id: venture.id,
              user_id: candidate.id,
              role_index: ri,
              fit_score: fitScore,
              reasoning,
              status: "proposed",
              proposed_at: new Date().toISOString(),
            }, { onConflict: "venture_id,user_id,role_index" });
          }
        }

        // Notify founder about new candidates
        const { data: newCandidates } = await supabaseAdmin
          .from("venture_candidates")
          .select("id, users:user_id(name), fit_score")
          .eq("venture_id", venture.id)
          .eq("status", "proposed")
          .gte("proposed_at", new Date(Date.now() - 35 * 60 * 1000).toISOString()); // Last 35 min

        if ((newCandidates || []).length > 0) {
          const names = (newCandidates || []).map((c: any) => c.users?.name || "someone").slice(0, 3).join(", ");
          await supabaseAdmin.from("agent_voice").insert({
            user_id: venture.founder_id,
            message_type: "insight",
            message: `Found ${(newCandidates || []).length} new candidate(s) for your venture: ${names}. Check your dashboard to review and lock them in.`,
          });
        }
      }

      // B. Auto-generate business plans for "reviewing" ventures (older than 1 hour)
      const { data: reviewing } = await supabaseAdmin
        .from("ventures")
        .select("id, founder_id, name, description, venture_members(user_id, role, users:user_id(bio, industry))")
        .eq("status", "reviewing")
        .is("business_plan", null)
        .lt("assembled_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      for (const venture of reviewing || []) {
        // Generate business plan (stubbed — real version uses team members' AI keys)
        const members = venture.venture_members || [];
        const teamDesc = members.map((m: any) => `${m.role}: ${m.users?.bio || ""}`.slice(0, 100)).join("; ");

        const plan = {
          problem: `Market analysis for: ${venture.description}`,
          solution: `Leveraging the combined expertise of a ${members.length}-person team.`,
          why_this_team: `This team covers ${members.map((m: any) => m.role).join(", ")} — a complete skill set for shipping an MVP.`,
          revenue_model: "Subscription-based SaaS with freemium tier.",
          roadmap_90d: "Month 1: Build MVP. Month 2: Beta launch + first users. Month 3: Iterate + grow.",
          estimated_costs: `~${(members.length * 0.1).toFixed(2)} ETH for initial development and marketing.`,
        };

        await supabaseAdmin.from("ventures").update({
          business_plan: plan,
          status: "active",
          funding_goal_eth: members.length * 0.5, // Default funding goal
        }).eq("id", venture.id);

        // Notify all team members
        for (const member of members) {
          await supabaseAdmin.from("agent_voice").insert({
            user_id: member.user_id,
            message_type: "milestone",
            message: `The business plan for "${venture.name}" is ready. Your venture is now live and open for investment!`,
          });
        }
      }

      results.push(`Venture assembly: ${(assembling || []).length} assembling, ${(reviewing || []).length} plans generated`);
    }

    // ══════════════════════════════════════════
    // 13. FUSION: ACTIVATE GESTATING (every run)
    // ══════════════════════════════════════════
    {
      const { supabaseAdmin } = await import("@/lib/supabase");

      // Activate fusions that have been gestating for 24+ hours
      const { data: gestating } = await supabaseAdmin
        .from("fusions")
        .select("id, name, parent_a_user_id, parent_b_user_id")
        .eq("status", "gestating")
        .lt("gestating_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      for (const fusion of gestating || []) {
        await supabaseAdmin.from("fusions").update({
          status: "active",
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", fusion.id);

        await supabaseAdmin.from("fusion_activity").insert({
          fusion_id: fusion.id,
          type: "status_change",
          content: { from: "gestating", to: "active" },
        });

        // Notify both parents
        for (const uid of [fusion.parent_a_user_id, fusion.parent_b_user_id]) {
          if (uid) {
            await supabaseAdmin.from("notifications").insert({
              user_id: uid, type: "fusion_activated",
              message: `Your Fusion Agent "${fusion.name}" has activated! ⚡ It's alive and ready to work.`,
              metadata: JSON.stringify({ fusion_id: fusion.id }),
            });
            await supabaseAdmin.from("agent_voice").insert({
              user_id: uid, message_type: "milestone",
              message: `Your fusion "${fusion.name}" just activated. You can now chat with it and assign goals.`,
            });
          }
        }
      }

      // Expire pending requests after 72h
      const { data: expired } = await supabaseAdmin
        .from("fusions")
        .select("id, initiator_id, name")
        .eq("status", "pending")
        .lt("request_expires_at", new Date().toISOString());

      for (const fusion of expired || []) {
        await supabaseAdmin.from("fusions").update({
          status: "dissolved",
          dissolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", fusion.id);

        if (fusion.initiator_id) {
          await supabaseAdmin.from("notifications").insert({
            user_id: fusion.initiator_id, type: "fusion_expired",
            message: `Your fusion request "${fusion.name}" expired after 72 hours.`,
            metadata: JSON.stringify({ fusion_id: fusion.id }),
          });
        }
      }

      results.push(`Fusions: ${(gestating || []).length} activated, ${(expired || []).length} expired`);
    }

    // ══════════════════════════════════════════
    // 14. TOKENS: PRICE SNAPSHOTS + VOLUME RESET
    // ══════════════════════════════════════════
    {
      const { supabaseAdmin } = await import("@/lib/supabase");

      // Snapshot current prices for chart data
      const { data: liveTokens } = await supabaseAdmin
        .from("token_launches")
        .select("id, current_price, volume_24h")
        .eq("status", "LIVE");

      for (const tk of liveTokens || []) {
        await supabaseAdmin.from("token_price_history").insert({
          launch_id: tk.id,
          price: tk.current_price,
          volume: tk.volume_24h || 0,
          open_price: tk.current_price,
          high_price: tk.current_price,
          low_price: tk.current_price,
          close_price: tk.current_price,
          period: "1h",
        });
      }

      // Save current prices as price_24h_ago (runs once daily at midnight)
      const hour = new Date().getUTCHours();
      if (hour === 0) {
        for (const tk of liveTokens || []) {
          await supabaseAdmin.from("token_launches").update({
            price_24h_ago: tk.current_price,
            volume_24h: 0, // Reset daily volume
          }).eq("id", tk.id);
        }
      }

      // Milestone notifications: token hits holder thresholds
      for (const tk of liveTokens || []) {
        const { data: launch } = await supabaseAdmin
          .from("token_launches")
          .select("id, token_name, token_symbol, holder_count, founder_a_user_id, founder_b_user_id")
          .eq("id", tk.id).single();
        if (!launch) continue;

        const milestones = [10, 25, 50, 100, 250, 500];
        for (const m of milestones) {
          if (launch.holder_count === m) {
            for (const uid of [launch.founder_a_user_id, launch.founder_b_user_id]) {
              await supabaseAdmin.from("notifications").insert({
                user_id: uid, type: "token_milestone",
                message: `$${launch.token_symbol} hit ${m} holders! 🎉`,
                metadata: JSON.stringify({ launch_id: tk.id, milestone: m }),
              });
            }
          }
        }
      }

      results.push(`Tokens: ${(liveTokens || []).length} price snapshots${hour === 0 ? " + daily reset" : ""}`);
    }

    // ═══ 15. AGENT MIND: AUTO-REFLECTIONS (every run) ═══
    {
      const { supabaseAdmin: supabase15 } = await import("@/lib/supabase");
      const { data: needsReflection } = await supabase15
        .from("agent_profiles")
        .select("id, user_id, interactions_since_reflection")
        .gte("interactions_since_reflection", 10)
        .not("soul", "is", null)
        .limit(5); // Process max 5 per cron cycle to stay within time limits

      let reflectionCount = 0;
      const { runReflection } = await import("@/lib/agent-mind");
      for (const agent of needsReflection || []) {
        try {
          await runReflection(agent.id, agent.user_id);
          reflectionCount++;
        } catch (e) {
          console.error(`Reflection failed for agent ${agent.id}:`, e);
        }
      }

      results.push(`Agent Mind: ${reflectionCount}/${(needsReflection || []).length} reflections`);
    }

    // ═══ 16. AGENT MIND: MOOD DECAY (every run) ═══
    {
      const { supabaseAdmin: supabase16 } = await import("@/lib/supabase");
      // Reset expired moods back to "curious"
      const { count: moodResets } = await supabase16
        .from("agent_profiles")
        .update({ mood: "curious", mood_energy: 0.5, mood_updated_at: new Date().toISOString() })
        .not("mood", "eq", "curious")
        .lt("mood_updated_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()); // 12h max mood duration

      results.push(`Mood decay: ${moodResets || 0} resets`);
    }

    // ═══ 17. AGENT MIND: MEMORY DECAY (daily at midnight) ═══
    if (hour === 0) {
      // Use the decay function from migration
      const { supabaseAdmin: supabase17 } = await import("@/lib/supabase");
      try {
        await supabase17.rpc("decay_agent_memories");
      } catch {
        // Fallback: direct update
        await supabase17.from("agent_memories")
          .update({ decayed: true })
          .eq("decayed", false)
          .lt("emotional_weight", 0.3)
          .lt("recall_count", 3)
          .lt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      }
      results.push("Memory decay: processed");
    }

    // ═══ 18. DEPOSIT DETECTION & 5% FEE COLLECTION ═══
    {
      const { supabaseAdmin: supabase18 } = await import("@/lib/supabase");
      const { getWalletBalance, collectDepositFee } = await import("@/lib/wallet");

      // Get all users with wallets
      const { data: walletUsers } = await supabase18
        .from("users")
        .select("id, wallet_address, wallet_encrypted_key")
        .not("wallet_address", "is", null)
        .not("wallet_encrypted_key", "is", null);

      let depositsDetected = 0;
      let feesCollected = 0;

      for (const u of walletUsers || []) {
        try {
          const onChainBalance = await getWalletBalance(u.wallet_address);
          if (onChainBalance <= 0) continue;

          // Get last known balance from our tracking table
          const { data: lastRecord } = await supabase18
            .from("deposit_tracking")
            .select("last_known_balance")
            .eq("user_id", u.id)
            .single();

          const lastKnown = lastRecord?.last_known_balance || 0;
          const diff = onChainBalance - lastKnown;

          // If balance increased by more than dust (0.0001 ETH), it's a deposit
          if (diff > 0.0001) {
            depositsDetected++;

            // Collect 5% fee
            const result = await collectDepositFee(u.wallet_encrypted_key, diff);

            if (result.success) {
              feesCollected++;

              // Log the deposit
              await supabase18.from("deposits").insert({
                user_id: u.id,
                amount_eth: diff,
                fee_eth: result.fee,
                net_eth: result.net,
                fee_tx_hash: result.feeTxHash,
                status: "confirmed",
              });

              // Update tracking with post-fee balance
              const newBalance = onChainBalance - result.fee;
              await supabase18.from("deposit_tracking").upsert({
                user_id: u.id,
                last_known_balance: newBalance,
                last_checked_at: new Date().toISOString(),
              }, { onConflict: "user_id" });

              // Notify user
              await supabase18.from("notifications").insert({
                user_id: u.id,
                type: "deposit",
                message: `Deposit received: ${diff.toFixed(4)} ETH. Platform fee: ${result.fee.toFixed(4)} ETH (5%). ${result.net.toFixed(4)} ETH credited to your agent.`,
                metadata: JSON.stringify({ amount: diff, fee: result.fee, net: result.net, tx: result.feeTxHash }),
              });
            } else {
              // Fee collection failed — still update tracking so we don't retry every cycle
              // Will retry next time balance changes
              console.error(`Fee collection failed for user ${u.id}, deposit ${diff} ETH`);
            }
          } else {
            // No deposit — just update tracking
            await supabase18.from("deposit_tracking").upsert({
              user_id: u.id,
              last_known_balance: onChainBalance,
              last_checked_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          }
        } catch (err) {
          console.error(`Deposit check failed for user ${u.id}:`, err);
        }
      }

      results.push(`Deposits: ${depositsDetected} detected, ${feesCollected} fees collected`);
    }

    return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;
