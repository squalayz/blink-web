import { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";

const BASE = "https://mishmesh.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE}/marketplace`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${BASE}/marketplace/leaderboard`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.7 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  // Dynamic: all live tokens
  let tokenPages: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabaseAdmin.from("token_launches")
      .select("id, updated_at").eq("status", "LIVE").limit(500);
    tokenPages = (data || []).map(t => ({
      url: `${BASE}/marketplace/${t.id}`,
      lastModified: new Date(t.updated_at),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    }));
  } catch {}

  return [...staticPages, ...tokenPages];
}
