import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(path);

    // Update user profile
    await supabaseAdmin
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    return NextResponse.json({ ok: true, avatar_url: publicUrl });
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
