import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { orbId, userId, reason } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: orb, error: orbError } = await supabase
      .from("orbs")
      .select("id, dropper_id, status")
      .eq("id", orbId)
      .single();

    if (orbError || !orb) {
      return Response.json({ error: "Orb not found" }, { status: 404, headers: CORS });
    }
    if (orb.dropper_id !== userId) {
      return Response.json({ error: "Not your orb" }, { status: 403, headers: CORS });
    }
    if (orb.status === "claimed") {
      return Response.json(
        { error: "Cannot cancel — orb is being claimed right now" },
        { status: 400, headers: CORS }
      );
    }
    if (orb.status === "cracked") {
      return Response.json({ error: "Orb already cracked" }, { status: 400, headers: CORS });
    }
    if (orb.status === "cancelled") {
      return Response.json({ error: "Already cancelled" }, { status: 400, headers: CORS });
    }

    await supabase
      .from("orbs")
      .update({
        status: "cancelled",
        presigned_tx: null,
        cancel_reason: reason ?? "User cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", orbId);

    // Release wallet lock
    await supabase
      .from("wallet_locks")
      .update({ status: "released", updated_at: new Date().toISOString() })
      .eq("orb_id", orbId)
      .eq("status", "locked");

    return Response.json(
      { success: true, message: "Orb cancelled. Your funds were never moved." },
      { headers: CORS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500, headers: CORS });
  }
});
