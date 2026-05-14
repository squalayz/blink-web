import { NextRequest, NextResponse } from "next/server";
import { readSiweSession } from "@/lib/siwe-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await readSiweSession(req);
  if (!session) return NextResponse.json({ session: null });
  return NextResponse.json({ session });
}
