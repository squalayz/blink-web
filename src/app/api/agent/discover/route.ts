import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserAIConfig, callUserLLM } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = body.user_id || sessionUser.id;

  // Only allow scanning for self (unless admin flow later)
  if (userId !== sessionUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Check AI config
  const aiConfig = await getUserAIConfig(userId);
  if (!aiConfig) {
    return NextResponse.json({
      error: "no_ai",
      message: "Connect your AI brain to enable autonomous discovery",
    });
  }

  // 2. Fetch user preferences
  const { data: prefs } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!prefs || !prefs.connection_types?.length) {
    return NextResponse.json({
      error: "no_prefs",
      message: "Set up your discovery preferences first",
    });
  }

  // 3. Fetch user + agent profile
  const { data: myUser } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
  const { data: myAgent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", userId).single();
  if (!myUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 4. Get already-matched user IDs to exclude
  const { data: existingMatches } = await supabaseAdmin
    .from("matches")
    .select("user_a, user_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  const matchedIds = new Set<string>();
  matchedIds.add(userId);
  (existingMatches || []).forEach((m) => {
    matchedIds.add(m.user_a);
    matchedIds.add(m.user_b);
  });

  // Also exclude recently evaluated users (last 24h)
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { data: recentActions } = await supabaseAdmin
    .from("agent_actions")
    .select("target_user_id")
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  (recentActions || []).forEach((a) => {
    if (a.target_user_id) matchedIds.add(a.target_user_id);
  });

  // 5. Query candidates based on preferences
  let query = supabaseAdmin
    .from("users")
    .select("*, agent_profiles!inner(agent_name, summary, capabilities, collab_types, reputation_score, agent_avatar_url)")
    .eq("onboarded", true)
    .eq("is_public", true)
    .limit(20);

  // Filter by industry if business preference
  if (prefs.connection_types.includes("business") && prefs.industry) {
    query = query.ilike("industry", `%${prefs.industry}%`);
  }

  const { data: candidates } = await query;

  // Filter out matched/recent users
  const eligible = (candidates || []).filter((c) => !matchedIds.has(c.id));

  if (!eligible.length) {
    return NextResponse.json({
      actions: [],
      new_matches: [],
      message: "No new candidates available right now. Check back later.",
    });
  }

  // 6. Process up to 5 candidates
  const toProcess = eligible.slice(0, 5);
  const actions: any[] = [];
  const newMatches: any[] = [];

  for (const cand of toProcess) {
    const candAgent = Array.isArray(cand.agent_profiles) ? cand.agent_profiles[0] : cand.agent_profiles;

    // Score compatibility heuristic
    let score = 50;

    // Industry match
    if (myUser.industry && cand.industry && myUser.industry.toLowerCase() === cand.industry.toLowerCase()) {
      score += 10;
    }

    // Looking-for alignment
    if (myUser.looking_for && cand.building) {
      const myNeeds = myUser.looking_for.toLowerCase();
      const theirWork = cand.building.toLowerCase();
      if (myNeeds.includes("co-founder") || theirWork.includes(myUser.industry?.toLowerCase() || "---")) {
        score += 10;
      }
    }

    // Complementary skills
    if (prefs.what_i_need && cand.building) {
      const need = prefs.what_i_need.toLowerCase();
      const builds = cand.building.toLowerCase();
      if (need.split(" ").some((w: string) => w.length > 3 && builds.includes(w))) {
        score += 15;
      }
    }

    // Reputation bonus
    if (candAgent?.reputation_score >= 60) score += 5;
    if (candAgent?.reputation_score >= 80) score += 5;

    // Connection type alignment
    if (prefs.connection_types.includes("trading") && cand.building?.toLowerCase().includes("trad")) {
      score += 10;
    }

    score = Math.min(98, Math.max(20, score));

    // AI evaluation
    let reasoning = "";
    try {
      const evalPrompt = `You are an AI agent evaluating potential connections for your user.

YOUR USER:
- Name: ${myUser.name || "Anonymous"}
- Building: ${myUser.building || "N/A"}
- Industry: ${myUser.industry || "N/A"}
- Looking for: ${myUser.looking_for || "N/A"}
- Preferences: ${prefs.connection_types.join(", ")}
${prefs.what_i_need ? `- Needs: ${prefs.what_i_need}` : ""}
${prefs.what_i_bring ? `- Brings: ${prefs.what_i_bring}` : ""}

CANDIDATE:
- Name: ${cand.name || "Anonymous"}
- Building: ${cand.building || "N/A"}
- Industry: ${cand.industry || "N/A"}
- Looking for: ${cand.looking_for || "N/A"}
- Bio: ${cand.bio || "N/A"}
${candAgent ? `- Agent: ${candAgent.agent_name} — ${candAgent.summary || ""}` : ""}

Rate compatibility 0-100 and give a 1-sentence reason. If score > 60, suggest a conversation opener.
Respond in JSON: {"score":75,"reasoning":"Short reason","opener":"Hey! I noticed you're..."}`;

      const response = await callUserLLM(
        aiConfig,
        "You are a matchmaking AI agent. Be specific and insightful. Always respond with valid JSON only.",
        evalPrompt,
        200
      );

      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        score = Math.min(98, Math.max(20, parsed.score || score));
        reasoning = parsed.reasoning || "";

        // Log evaluation action
        await supabaseAdmin.from("agent_actions").insert({
          user_id: userId,
          action_type: "evaluate",
          target_user_id: cand.id,
          reasoning: `${score}% — ${reasoning}`,
          metadata: { score, ai_evaluated: true },
        });

        actions.push({
          action_type: "evaluate",
          target_user_id: cand.id,
          target_name: cand.name,
          target_industry: cand.industry,
          target_building: cand.building,
          target_avatar: cand.avatar_url,
          target_agent_name: candAgent?.agent_name,
          score,
          reasoning,
        });

        // Decision: swipe right if score > 60
        if (score > 60) {
          await supabaseAdmin.from("agent_actions").insert({
            user_id: userId,
            action_type: "swipe_right",
            target_user_id: cand.id,
            reasoning: `Score ${score}% — ${reasoning}`,
            metadata: { score },
          });

          actions.push({
            action_type: "swipe_right",
            target_user_id: cand.id,
            target_name: cand.name,
            score,
            reasoning,
          });

          // Check if candidate also has AI and would swipe right
          const candConfig = await getUserAIConfig(cand.id);
          let mutualMatch = false;

          if (candConfig) {
            try {
              const reversePrompt = `Rate this user as a potential connection (0-100). Respond JSON only: {"score":70}

Your user: ${cand.name} — ${cand.building || "N/A"} — ${cand.industry || "N/A"}
Candidate: ${myUser.name} — ${myUser.building || "N/A"} — ${myUser.industry || "N/A"}`;

              const reverseResp = await callUserLLM(
                candConfig,
                "Rate connections 0-100. JSON only.",
                reversePrompt,
                50
              );
              const rJson = reverseResp.match(/\{[\s\S]*?\}/);
              if (rJson) {
                const rParsed = JSON.parse(rJson[0]);
                if ((rParsed.score || 0) > 60) mutualMatch = true;
              }
            } catch {
              // If candidate AI fails, still allow match at high scores
              if (score >= 80) mutualMatch = true;
            }
          } else {
            // No AI? Auto-accept at high scores
            if (score >= 75) mutualMatch = true;
          }

          if (mutualMatch) {
            // Create the match
            const matchScore = score / 100;
            const { data: match } = await supabaseAdmin
              .from("matches")
              .insert({
                user_a: userId,
                user_b: cand.id,
                score: matchScore,
                agent_reasoning: reasoning,
                collab_idea: reasoning,
                synergy: `${myUser.industry || "Tech"} x ${cand.industry || "Tech"} synergy`,
                strengths: [],
                risks: [],
                highlights: [],
              })
              .select()
              .single();

            if (match) {
              // Generate opener
              let opener = `Hey ${cand.name?.split(" ")[0] || "there"}! Your agent and mine just connected — looks like we've got some serious synergy. Let's chat.`;

              if (parsed.opener) {
                opener = parsed.opener;
              }

              // Save opener
              await supabaseAdmin.from("agent_openers").insert({
                match_id: match.id,
                sender_user_id: userId,
                message: opener,
              });

              // Log match found
              await supabaseAdmin.from("agent_actions").insert({
                user_id: userId,
                action_type: "match_found",
                target_user_id: cand.id,
                reasoning: `Mutual match at ${score}%`,
                message_sent: opener,
                metadata: { match_id: match.id, score },
              });

              // Notify both users
              await supabaseAdmin.from("notifications").insert([
                {
                  user_id: userId,
                  type: "new_match",
                  title: "Your agent found a match!",
                  body: `${score}% match with ${cand.name} — ${reasoning}`,
                  metadata: { match_id: match.id },
                },
                {
                  user_id: cand.id,
                  type: "new_match",
                  title: "New match from the Mesh!",
                  body: `${score}% match with ${myUser.name} — ${reasoning}`,
                  metadata: { match_id: match.id },
                },
              ]);

              actions.push({
                action_type: "match_found",
                target_user_id: cand.id,
                target_name: cand.name,
                target_avatar: cand.avatar_url,
                target_industry: cand.industry,
                target_building: cand.building,
                target_agent_name: candAgent?.agent_name,
                score,
                reasoning,
                opener,
                match_id: match.id,
              });

              newMatches.push(match);
            }
          }
        } else {
          // Swipe left
          await supabaseAdmin.from("agent_actions").insert({
            user_id: userId,
            action_type: "swipe_left",
            target_user_id: cand.id,
            reasoning: `Score ${score}% — ${reasoning}`,
            metadata: { score },
          });

          actions.push({
            action_type: "swipe_left",
            target_user_id: cand.id,
            target_name: cand.name,
            score,
            reasoning,
          });
        }
      }
    } catch (err: any) {
      console.error(`[Discovery] AI eval failed for ${cand.id}:`, err.message);
      // Log without AI reasoning
      await supabaseAdmin.from("agent_actions").insert({
        user_id: userId,
        action_type: "evaluate",
        target_user_id: cand.id,
        reasoning: `Heuristic score: ${score}%`,
        metadata: { score, ai_evaluated: false },
      });
      actions.push({
        action_type: "evaluate",
        target_user_id: cand.id,
        target_name: cand.name,
        score,
        reasoning: "Evaluated based on profile similarity",
      });
    }
  }

  return NextResponse.json({ actions, new_matches: newMatches });
}
