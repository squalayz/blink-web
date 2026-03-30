import { NextRequest, NextResponse } from "next/server";

type Chain = "solana" | "ethereum" | "bitcoin";

// Rough USD rates — in production, fetch from CoinGecko/similar
async function fetchUsdRate(chain: Chain): Promise<number> {
  try {
    const ids: Record<Chain, string> = {
      solana: "solana",
      ethereum: "ethereum",
      bitcoin: "bitcoin",
    };
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids[chain]}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error("CoinGecko fetch failed");
    const data = await res.json();
    return data[ids[chain]]?.usd ?? 0;
  } catch {
    // Fallback rates
    const fallback: Record<Chain, number> = { solana: 170, ethereum: 3400, bitcoin: 85000 };
    return fallback[chain];
  }
}

async function getSolBalance(address: string): Promise<number> {
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return (data.result?.value ?? 0) / 1e9; // lamports to SOL
}

async function getEthBalance(address: string): Promise<number> {
  const rpcUrl = process.env.ALCHEMY_ETH_RPC || "https://eth.llamarpc.com";
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return parseInt(data.result, 16) / 1e18; // wei to ETH
}

async function getBtcBalance(address: string): Promise<number> {
  const res = await fetch(`https://blockstream.info/api/address/${address}`);
  if (!res.ok) throw new Error("Blockstream fetch failed");
  const data = await res.json();
  const funded = data.chain_stats?.funded_txo_sum ?? 0;
  const spent = data.chain_stats?.spent_txo_sum ?? 0;
  return (funded - spent) / 1e8; // satoshis to BTC
}

const CURRENCY_MAP: Record<Chain, string> = {
  solana: "SOL",
  ethereum: "ETH",
  bitcoin: "BTC",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chain") as Chain | null;

  if (!address || !chain) {
    return NextResponse.json(
      { error: "Missing required params: address, chain" },
      { status: 400 }
    );
  }

  if (!["solana", "ethereum", "bitcoin"].includes(chain)) {
    return NextResponse.json(
      { error: "Invalid chain. Must be solana, ethereum, or bitcoin" },
      { status: 400 }
    );
  }

  try {
    let balance: number;

    switch (chain) {
      case "solana":
        balance = await getSolBalance(address);
        break;
      case "ethereum":
        balance = await getEthBalance(address);
        break;
      case "bitcoin":
        balance = await getBtcBalance(address);
        break;
    }

    const usdRate = await fetchUsdRate(chain);
    const balanceUsd = balance * usdRate;

    return NextResponse.json(
      {
        balance,
        balanceUsd,
        chain,
        currency: CURRENCY_MAP[chain],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
