import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Spirit Gift on BLINK";

interface GiftRow {
  asset_type: "eth" | "blink" | "nft";
  asset_payload: {
    amount?: number;
    preview_name?: string;
  } | null;
  anonymous: boolean;
  sender_id: string | null;
}

interface SenderInfo {
  handle: string | null;
  display_name: string | null;
}

function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  const fixed = n.toFixed(6).replace(/\.?0+$/, "");
  const [whole, frac] = fixed.split(".");
  const wholeFmt = Number(whole).toLocaleString("en-US");
  return frac ? `${wholeFmt}.${frac}` : wholeFmt;
}

function computeSenderLabel(anonymous: boolean, sender: SenderInfo | null): string {
  if (anonymous || !sender) return "A mystery hunter";
  if (sender.handle) return `@${sender.handle}`;
  if (sender.display_name) return sender.display_name;
  return "A mystery hunter";
}

function computeAssetLabel(
  assetType: "eth" | "blink" | "nft",
  payload: GiftRow["asset_payload"],
): string {
  if (assetType === "nft") {
    return payload?.preview_name?.trim() || "a BLINK creature";
  }
  const amount = Number(payload?.amount ?? 0);
  if (assetType === "eth") return `${formatAmount(amount)} ETH`;
  return `${formatAmount(amount)} BLINK`;
}

async function loadGift(code: string): Promise<{ assetLabel: string; senderLabel: string }> {
  const fallback = { assetLabel: "a Spirit Gift", senderLabel: "A mystery hunter" };
  if (!/^[a-z0-9]{6,12}$/.test(code)) return fallback;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return fallback;

  try {
    const sb = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: gift } = await sb
      .from("gifts")
      .select("asset_type, asset_payload, anonymous, sender_id")
      .eq("short_code", code)
      .maybeSingle<GiftRow>();

    if (!gift) return fallback;

    let sender: SenderInfo | null = null;
    if (!gift.anonymous && gift.sender_id) {
      const { data: senderProfile } = await sb
        .from("profiles")
        .select("handle, display_name")
        .eq("id", gift.sender_id)
        .maybeSingle<SenderInfo>();
      if (senderProfile) sender = senderProfile;
    }

    return {
      assetLabel: computeAssetLabel(gift.asset_type, gift.asset_payload),
      senderLabel: computeSenderLabel(gift.anonymous, sender),
    };
  } catch {
    return fallback;
  }
}

export default async function Image({ params }: { params: { short_code: string } }) {
  const code = String(params.short_code || "").trim().toLowerCase();
  const { assetLabel, senderLabel } = await loadGift(code);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          display: "flex",
          position: "relative",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Aura — soft radial green glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at 30% 50%, rgba(0,255,136,0.30) 0%, rgba(0,255,136,0.12) 30%, transparent 60%)",
          }}
        />

        {/* Top-left: WATCHING + BLINK wordmark */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 64,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#00FF88",
              opacity: 0.6,
              display: "flex",
              marginBottom: 8,
            }}
          >
            WATCHING
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: 4,
              color: "#FFFFFF",
              display: "flex",
              lineHeight: 1,
              textShadow: "0 0 32px rgba(0,255,136,0.4)",
            }}
          >
            BLINK
          </div>
        </div>

        {/* Top-right: WORLDWIDE / 24/7 SIGHTINGS */}
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 64,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#00FF88",
              opacity: 0.5,
              display: "flex",
            }}
          >
            WORLDWIDE
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#00FF88",
              opacity: 0.5,
              display: "flex",
              marginTop: 6,
            }}
          >
            24/7 SIGHTINGS
          </div>
        </div>

        {/* Eye orb — center-left */}
        <div
          style={{
            position: "absolute",
            top: 245,
            left: 130,
            width: 140,
            height: 140,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at 50% 50%, #00FF88 0%, #44FF55 55%, #88FF00 100%)",
            boxShadow:
              "0 0 80px #00FF88AA, 0 0 160px rgba(0,255,136,0.45), 0 0 240px rgba(0,255,136,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              background: "#000000",
              display: "flex",
            }}
          />
        </div>

        {/* Center-right content block */}
        <div
          style={{
            position: "absolute",
            left: 330,
            right: 64,
            top: 200,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.05,
              letterSpacing: "-1px",
              display: "flex",
              textShadow: "0 2px 24px rgba(0,0,0,0.6)",
            }}
          >
            A Spirit Gift awaits
          </div>

          <div
            style={{
              marginTop: 22,
              fontSize: 32,
              fontWeight: 600,
              display: "flex",
              lineHeight: 1.2,
              color: "transparent",
              backgroundImage: "linear-gradient(90deg, #00FF88 0%, #FFFFFF 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {assetLabel}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 22,
              fontWeight: 500,
              color: "#FFFFFF",
              opacity: 0.65,
              display: "flex",
            }}
          >
            From {senderLabel}
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 64,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: "#00FF88",
              boxShadow: "0 0 10px #00FF88AA",
              display: "flex",
              marginRight: 10,
            }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#00FF88",
              display: "flex",
            }}
          >
            THE EYE IS OPEN
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#FFFFFF",
              opacity: 0.5,
              display: "flex",
            }}
          >
            BLINK
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 64,
            display: "flex",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#00FF88",
              opacity: 0.7,
              display: "flex",
            }}
          >
            blinkworld.xyz
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
