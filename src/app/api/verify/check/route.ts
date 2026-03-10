import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

const RATE_LIMIT_MS = 30_000;
const rateLimitMap = new Map<string, number>();

async function fetchWithUA(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.text();
}

function checkCodeInHtml(html: string, code: string): boolean {
  return html.includes(code);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { platform, handle, tweetUrl } = await req.json();
    if (!platform || !handle) return NextResponse.json({ error: "Missing platform or handle" }, { status: 400 });

    // Rate limit
    const rlKey = `${user.id}:${platform}`;
    const lastCheck = rateLimitMap.get(rlKey) || 0;
    if (Date.now() - lastCheck < RATE_LIMIT_MS) {
      return NextResponse.json({ verified: false, message: "Please wait 30 seconds between checks." }, { status: 429 });
    }
    rateLimitMap.set(rlKey, Date.now());

    const cleanHandle = handle.replace(/^@/, "").trim();

    // Look up pending verification
    const { data: verification } = await supabaseAdmin
      .from("social_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .single();

    if (!verification || !verification.verification_code) {
      return NextResponse.json({ verified: false, message: "No verification started. Get a code first." }, { status: 400 });
    }

    const code = verification.verification_code;
    let found = false;

    if (platform === "instagram") {
      try {
        const html = await fetchWithUA(`https://www.instagram.com/${cleanHandle}/`);
        found = checkCodeInHtml(html, code);
      } catch {
        return NextResponse.json({ verified: false, message: "Could not access profile. Make sure your account is public." });
      }
    } else if (platform === "x") {
      // Try tweet URL first
      if (tweetUrl) {
        try {
          const html = await fetchWithUA(tweetUrl);
          found = checkCodeInHtml(html, code);
        } catch {
          // Fall through to profile search
        }
      }
      // Fallback: search profile
      if (!found) {
        const urls = [
          `https://nitter.net/${cleanHandle}`,
          `https://x.com/${cleanHandle}`,
        ];
        for (const url of urls) {
          try {
            const html = await fetchWithUA(url);
            if (checkCodeInHtml(html, code)) { found = true; break; }
          } catch { /* try next */ }
        }
      }
      if (!found) {
        return NextResponse.json({ verified: false, message: "Code not found. Make sure your tweet is public and contains only the code." });
      }
    }

    if (found) {
      // Mark verified in social_verifications
      await supabaseAdmin.from("social_verifications").update({
        verified: true,
        verified_at: new Date().toISOString(),
      }).eq("user_id", user.id).eq("platform", platform);

      // Update agent_profiles
      const updateFields = platform === "instagram"
        ? { instagram_handle: cleanHandle, instagram_verified: true }
        : { x_handle: cleanHandle, x_verified: true };
      await supabaseAdmin.from("agent_profiles").update(updateFields).eq("user_id", user.id);

      const platformName = platform === "instagram" ? "Instagram" : "X";
      return NextResponse.json({
        verified: true,
        message: `${platformName} verified! You can now remove the code from your ${platform === "instagram" ? "bio" : "tweet"}.`,
      });
    }

    return NextResponse.json({
      verified: false,
      message: platform === "instagram"
        ? "Code not found in bio. Make sure you saved your Instagram profile after adding the code."
        : "Code not found. Make sure your tweet is public and contains only the code.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
