import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import {
  createSiweSession,
  readNonceCookie,
  setSiweCookies,
} from "@/lib/siwe-session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBlinkHoldings, tokenIds } from "@/lib/wallet-nfts";

export const dynamic = "force-dynamic";

type VerifyBody = { message?: string; signature?: string };

export async function POST(req: NextRequest) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, signature } = body;
  if (!message || !signature) {
    return NextResponse.json(
      { error: "message and signature are required" },
      { status: 400 },
    );
  }

  const expectedNonce = await readNonceCookie();
  if (!expectedNonce) {
    return NextResponse.json(
      { error: "Missing nonce. Request a new one." },
      { status: 400 },
    );
  }

  let siwe: SiweMessage;
  try {
    siwe = new SiweMessage(message);
  } catch {
    return NextResponse.json({ error: "Malformed SIWE message" }, { status: 400 });
  }

  try {
    const result = await siwe.verify({
      signature,
      nonce: expectedNonce,
    });
    if (!result.success) {
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 },
    );
  }

  const address = siwe.address.toLowerCase();
  const chainId = siwe.chainId ?? 1;

  // ── Issue our own httpOnly SIWE cookie ───────────────────────────────────
  const token = await createSiweSession({
    address,
    chainId,
    issuedAt: Math.floor(Date.now() / 1000),
  });
  await setSiweCookies(token);

  // ── Shadow Supabase user so the rest of the app keeps working ────────────
  // The brief removes magic-link/email auth from the UI; under the hood we
  // still need a Supabase user row keyed off the wallet for existing
  // profiles/orbs/etc. We create with a synthetic email and return a
  // single-use magiclink token the client trades for a session.
  let magicLink: string | null = null;
  let supabaseEmail: string | null = null;
  try {
    const email = `${address}@wallet.blink`;
    supabaseEmail = email;

    // Look up an existing user by email; create if missing.
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const known = existing?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (!known) {
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { wallet_address: address, auth_method: "siwe" },
      });
    }

    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    // hashed_token is the value the client exchanges with verifyOtp.
    magicLink =
      (linkData?.properties?.hashed_token as string | undefined) ?? null;
  } catch {
    // Best-effort: the SIWE cookie is the authoritative session. If
    // Supabase user creation fails the user is still logged in.
    magicLink = null;
  }

  // ── Kick off background holdings refresh ─────────────────────────────────
  let holdings = { genesis: [] as number[], mythics: [] as number[] };
  try {
    const snap = await getBlinkHoldings(address);
    holdings = {
      genesis: tokenIds(snap.genesis),
      mythics: tokenIds(snap.mythics),
    };
    await supabaseAdmin
      .from("user_blink_holdings")
      .upsert({
        wallet: address,
        genesis_ids: holdings.genesis,
        mythic_ids: holdings.mythics,
        last_refreshed: new Date().toISOString(),
      })
      .select();
  } catch {
    // Migration may not be applied yet — fine, we'll surface the warning
    // client-side and the user is still logged in.
  }

  const isHolder = holdings.genesis.length > 0 || holdings.mythics.length > 0;

  return NextResponse.json({
    ok: true,
    address,
    chainId,
    isHolder,
    holdings,
    supabase: magicLink && supabaseEmail ? { email: supabaseEmail, token: magicLink } : null,
  });
}
