import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import GiftLandingClient from "./GiftLandingClient";

interface GiftRow {
  short_code: string;
  asset_type: "eth" | "blink" | "nft";
  asset_payload: {
    amount?: number;
    contract?: string;
    token_id?: string;
    preview_image?: string;
    preview_name?: string;
  } | null;
  anonymous: boolean;
  sender_id: string | null;
}

interface SenderInfo {
  handle: string | null;
  display_name: string | null;
}

async function loadGiftForMeta(code: string): Promise<{ gift: GiftRow; sender: SenderInfo | null } | null> {
  if (!/^[a-z0-9]{6,12}$/.test(code)) return null;

  const { data: gift } = await supabaseAdmin
    .from("gifts")
    .select("short_code, asset_type, asset_payload, anonymous, sender_id")
    .eq("short_code", code)
    .maybeSingle<GiftRow>();

  if (!gift) return null;

  let sender: SenderInfo | null = null;
  if (!gift.anonymous && gift.sender_id) {
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("handle, display_name")
      .eq("id", gift.sender_id)
      .maybeSingle<SenderInfo>();
    if (senderProfile) sender = senderProfile;
  }

  return { gift, sender };
}

function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  // Trim trailing zeros after the decimal sanely (e.g. 0.0100 → 0.01)
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

export async function generateMetadata({
  params,
}: {
  params: { short_code: string };
}): Promise<Metadata> {
  const code = String(params.short_code || "").trim().toLowerCase();
  const ogPath = `/gift/${code}/opengraph-image`;

  const loaded = await loadGiftForMeta(code).catch(() => null);

  if (!loaded) {
    const title = "A Spirit Gift awaits — BLINK";
    const description = "A mystery hunter sent you a Spirit Gift. Open it to find where it spawned in the real world.";
    return {
      title,
      description,
      openGraph: {
        title: "A Spirit Gift awaits",
        description,
        url: `https://blinkworld.xyz/gift/${code}`,
        siteName: "BLINK",
        images: [{ url: ogPath, width: 1200, height: 630 }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "A Spirit Gift awaits",
        description,
        images: [ogPath],
      },
    };
  }

  const senderLabel = computeSenderLabel(loaded.gift.anonymous, loaded.sender);
  const assetLabel = computeAssetLabel(loaded.gift.asset_type, loaded.gift.asset_payload);

  return {
    title: "A Spirit Gift awaits — BLINK",
    description: `${senderLabel} sent you ${assetLabel}. Open it to find where it spawned in the real world.`,
    openGraph: {
      title: "A Spirit Gift awaits",
      description: `${senderLabel} sent ${assetLabel}. Catch it before someone else does.`,
      url: `https://blinkworld.xyz/gift/${code}`,
      siteName: "BLINK",
      images: [{ url: ogPath, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "A Spirit Gift awaits",
      description: `${senderLabel} sent ${assetLabel}.`,
      images: [ogPath],
    },
  };
}

export default function GiftLandingPage() {
  return <GiftLandingClient />;
}
