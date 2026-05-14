import { NextResponse } from "next/server";
import { clearSiweSession } from "@/lib/siwe-session";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSiweSession();
  return NextResponse.json({ ok: true });
}
