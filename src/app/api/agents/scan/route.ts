// ══════════════════════════════════════════════════════════════
// MishMesh — Agent Connection Scanner
// POST /api/agents/scan
// Takes a connection intent and finds matching users in the mesh
// Uses embedding similarity on agent profiles
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/matching";

interface ConnectionIntent {
  type: "romantic" | "professional" | "friendship" | "collaborator";
  traits: string[];
  vibe: string;
  industry?: string;
  dealBreakers?: string[];
  description: string; // natural language description of ideal person
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { intent }: { intent: ConnectionIntent } = body;

    if (!intent?.description) {
      return NextResponse.json({ error: "Intent description required" }, { status: 400 });
    }

    // Build a rich search query from the intent
    const searchQuery = [
      intent.description,
      intent.traits?.join(", "),
      intent.vibe,
      intent.industry,
    ].filter(Boolean).join(". ");

    // Generate embedding for the intent
    let intentEmbedding: number[] | null = null;
    try {
      intentEmbedding = await generateEmbedding(searchQuery);
    } catch {
      // fallback to keyword search if embedding fails
    }

    let candidates: any[] = [];

    if (intentEmbedding) {
      // Vector similarity search against agent profiles
      const { data: vectorResults } = await supabaseAdmin.rpc("match_agents_by_embedding", {
        query_embedding: intentEmbedding,
        match_threshold: 0.6,
        match_count: 20,
        exclude_user_id: user.id,
      });
      candidates = vectorResults || [];
    }

    // Fallback / supplement with keyword search on soul/bio
    if (candidates.length < 5) {
      const { data: keywordResults } = await supabaseAdmin
        .from("agent_profiles")
        .select(`
          id, agent_name, user_id, soul, mood,
          users!inner(id, name, bio, avatar_url, industry, is_public)
        `)
        .not("user_id", "eq", user.id)
        .not("soul", "is", null)
        .eq("users.is_public", true)
        .limit(20);

      if (keywordResults) {
        // Score by keyword overlap
        const intentWords = searchQuery.toLowerCase().split(/\s+/);
        const scored = keywordResults.map((agent: any) => {
          const soulText = JSON.stringify(agent.soul || {}).toLowerCase();
          const bioText = (agent.users?.bio || "").toLowerCase();
          const industryText = (agent.users?.industry || "").toLowerCase();
          const allText = `${soulText} ${bioText} ${industryText}`;

          const matchScore = intentWords.filter(w => w.length > 3 && allText.includes(w)).length;
          return { ...agent, matchScore };
        });

        scored.sort((a: any, b: any) => b.matchScore - a.matchScore);
        const existing = new Set(candidates.map((c: any) => c.user_id));
        for (const r of scored) {
          if (!existing.has(r.user_id) && candidates.length < 10) {
            candidates.push({ ...r, similarity: r.matchScore / intentWords.length });
          }
        }
      }
    }

    // Enrich candidates with user info + generate match reasoning
    const enriched = await Promise.all(
      candidates.slice(0, 5).map(async (candidate: any) => {
        // Get user info if not already included
        let userInfo = candidate.users || null;
        if (!userInfo) {
          const { data: u } = await supabaseAdmin
            .from("users")
            .select("id, name, bio, avatar_url, industry")
            .eq("id", candidate.user_id)
            .single();
          userInfo = u;
        }

        // Get agent soul for reasoning
        const soul = candidate.soul || {};
        const agentName = candidate.agent_name || "Agent";
        const userName = userInfo?.name || "Someone";
        const bio = userInfo?.bio || "";
        const industry = userInfo?.industry || soul.industry || "";

        // Generate simple reasoning from soul traits
        const traits = soul.traits || [];
        const topTraits = Array.isArray(traits) ? traits.slice(0, 3).join(", ") : "";
        const reasoning = generateReasoning(intent, soul, bio, industry, topTraits);

        // Calculate match score
        const similarity = candidate.similarity || 0.7;
        const matchPct = Math.round(Math.min(99, Math.max(50, similarity * 100)));

        return {
          userId: candidate.user_id,
          agentName,
          userName,
          bio,
          industry,
          avatarUrl: userInfo?.avatar_url || null,
          matchScore: matchPct,
          reasoning,
          topTraits: topTraits || "Builder energy",
          intentType: intent.type,
        };
      })
    );

    // Filter out nulls and sort by match score
    const results = enriched
      .filter(r => r && r.userName)
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ matches: results, intent, query: searchQuery });
  } catch (err: any) {
    console.error("[Scan] Error:", err.message);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}

function generateReasoning(
  intent: ConnectionIntent,
  soul: any,
  bio: string,
  industry: string,
  traits: string
): string {
  const vibe = intent.vibe?.toLowerCase() || "";
  const soulEnergy = soul.energy || soul.workStyle || "";

  if (intent.type === "romantic") {
    if (traits) return `Shares your energy. ${traits}. Crypto native who gets the lifestyle.`;
    return `Real one in the space. Builder mentality, aligned values.`;
  }
  if (intent.type === "professional" || intent.type === "collaborator") {
    if (industry) return `${industry} background. ${traits ? traits + "." : ""} Complementary to your goals.`;
    return `Builder with ${traits || "strong"} energy. Would complement your work style.`;
  }
  if (intent.type === "friendship") {
    return `${traits || "Good vibes"}. Someone who gets what you're building.`;
  }
  return `Strong alignment with what you're looking for. ${traits || ""}`;
}
