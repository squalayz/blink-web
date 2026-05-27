import { NextRequest, NextResponse } from "next/server";
import {
  upsertSpawnsForCells,
  neighborCellIds,
  currentEpochBucket,
} from "@/lib/wild-spawns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const US_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "Houston", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix", lat: 33.4484, lng: -112.074 },
  { name: "Philadelphia", lat: 39.9526, lng: -75.1652 },
  { name: "San Antonio", lat: 29.4241, lng: -98.4936 },
  { name: "San Diego", lat: 32.7157, lng: -117.1611 },
  { name: "Dallas", lat: 32.7767, lng: -96.797 },
  { name: "San Jose", lat: 37.3382, lng: -121.8863 },
  { name: "Austin", lat: 30.2672, lng: -97.7431 },
  { name: "Jacksonville", lat: 30.3322, lng: -81.6557 },
  { name: "Fort Worth", lat: 32.7555, lng: -97.3308 },
  { name: "Columbus", lat: 39.9612, lng: -82.9988 },
  { name: "Charlotte", lat: 35.2271, lng: -80.8431 },
  { name: "Indianapolis", lat: 39.7684, lng: -86.1581 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "Seattle", lat: 47.6062, lng: -122.3321 },
  { name: "Denver", lat: 39.7392, lng: -104.9903 },
  { name: "Nashville", lat: 36.1627, lng: -86.7816 },
  { name: "Oklahoma City", lat: 35.4676, lng: -97.5164 },
  { name: "El Paso", lat: 31.7619, lng: -106.485 },
  { name: "Washington DC", lat: 38.9072, lng: -77.0369 },
  { name: "Las Vegas", lat: 36.1699, lng: -115.1398 },
  { name: "Louisville", lat: 38.2527, lng: -85.7585 },
  { name: "Baltimore", lat: 39.2904, lng: -76.6122 },
  { name: "Milwaukee", lat: 43.0389, lng: -87.9065 },
  { name: "Albuquerque", lat: 35.0844, lng: -106.6504 },
  { name: "Tucson", lat: 32.2226, lng: -110.9747 },
  { name: "Fresno", lat: 36.7378, lng: -119.7871 },
  { name: "Sacramento", lat: 38.5816, lng: -121.4944 },
  { name: "Mesa", lat: 33.4152, lng: -111.8315 },
  { name: "Kansas City", lat: 39.0997, lng: -94.5786 },
  { name: "Atlanta", lat: 33.749, lng: -84.388 },
  { name: "Omaha", lat: 41.2565, lng: -95.9345 },
  { name: "Colorado Springs", lat: 38.8339, lng: -104.8214 },
  { name: "Raleigh", lat: 35.7796, lng: -78.6382 },
  { name: "Long Beach", lat: 33.7701, lng: -118.1937 },
  { name: "Virginia Beach", lat: 36.8529, lng: -75.978 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Oakland", lat: 37.8044, lng: -122.2712 },
  { name: "Minneapolis", lat: 44.9778, lng: -93.265 },
  { name: "Tampa", lat: 27.9506, lng: -82.4572 },
  { name: "Tulsa", lat: 36.154, lng: -95.9928 },
  { name: "Arlington TX", lat: 32.7357, lng: -97.1081 },
  { name: "New Orleans", lat: 29.9511, lng: -90.0715 },
  { name: "Wichita", lat: 37.6872, lng: -97.3301 },
  { name: "Cleveland", lat: 41.4993, lng: -81.6944 },
  { name: "Bakersfield", lat: 35.3733, lng: -119.0187 },
  { name: "Aurora CO", lat: 39.7294, lng: -104.8319 },
  { name: "Boston", lat: 42.3601, lng: -71.0589 },
  { name: "Detroit", lat: 42.3314, lng: -83.0458 },
  { name: "Portland", lat: 45.5152, lng: -122.6784 },
  { name: "Memphis", lat: 35.1495, lng: -90.049 },
  { name: "St. Louis", lat: 38.627, lng: -90.1994 },
  { name: "Pittsburgh", lat: 40.4406, lng: -79.9959 },
  { name: "Cincinnati", lat: 39.1031, lng: -84.512 },
  { name: "Salt Lake City", lat: 40.7608, lng: -111.891 },
  { name: "Honolulu", lat: 21.3099, lng: -157.8581 },
  { name: "Anchorage", lat: 61.2181, lng: -149.9003 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Seoul", lat: 37.5665, lng: 126.978 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { name: "Sao Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Cairo", lat: 30.0444, lng: 31.2357 },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { name: "Jakarta", lat: -6.2088, lng: 106.8456 },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { name: "Barcelona", lat: 41.3851, lng: 2.1734 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { name: "Bogota", lat: 4.711, lng: -74.0721 },
  { name: "Manila", lat: 14.5995, lng: 120.9842 },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631 },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { name: "Shanghai", lat: 31.2304, lng: 121.4737 },
  { name: "Moscow", lat: 55.7558, lng: 37.6173 },
  { name: "Madrid", lat: 40.4168, lng: -3.7038 },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bucket = currentEpochBucket();
  const cellSet = new Set<string>();
  for (const city of US_CITIES) {
    for (const cellId of neighborCellIds(city.lat, city.lng)) {
      cellSet.add(cellId);
    }
  }
  const cellIds = Array.from(cellSet);

  const result = await upsertSpawnsForCells(cellIds, bucket);
  if (result.error) {
    return NextResponse.json(
      { error: "Seed failed", details: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    seeded_cities: US_CITIES.length,
    total_cells: cellIds.length,
    inserted: result.inserted,
    bucket,
  });
}
