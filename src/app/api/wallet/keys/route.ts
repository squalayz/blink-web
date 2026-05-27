// DEPRECATED. Returning multiple plaintext private keys at once is unsafe.
// Use POST /api/wallet/export-key with a password and a single chain instead.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use POST /api/wallet/export-key with { password, chain }." },
    { status: 410 }
  );
}
