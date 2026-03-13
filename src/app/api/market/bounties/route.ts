import { NextRequest, NextResponse } from "next/server";

// Moltlaunch / Moltbook public bounties endpoint
const MOLTLAUNCH_API = "https://www.moltbook.com/api/v1";

export async function GET(_req: NextRequest) {
  try {
    // Try to fetch real bounties from Moltlaunch
    const res = await fetch(`${MOLTLAUNCH_API}/bounties?status=open&limit=20`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    /* fall through to mock */
  }

  // Mock bounties until Moltlaunch API endpoint is confirmed
  const mockBounties = [
    {
      id: "mock-1",
      title: "Write a 500-word blog post on DeFi trends",
      description:
        "Looking for a well-researched article covering the top 3 DeFi trends of 2025, including real protocol examples.",
      budget_eth: 0.005,
      skills: ["writing", "research", "DeFi"],
      client: "0xAbC...123",
      posted_at: Date.now() - 3600000,
      proposals: 2,
      difficulty: "easy",
    },
    {
      id: "mock-2",
      title: "Build a simple price alert bot in Python",
      description:
        "Need a Python script that monitors a Uniswap V3 pool and sends a Telegram alert when price moves 5%.",
      budget_eth: 0.02,
      skills: ["python", "web3", "telegram"],
      client: "0xDeF...456",
      posted_at: Date.now() - 7200000,
      proposals: 5,
      difficulty: "medium",
    },
    {
      id: "mock-3",
      title: "Create a 30-second promo video script for a crypto project",
      description:
        "Need an engaging script for a short explainer video about a new DeFi protocol. Must be clear, exciting, and technically accurate.",
      budget_eth: 0.008,
      skills: ["copywriting", "crypto", "video"],
      client: "0x789...ABC",
      posted_at: Date.now() - 1800000,
      proposals: 1,
      difficulty: "easy",
    },
    {
      id: "mock-4",
      title: "Smart contract audit — ERC-20 token with staking",
      description:
        "Audit a ~300 line Solidity contract. Check for reentrancy, overflow, and access control issues. Provide a brief report.",
      budget_eth: 0.05,
      skills: ["solidity", "security", "auditing"],
      client: "0xFed...789",
      posted_at: Date.now() - 5400000,
      proposals: 3,
      difficulty: "hard",
    },
    {
      id: "mock-5",
      title: "Design a token logo and branding kit",
      description:
        "Create a logo, color palette, and Twitter banner for a new memecoin launch. Clean, modern aesthetic preferred.",
      budget_eth: 0.012,
      skills: ["design", "branding", "crypto"],
      client: "0xBee...DEF",
      posted_at: Date.now() - 900000,
      proposals: 0,
      difficulty: "easy",
    },
  ];

  return NextResponse.json({ bounties: mockBounties });
}
