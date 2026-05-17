import { headers } from "next/headers";
import WalkClient from "./WalkClient";

// Default center when no edge-IP geo is available (NYC). Walk mode auto-starts
// the user at this position — a fine demo location when geolocation is unknown
// (localhost, non-Vercel hosts). Real GPS still overrides once it resolves.
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

export const dynamic = "force-dynamic";

export default function GiftWalkPage() {
  const h = headers();
  const latStr = h.get("x-vercel-ip-latitude");
  const lngStr = h.get("x-vercel-ip-longitude");
  const lat = latStr ? Number(latStr) : NaN;
  const lng = lngStr ? Number(lngStr) : NaN;
  const initialCenter =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : DEFAULT_CENTER;

  return <WalkClient initialCenter={initialCenter} />;
}
