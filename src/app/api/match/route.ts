import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAgentProfile, embedAgent, evolveAgent } from "@/lib/matching";

// POST /api/match — generate agent, accept/pass (NO manual matching trigger)
export async function POST(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  try {
    const body = await req.json();
    const { action, match_id } = body;

    // ── Accept or Pass (the ONLY user-facing match action) ──
    if (action === "accept" || action === "pass") {
      if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });

      const { data: match } = await supabaseAdmin.from("matches").select("*").eq("id", match_id).single();
      if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

      const isA = match.user_a === userId;
      const isB = match.user_b === userId;
      if (!isA && !isB) return NextResponse.json({ error: "Not your match" }, { status: 403 });

      const statusField = isA ? "status_a" : "status_b";
      const newStatus = action === "accept" ? "accepted" : "passed";

      const { data: updated, error } = await supabaseAdmin.from("matches")
        .update({ [statusField]: newStatus })
        .eq("id", match_id).select().single();
      if (error) throw error;

      // Agent Evolution: learn from this decision
      evolveAgent(userId, match_id, newStatus as "accepted" | "passed").catch(console.error);

      // If both accepted → notify + public feed
      if (updated.revealed) {
        const otherUserId = isA ? match.user_b : match.user_a;
        await supabaseAdmin.from("notifications").insert([
          { user_id: userId, type: "match_accepted", title: "Match unlocked!", body: "Both sides accepted. Profiles are revealed — start chatting!", metadata: { match_id } },
          { user_id: otherUserId, type: "match_accepted", title: "Match unlocked!", body: "Both sides accepted. Profiles are revealed — start chatting!", metadata: { match_id } },
        ]);

        // Public feed (if both users opt-in)
        const { data: userA } = await supabaseAdmin.from("users").select("name,industry,is_public").eq("id", match.user_a).single();
        const { data: userB } = await supabaseAdmin.from("users").select("name,industry,is_public").eq("id", match.user_b).single();
        if (userA?.is_public && userB?.is_public) {
          await supabaseAdmin.from("public_feed").insert({
            match_id, user_a_name: userA.name, user_b_name: userB.name,
            user_a_industry: userA.industry, user_b_industry: userB.industry,
            collab_type: match.synergy, score: match.score,
          });
        }

        // Check "first match" badge
        const { count } = await supabaseAdmin.from("matches").select("id", { count: "exact" }).eq("revealed", true).or(`user_a.eq.${userId},user_b.eq.${userId}`);
        if (count === 1) {
          await supabaseAdmin.from("badges").upsert(
            { user_id: userId, badge_type: "first_match", badge_name: "First Connection", badge_description: "Made your first mutual match" },
            { onConflict: "user_id,badge_type" }
          );
          await supabaseAdmin.from("notifications").insert({
            user_id: userId, type: "badge_earned", title: "Badge earned!", body: "First Connection — you made your first mutual match"
          });
        }
      }

      return NextResponse.json({ match: updated });
    }

    // ── Generate Agent Profile (on onboarding) ──
    if (action === "generate_agent") {
      const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const agentData = await generateAgentProfile(user);
      const { data: agent, error } = await supabaseAdmin.from("agent_profiles")
        .upsert({
          user_id: userId, ...agentData,
          new_user_boost_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "user_id" })
        .select().single();
      if (error) throw error;

      // Generate embedding for semantic matching (async, don't block)
      embedAgent(userId).catch(console.error);

      return NextResponse.json({ agent });
    }

    // ── Rate a match (1-5 stars) ──
    if (action === "rate") {
      const { match_id: rateMatchId, rating } = body;
      if (!rateMatchId || !rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "match_id and rating (1-5) required" }, { status: 400 });
      }

      const { data: m } = await supabaseAdmin.from("matches").select("*").eq("id", rateMatchId).single();
      if (!m) return NextResponse.json({ error: "Match not found" }, { status: 404 });

      const isA = m.user_a === userId;
      const isB = m.user_b === userId;
      if (!isA && !isB) return NextResponse.json({ error: "Not your match" }, { status: 403 });

      const ratingField = isA ? "user_a_rating" : "user_b_rating";
      await supabaseAdmin.from("matches").update({ [ratingField]: rating }).eq("id", rateMatchId);

      // Update other user's reputation score
      const otherUserId = isA ? m.user_b : m.user_a;
      const { data: allRatings } = await supabaseAdmin.from("matches")
        .select("user_a_rating, user_b_rating, user_a, user_b")
        .or(`user_a.eq.${otherUserId},user_b.eq.${otherUserId}`)
        .not("user_a_rating", "is", null).not("user_b_rating", "is", null);

      if (allRatings) {
        const ratings = allRatings.map(r => r.user_a === otherUserId ? r.user_b_rating : r.user_a_rating).filter(Boolean);
        // Include the new rating
        ratings.push(rating);
        const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
        await supabaseAdmin.from("agent_profiles").update({
          reputation_score: parseFloat(avg.toFixed(2)),
          reputation_count: ratings.length,
        }).eq("user_id", otherUserId);
      }

      return NextResponse.json({ ok: true, rating });
    }

    // ── Track chat opened / messages exchanged ──
    if (action === "track_chat") {
      const { match_id: trackId } = body;
      if (!trackId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

      await supabaseAdmin.from("matches").update({
        chat_opened: true,
        messages_exchanged: 1, // Increment handled separately
      }).eq("id", trackId);
      return NextResponse.json({ ok: true });
    }

    // ── Promoted match — pay to target a specific user ──
    if (action === "promote") {
      const { target_user_id } = body;
      if (!target_user_id) return NextResponse.json({ error: "target_user_id required" }, { status: 400 });
      if (target_user_id === userId) return NextResponse.json({ error: "Cannot promote to yourself" }, { status: 400 });

      // Check wallet balance
      const { getWalletBalance, payPromotedMatch, FEES } = await import("@/lib/wallet");
      const { data: mUser } = await supabaseAdmin
        .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
      if (!mUser?.wallet_encrypted_key) return NextResponse.json({ error: "No wallet" }, { status: 404 });

      const balance = await getWalletBalance(mUser.wallet_address);
      if (balance < FEES.PROMOTED_MATCH + 0.001) {
        return NextResponse.json({ error: `Need ${FEES.PROMOTED_MATCH} ETH + gas` }, { status: 400 });
      }

      // Pay
      const payResult = await payPromotedMatch(mUser.wallet_encrypted_key);
      if (!payResult.success) return NextResponse.json({ error: "Payment failed" }, { status: 500 });

      // Create promoted match record
      await supabaseAdmin.from("promoted_matches").insert({
        requester_id: userId, target_id: target_user_id,
        amount_eth: FEES.PROMOTED_MATCH, tx_hash: payResult.txHash,
      });

      return NextResponse.json({ ok: true, txHash: payResult.txHash });
    }

    // ── Instant scan — triggered on signup, runs matching for this user ──
    if (action === "scan") {
      // Fire and forget — don't block the response
      const { runAutonomousMatching } = await import("@/lib/matching");
      runAutonomousMatching().catch((e: any) => console.error("Scan error:", e));
      return NextResponse.json({ ok: true, message: "Scan triggered" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Match API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
    }

    // ═══ CREATE INVITE ═══
    if (action === "create_invite") {
      const { invitee_name } = body;
      
      // Generate unique invite code
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      
      // Get inviter's profile for personalized message
      const { data: inviter } = await supabaseAdmin.from("users").select("name").eq("id", userId).single();
      const inviterName = inviter?.name || "A builder";

      const message = invitee_name
        ? `Hey ${invitee_name} — ${inviterName}'s agent thinks you'd be a great fit for the mesh. Your skills might complement theirs perfectly. Want to see if your agent agrees?`
        : `${inviterName}'s agent flagged you as someone who might be a great fit for the mesh. Connect your agent to find out.`;

      const { data: invite, error } = await supabaseAdmin.from("invites").insert({
        inviter_id: userId,
        invite_code: code,
        invitee_name: invitee_name || null,
        agent_message: message,
      }).select("*").single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Also ensure user has a referral_code on their profile
      const { data: userData } = await supabaseAdmin.from("users").select("referral_code").eq("id", userId).single();
      if (!userData?.referral_code) {
        const refCode = "MM" + Math.random().toString(36).slice(2, 8).toUpperCase();
        await supabaseAdmin.from("users").update({ referral_code: refCode }).eq("id", userId);
      }

      return NextResponse.json({ invite: { code, message, inviter_name: inviterName } });
    }

    // ═══ GET INVITE (public — for landing page) ═══
    if (action === "get_invite") {
      const { code } = body;
      if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

      const { data: invite } = await supabaseAdmin.from("invites")
        .select("*, inviter:users!invites_inviter_id_fkey(name, orb_color)")
        .eq("invite_code", code)
        .is("claimed_by", null)
        .single();

      if (!invite) return NextResponse.json({ error: "Invite not found or already claimed" }, { status: 404 });

      return NextResponse.json({
        invite: {
          inviter_name: invite.inviter?.name || "A builder",
          inviter_color: invite.inviter?.orb_color || "#6366f1",
          agent_message: invite.agent_message,
          code,
        }
      });
    }

    // ═══ CLAIM INVITE (called during signup) ═══
    if (action === "claim_invite") {
      const { code } = body;
      if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

      const { data: invite } = await supabaseAdmin.from("invites")
        .select("*")
        .eq("invite_code", code)
        .is("claimed_by", null)
        .single();

      if (!invite) return NextResponse.json({ error: "Invalid or already claimed" }, { status: 400 });

      // Mark invite as claimed
      await supabaseAdmin.from("invites").update({
        claimed_by: userId,
        claimed_at: new Date().toISOString(),
      }).eq("id", invite.id);

      // Create referral record
      await supabaseAdmin.from("referrals").insert({
        referrer_id: invite.inviter_id,
        referred_user_id: userId,
        referral_code: code,
      });

      // Set referred_by on the new user
      await supabaseAdmin.from("users").update({
        referred_by: invite.inviter_id,
      }).eq("id", userId);

      // Notify the referrer
      await supabaseAdmin.from("notifications").insert({
        user_id: invite.inviter_id,
        type: "referral",
        message: `Your invite was claimed! You'll earn 10% of their deposit fees and 10% of their trade fees.`,
        metadata: JSON.stringify({ referred_user: userId, code }),
      });

      return NextResponse.json({ ok: true, referrer_id: invite.inviter_id });
    }

    // ═══ GET REFERRAL STATS ═══
    if (action === "referral_stats") {
      // Count referrals
      const { count: totalRefs } = await supabaseAdmin.from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", userId);

      // Get total rewards earned
      const { data: deposits } = await supabaseAdmin.from("deposits")
        .select("fee_eth")
        .in("user_id", 
          (await supabaseAdmin.from("referrals").select("referred_user_id").eq("referrer_id", userId))
            .data?.map((r: any) => r.referred_user_id) || []
        );

      const { data: trades } = await supabaseAdmin.from("trading_history")
        .select("fee_eth")
        .in("user_id",
          (await supabaseAdmin.from("referrals").select("referred_user_id").eq("referrer_id", userId))
            .data?.map((r: any) => r.referred_user_id) || []
        );

      const depositFeesFromRefs = (deposits || []).reduce((sum: number, d: any) => sum + (d.fee_eth || 0), 0);
      const tradeFeesFromRefs = (trades || []).reduce((sum: number, t: any) => sum + (t.fee_eth || 0), 0);
      const totalRewardsEarned = (depositFeesFromRefs + tradeFeesFromRefs) * 0.10; // 10% of fees

      // Get user's referral code
      const { data: userData } = await supabaseAdmin.from("users").select("referral_code").eq("id", userId).single();

      return NextResponse.json({
        total_referrals: totalRefs || 0,
        total_rewards_eth: totalRewardsEarned,
        deposit_fees_from_refs: depositFeesFromRefs,
        trade_fees_from_refs: tradeFeesFromRefs,
        referral_code: userData?.referral_code || null,
        reward_rate: "10%",
      });
    }

  }
}

// GET /api/match — get user's matches
export async function GET(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  const { data } = await supabaseAdmin.from("matches")
    .select("*, user_a_profile:users!matches_user_a_fkey(*), user_b_profile:users!matches_user_b_fkey(*)")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false });

  return NextResponse.json({ matches: data || [] });
}
