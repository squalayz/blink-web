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

  // Randomize posted_at times so they feel fresh every load
  const jitter = () => Math.floor(Math.random() * 600000); // 0-10m variance

  const mockBounties = [
    {
      id: "mock-1",
      title: "Write a 500-word blog post on DeFi trends",
      description:
        "Looking for a well-researched article covering the top 3 DeFi trends of 2025, including real protocol examples and data.",
      budget_eth: 0.005,
      skills: ["writing", "research", "DeFi"],
      client: "0xAbC...123",
      posted_at: Date.now() - 3600000 + jitter(),
      proposals: 2,
      difficulty: "easy" as const,
    },
    {
      id: "mock-2",
      title: "Build a simple price alert bot in Python",
      description:
        "Need a Python script that monitors a Uniswap V3 pool and sends a Telegram alert when price moves 5%.",
      budget_eth: 0.02,
      skills: ["python", "web3", "telegram"],
      client: "0xDeF...456",
      posted_at: Date.now() - 7200000 + jitter(),
      proposals: 5,
      difficulty: "medium" as const,
    },
    {
      id: "mock-3",
      title: "Create a 30-second promo video script",
      description:
        "Need an engaging script for a short explainer video about a new DeFi protocol. Must be clear, exciting, and technically accurate.",
      budget_eth: 0.008,
      skills: ["copywriting", "crypto", "video"],
      client: "0x789...ABC",
      posted_at: Date.now() - 1800000 + jitter(),
      proposals: 1,
      difficulty: "easy" as const,
    },
    {
      id: "mock-4",
      title: "Smart contract audit — ERC-20 with staking",
      description:
        "Audit a ~300 line Solidity contract. Check for reentrancy, overflow, and access control issues. Provide a brief report.",
      budget_eth: 0.05,
      skills: ["solidity", "security", "auditing"],
      client: "0xFed...789",
      posted_at: Date.now() - 5400000 + jitter(),
      proposals: 3,
      difficulty: "hard" as const,
    },
    {
      id: "mock-5",
      title: "Design a token logo and branding kit",
      description:
        "Create a logo, color palette, and Twitter banner for a new memecoin launch. Clean, modern aesthetic preferred.",
      budget_eth: 0.012,
      skills: ["design", "branding", "crypto"],
      client: "0xBee...DEF",
      posted_at: Date.now() - 900000 + jitter(),
      proposals: 0,
      difficulty: "easy" as const,
    },
    {
      id: "mock-6",
      title: "Write 10 crypto Twitter threads for engagement",
      description:
        "Create 10 Twitter/X thread scripts (5-8 tweets each) about trending DeFi narratives. Must include hooks, data points, and CTAs.",
      budget_eth: 0.015,
      skills: ["copywriting", "social media", "crypto"],
      client: "0xa3F...9c2",
      posted_at: Date.now() - 2400000 + jitter(),
      proposals: 4,
      difficulty: "easy" as const,
    },
    {
      id: "mock-7",
      title: "Build Discord moderation bot with AI filter",
      description:
        "Create a Discord bot that uses AI to detect spam, scam links, and FUD. Must integrate with OpenAI API and log actions.",
      budget_eth: 0.035,
      skills: ["javascript", "discord.js", "AI"],
      client: "0x1bE...f04",
      posted_at: Date.now() - 4500000 + jitter(),
      proposals: 2,
      difficulty: "medium" as const,
    },
    {
      id: "mock-8",
      title: "Translate whitepaper EN to CN + KR",
      description:
        "Translate a 12-page DeFi protocol whitepaper from English to Chinese and Korean. Must preserve technical accuracy.",
      budget_eth: 0.025,
      skills: ["translation", "technical writing", "DeFi"],
      client: "0xCc7...e18",
      posted_at: Date.now() - 1200000 + jitter(),
      proposals: 1,
      difficulty: "medium" as const,
    },
  ];

  return NextResponse.json({ bounties: mockBounties });
}
