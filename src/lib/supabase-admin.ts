import { createClient } from "@supabase/supabase-js";

// SERVER ONLY — never import this in client components or pages
// Only use in API routes (app/api/) and server-side lib files
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next.js caches server-side GET fetches (Vercel Data Cache) — force
    // no-store so DB reads are never stale.
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  }
);
