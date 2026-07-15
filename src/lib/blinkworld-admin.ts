// ════════════════════════════════════════════════════════════════════════════
// BlinkWorld game-backend admin client — SERVER ONLY.
//
// The airdrop claim page reads player data from the BLINKWORLD GAME project
// (lutlnwshbbhbwszpzxks), which is a DIFFERENT Supabase project from the
// marketing site's default client (supabase-admin.ts → kirgpeovueddvqtjxioj).
//
// Read-only surface: claim_codes, airdrop_export (view).
// Write surface:     airdrop_registrations, airdrop_lookup_attempts only.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function blinkworldAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.BLINKWORLD_SUPABASE_URL;
  const key = process.env.BLINKWORLD_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "BLINKWORLD_SUPABASE_URL / BLINKWORLD_SUPABASE_SERVICE_ROLE_KEY not set — " +
        "the /claim APIs need the BlinkWorld game project's service role key in .env.local",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
