import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { platform, handle } = await req.json();
    if (!platform || !handle) return NextResponse.json({ error: "Missing platform or handle" }, { status: 400 });
    if (!["instagram", "x"].includes(platform)) return NextResponse.json({ error: "Invalid platform" }, { status: 400 });

    const cleanHandle = handle.replace(/^@/, "").trim();
    if (!cleanHandle || cleanHandle.length < 1) return NextResponse.json({ error: "Invalid handle" }, { status: 400 });

    const code = `mm-${randomBytes(4).toString("hex")}`;

    const { error } = await supabaseAdmin.from("social_verifications").upsert(
      { user_id: user.id, platform, handle: cleanHandle, verification_code: code, verified: false, verified_at: null },
      { onConflict: "user_id,platform" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const instructions = platform === "instagram"
      ? "Add this code anywhere in your Instagram bio, then click Verify. You can remove it after."
      : "Post a tweet containing only this code, then paste the tweet URL below and click Verify. You can delete the tweet after.";

    return NextResponse.json({ code, instructions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
