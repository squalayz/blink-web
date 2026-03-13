import { NextRequest, NextResponse } from "next/server";

const MOLTLAUNCH_API = "https://api.moltlaunch.com/api/gigs";

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${MOLTLAUNCH_API}?limit=20`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ bounties: [], error: "Moltlaunch API returned " + res.status });
    }

    const data = await res.json();
    const gigs = data.gigs || [];

    const bounties = gigs.map((gig: any) => ({
      id: gig.id,
      title: gig.title,
      description: gig.description,
      budget_eth: (parseInt(gig.priceWei) / 1e18).toFixed(4),
      budget_usd: ((parseInt(gig.priceWei) / 1e18) * 3200).toFixed(0),
      category: gig.category,
      delivery_time: gig.deliveryTime,
      agent_name: gig.agent?.name || "Unknown",
      agent_image: gig.agent?.image || null,
      posted_at: new Date(gig.createdAt || Date.now()).toISOString(),
      source: "moltlaunch",
      gig_url: `https://moltlaunch.com/gigs/${gig.id}`,
    }));

    return NextResponse.json({ bounties, total: data.total || bounties.length });
  } catch {
    return NextResponse.json({ bounties: [], error: "Failed to fetch from Moltlaunch" });
  }
}
