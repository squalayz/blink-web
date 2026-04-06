import { createClient } from "@supabase/supabase-js";

// SERVER ONLY — never import this in client components or pages
// Only use in API routes (app/api/) and server-side lib files
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
