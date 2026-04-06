import { supabaseAdmin } from "@/lib/supabase-admin";

export async function sendNotification(userId: string, event: string, data: any = {}) {
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: event,
      title: data.title || event,
      body: data.body || JSON.stringify(data),
      metadata: data,
    });
  } catch (e) {
    console.error("Notification send failed:", e);
  }
}
