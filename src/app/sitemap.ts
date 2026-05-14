import { MetadataRoute } from "next";

const BASE = "https://blinkworld.xyz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE}/watch`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${BASE}/council`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.7 },
    { url: `${BASE}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/trails`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${BASE}/squads`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
  ];
}
