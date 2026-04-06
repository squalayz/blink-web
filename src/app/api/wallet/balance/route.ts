import { NextRequest, NextResponse } from "next/server";

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
  const res = await fetch("https://mainnet.base.org", {
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
  return parseInt(data.result, 16) / 1e18; // hex wei to ETH
}

async function getBtcBalance(address: string): Promise<number> {
  const res = await fetch(`https://mempool.space/api/address/${address}`);
  if (!res.ok) throw new Error("mempool.space fetch failed");
  const data = await res.json();
  const funded: number = data.chain_stats?.funded_txo_sum ?? 0;
  const spent: number = data.chain_stats?.spent_txo_sum ?? 0;
  return (funded - spent) / 1e8; // satoshis to BTC
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const solAddress = searchParams.get("sol_address");
  const ethAddress = searchParams.get("eth_address");
  const btcAddress = searchParams.get("btc_address");

  if (!solAddress && !ethAddress && !btcAddress) {
    return NextResponse.json(
      {
        error:
          "At least one address param required: sol_address, eth_address, btc_address",
      },
      { status: 400 }
    );
  }

  const results: { sol: number; eth: number; btc: number } = {
    sol: 0,
    eth: 0,
    btc: 0,
  };

  const errors: string[] = [];

  await Promise.all([
    solAddress
      ? getSolBalance(solAddress)
          .then((v) => (results.sol = v))
          .catch((e) => errors.push(`SOL: ${e.message}`))
      : Promise.resolve(),

    ethAddress
      ? getEthBalance(ethAddress)
          .then((v) => (results.eth = v))
          .catch((e) => errors.push(`ETH: ${e.message}`))
      : Promise.resolve(),

    btcAddress
      ? getBtcBalance(btcAddress)
          .then((v) => (results.btc = v))
          .catch((e) => errors.push(`BTC: ${e.message}`))
      : Promise.resolve(),
  ]);

  return NextResponse.json(
    { ...results, ...(errors.length ? { errors } : {}) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
