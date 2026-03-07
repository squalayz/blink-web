import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage, coHuntActivatedMessage } from "@/lib/telegram";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mishmesh.ai";

// GET /api/co-hunt?userId=xxx — get active co-hunts for user
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const { data: coHunts } = await supabaseAdmin
      .from("co_hunts")
      .select("*")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .in("status", ["invited", "active"])
      .order("created_at", { ascending: false });

    // Enrich with partner info
    const enriched = [];
    for (const ch of coHunts || []) {
      const partnerId = ch.user_a === userId ? ch.user_b : ch.user_a;
      const { data: partner } = await supabaseAdmin
        .from("users")
        .select("id, name, avatar_url")
        .eq("id", partnerId)
        .single();

      enriched.push({
        ...ch,
        partner: partner || { id: partnerId, name: "Unknown", avatar_url: null },
        isInviter: ch.user_a === userId,
      });
    }

    return NextResponse.json({ coHunts: enriched });
  } catch (err: any) {
    console.error("[Co-Hunt GET]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/co-hunt — create/invite to co-hunt
export async function POST(req: NextRequest) {
  try {
    const { userId, partnerId, matchId, chain } = await req.json();

    if (!userId || !partnerId) {
      return NextResponse.json({ error: "Missing userId or partnerId" }, { status: 400 });
    }

    // Verify match exists and is revealed (mutual)
    if (matchId) {
      const { data: match } = await supabaseAdmin
        .from("matches")
        .select("id, revealed")
        .eq("id", matchId)
        .single();

      if (!match) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }
      if (!match.revealed) {
        return NextResponse.json({ error: "Match must be mutual (revealed) to co-hunt" }, { status: 403 });
      }
    }

    // Check no active co-hunt already exists between these users
    const { data: existing } = await supabaseAdmin
      .from("co_hunts")
      .select("id")
      .or(`and(user_a.eq.${userId},user_b.eq.${partnerId}),and(user_a.eq.${partnerId},user_b.eq.${userId})`)
      .in("status", ["invited", "active"])
      .limit(1);

    if (existing?.length) {
      return NextResponse.json({ error: "Active co-hunt already exists", coHuntId: existing[0].id }, { status: 409 });
    }

    const { data: coHunt, error } = await supabaseAdmin
      .from("co_hunts")
      .insert({
        user_a: userId,
        user_b: partnerId,
        match_id: matchId || null,
        chain: chain || "base",
        status: "invited",
      })
      .select()
      .single();

    if (error) throw error;

    // Notify partner via Telegram
    try {
      const { data: inviter } = await supabaseAdmin.from("users").select("name").eq("id", userId).single();
      const { data: partnerSettings } = await supabaseAdmin
        .from("notification_settings")
        .select("telegram_chat_id")
        .eq("user_id", partnerId)
        .single();

      if (partnerSettings?.telegram_chat_id) {
        await sendTelegramMessage(
          partnerSettings.telegram_chat_id,
          `🎯 *Co-Hunt Invite!*\n\n${inviter?.name || "Someone"} wants to hunt *${chain || "base"}* with you! Open MishMesh to accept.`,
          [[{ text: "🎯 Open Hunt", url: `${APP_URL}/hunt` }]]
        );
      }
    } catch {} // Don't fail if notification fails

    return NextResponse.json({ coHunt });
  } catch (err: any) {
    console.error("[Co-Hunt POST]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/co-hunt — accept invite
export async function PATCH(req: NextRequest) {
  try {
    const { coHuntId, userId } = await req.json();

    if (!coHuntId || !userId) {
      return NextResponse.json({ error: "Missing coHuntId or userId" }, { status: 400 });
    }

    const { data: coHunt } = await supabaseAdmin
      .from("co_hunts")
      .select("*")
      .eq("id", coHuntId)
      .single();

    if (!coHunt) return NextResponse.json({ error: "Co-hunt not found" }, { status: 404 });
    if (coHunt.user_b !== userId) return NextResponse.json({ error: "Only the invited user can accept" }, { status: 403 });
    if (coHunt.status !== "invited") return NextResponse.json({ error: "Co-hunt is not in invited status" }, { status: 400 });

    const { data: updated, error } = await supabaseAdmin
      .from("co_hunts")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", coHuntId)
      .select()
      .single();

    if (error) throw error;

    // Notify both users via Telegram
    try {
      const { data: userA } = await supabaseAdmin.from("users").select("name").eq("id", coHunt.user_a).single();
      const { data: userB } = await supabaseAdmin.from("users").select("name").eq("id", coHunt.user_b).single();

      const settingsPromises = [coHunt.user_a, coHunt.user_b].map(uid =>
        supabaseAdmin.from("notification_settings").select("telegram_chat_id, user_id").eq("user_id", uid).single()
      );
      const settingsResults = await Promise.all(settingsPromises);

      for (const { data: s } of settingsResults) {
        if (s?.telegram_chat_id) {
          const partnerName = s.user_id === coHunt.user_a ? (userB?.name || "your match") : (userA?.name || "your match");
          const msg = coHuntActivatedMessage(partnerName, coHunt.chain, APP_URL);
          await sendTelegramMessage(s.telegram_chat_id, msg.text, msg.keyboard);
        }
      }
    } catch {} // Don't fail if notification fails

    return NextResponse.json({ coHunt: updated });
  } catch (err: any) {
    console.error("[Co-Hunt PATCH]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/co-hunt — end co-hunt
export async function DELETE(req: NextRequest) {
  try {
    const { coHuntId, userId } = await req.json();

    if (!coHuntId || !userId) {
      return NextResponse.json({ error: "Missing coHuntId or userId" }, { status: 400 });
    }

    const { data: coHunt } = await supabaseAdmin
      .from("co_hunts")
      .select("user_a, user_b")
      .eq("id", coHuntId)
      .single();

    if (!coHunt) return NextResponse.json({ error: "Co-hunt not found" }, { status: 404 });
    if (coHunt.user_a !== userId && coHunt.user_b !== userId) {
      return NextResponse.json({ error: "Not your co-hunt" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("co_hunts")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", coHuntId);

    if (error) throw error;

    return NextResponse.json({ ended: true });
  } catch (err: any) {
    console.error("[Co-Hunt DELETE]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
