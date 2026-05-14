import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: expiredOrbs, error } = await supabase
    .from("orbs")
    .select("id")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!expiredOrbs?.length) return Response.json({ expired: 0 });

  for (const orb of expiredOrbs) {
    await supabase
      .from("orbs")
      .update({
        status: "expired",
        presigned_tx: null,
        expired_at: new Date().toISOString(),
      })
      .eq("id", orb.id);

    // Release wallet lock
    await supabase
      .from("wallet_locks")
      .update({ status: "released", updated_at: new Date().toISOString() })
      .eq("orb_id", orb.id)
      .eq("status", "locked");
  }

  return Response.json({ expired: expiredOrbs.length });
});
