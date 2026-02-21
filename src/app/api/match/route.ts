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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Match API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
