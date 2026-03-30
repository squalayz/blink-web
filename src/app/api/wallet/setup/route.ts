import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type Chain = "solana" | "ethereum" | "bitcoin";

const ADDRESS_VALIDATORS: Record<Chain, (addr: string) => boolean> = {
  solana: (addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr),
  ethereum: (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr),
  bitcoin: (addr) =>
    /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[0-9a-zA-Z]{25,90})$/.test(addr),
};

const CHAIN_COLUMN: Record<Chain, string> = {
  solana: "sol_address",
  ethereum: "eth_address",
  bitcoin: "btc_address",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, chain, address } = body as {
      userId?: string;
      chain?: Chain;
      address?: string;
    };

    if (!userId || !chain || !address) {
      return NextResponse.json(
        { error: "Missing required fields: userId, chain, address" },
        { status: 400 }
      );
    }

    if (!ADDRESS_VALIDATORS[chain]) {
      return NextResponse.json(
        { error: "Invalid chain. Must be solana, ethereum, or bitcoin" },
        { status: 400 }
      );
    }

    if (!ADDRESS_VALIDATORS[chain](address)) {
      return NextResponse.json(
        { error: `Invalid ${chain} address format` },
        { status: 400 }
      );
    }

    const column = CHAIN_COLUMN[chain];

    // Update the user's address for this chain
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ [column]: address, preferred_chain: chain })
      .eq("id", userId);

    if (updateError) {
      // If user row doesn't exist in users table, try profiles table
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ [column]: address, preferred_chain: chain })
        .eq("id", userId);

      if (profileError) {
        return NextResponse.json(
          { error: "Failed to update wallet address" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, address });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
