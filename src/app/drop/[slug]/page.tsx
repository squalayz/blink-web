import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ipfsToGatewayUrl } from "@/lib/spawn-pool";
import DropLandingClient from "./DropLandingClient";

interface DropRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string;
  image_cid: string;
  blink_reward: number | null;
  spawn_id: string | null;
  caught_by: string | null;
  caught_at: string | null;
  expires_at: string;
  proximity_radius_m: number;
}

interface CatcherInfo {
  handle: string | null;
  display_name: string | null;
}

async function loadDrop(
  slug: string,
): Promise<{ drop: DropRow; catcher: CatcherInfo | null } | null> {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug)) return null;
  const { data: drop } = await supabaseAdmin
    .from("genesis_drops")
    .select(
      "id, slug, name, description, tier, image_cid, blink_reward, spawn_id, caught_by, caught_at, expires_at, proximity_radius_m",
    )
    .eq("slug", slug)
    .maybeSingle<DropRow>();
  if (!drop) return null;
  let catcher: CatcherInfo | null = null;
  if (drop.caught_by) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("handle, display_name")
      .eq("id", drop.caught_by)
      .maybeSingle<CatcherInfo>();
    if (profile) catcher = profile;
  }
  return { drop, catcher };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = String(params.slug || "").trim().toLowerCase();
  const loaded = await loadDrop(slug).catch(() => null);

  if (!loaded) {
    return {
      title: "Genesis Drop — BLINK",
      description: "A rare BLINK creature is hidden somewhere in the world.",
    };
  }

  const title = `${loaded.drop.name} — Genesis Drop`;
  const description =
    loaded.drop.description ||
    "A rare BLINK creature is hidden in the world. First to open the link spawns it nearby. First to catch it wins.";
  const image = ipfsToGatewayUrl(`ipfs://${loaded.drop.image_cid}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://blinkworld.xyz/drop/${slug}`,
      siteName: "BLINK",
      images: image ? [{ url: image, width: 1024, height: 1024 }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function DropLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = String(params.slug || "").trim().toLowerCase();
  const loaded = await loadDrop(slug);

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            Drop not found
          </div>
          <div style={{ color: "#8a8a99", fontSize: 14 }}>
            This Genesis Drop slug doesn&apos;t exist or has been removed.
          </div>
        </div>
      </div>
    );
  }

  const { drop, catcher } = loaded;
  const imageUrl = ipfsToGatewayUrl(`ipfs://${drop.image_cid}`);
  const expired = new Date(drop.expires_at).getTime() < Date.now();
  const caught = !!drop.caught_by;
  const anchored = !!drop.spawn_id;
  const catcherLabel = catcher?.handle
    ? `@${catcher.handle}`
    : catcher?.display_name || "a hunter";

  return (
    <DropLandingClient
      slug={drop.slug}
      name={drop.name}
      description={drop.description}
      tier={drop.tier}
      imageUrl={imageUrl}
      blinkReward={drop.blink_reward}
      expiresAt={drop.expires_at}
      anchored={anchored}
      caught={caught}
      expired={expired}
      catcherLabel={catcher ? catcherLabel : null}
      proximityRadiusM={drop.proximity_radius_m}
    />
  );
}
