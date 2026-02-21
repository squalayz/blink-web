import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/waitlist — join waitlist
export async function POST(req: NextRequest) {
  try {
    const { email, referral } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Check if already on waitlist
    const { data: existing } = await supabaseAdmin
      .from("waitlist")
      .select("id, position, referral_code")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json({
        message: "Already on waitlist",
        position: existing.position,
        referral_code: existing.referral_code,
      });
    }

    // Add to waitlist
    const { data, error } = await supabaseAdmin
      .from("waitlist")
      .insert({ email, referred_by: referral || null })
      .select("position, referral_code")
      .single();

    if (error) throw error;

    return NextResponse.json({
      message: "You're in!",
      position: data.position,
      referral_code: data.referral_code,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/waitlist — get stats
export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from("platform_stats")
      .select("*")
      .single();

    return NextResponse.json(data || { agents_live: 0, matches_made: 0, waitlist_count: 0 });
  } catch (err: any) {
    return NextResponse.json({ agents_live: 0, matches_made: 0, waitlist_count: 0 });
  }
}
