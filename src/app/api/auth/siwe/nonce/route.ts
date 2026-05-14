import { NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { setNonceCookie } from "@/lib/siwe-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const nonce = generateSiweNonce();
  await setNonceCookie(nonce);
  return NextResponse.json({ nonce });
}
