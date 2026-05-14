import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, sanitizeText, isPositiveFinite, isValidLat, isValidLng } from "@/lib/api-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FEE_WALLETS = {
  ETH: "0x00468c1B22451ed9Fabc9DA32E6aEa28DC03a216",
  SOL: "FYxEmF7VKHpp1781aKFMWYc23kwgsD5j4foyCa2SKji7",
  BTC: "bc1q7tw2jnmj3v483vatwts8h8nrradct0yfpaj64",
};

const PLATFORM_FEE_RATE = 0.10; // 10%

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "newest";
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const userId = searchParams.get("user_id");

    // Only select non-sensitive poster fields (no email, no encrypted keys)
    let query = supabaseAdmin.from("tasks").select("*, poster:profiles(id, handle, avatar_url)");

    if (category) {
      query = query.eq("category", category);
    }

    if (userId) {
      query = query.eq("poster_id", userId);
    }

    if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sort === "reward") {
      query = query.order("reward_amount", { ascending: false });
    }
    // "closest" sort requires lat/lng — handled client-side or via PostGIS

    const { data: tasks, error } = await query;

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.code === "42P01"
      ) {
        return NextResponse.json({ tasks: [], fee_wallets: FEE_WALLETS });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let result = tasks || [];

    // Client-side distance sort if lat/lng provided and sort is closest
    if (sort === "closest" && lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      result = result
        .filter((t: Record<string, unknown>) => t.latitude != null && t.longitude != null)
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          const distA = Math.hypot(
            (a.latitude as number) - userLat,
            (a.longitude as number) - userLng
          );
          const distB = Math.hypot(
            (b.latitude as number) - userLat,
            (b.longitude as number) - userLng
          );
          return distA - distB;
        });
    }

    return NextResponse.json({ tasks: result, fee_wallets: FEE_WALLETS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Auth check for all POST actions
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required (create | apply | approve | reject)" },
        { status: 400 }
      );
    }

    switch (action) {
      case "create": {
        const {
          title,
          description,
          category,
          reward_amount,
          reward_currency,
          latitude,
          longitude,
          deadline,
        } = body;

        const poster_id = user!.id; // Use authenticated user

        if (!title || !reward_amount) {
          return NextResponse.json(
            { error: "title and reward_amount are required" },
            { status: 400 }
          );
        }

        // Input validation
        if (!isPositiveFinite(reward_amount)) {
          return NextResponse.json(
            { error: "reward_amount must be a positive number" },
            { status: 400 }
          );
        }
        if (latitude != null && !isValidLat(latitude)) {
          return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
        }
        if (longitude != null && !isValidLng(longitude)) {
          return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
        }

        const { data: task, error } = await supabaseAdmin
          .from("tasks")
          .insert({
            poster_id,
            title: sanitizeText(title, 200),
            description: sanitizeText(description, 2000) || null,
            category: sanitizeText(category, 50) || "general",
            reward_amount,
            reward_currency: reward_currency || "ETH",
            latitude: latitude || null,
            longitude: longitude || null,
            deadline: deadline || null,
            status: "open",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          if (
            error.message.includes("does not exist") ||
            error.code === "42P01"
          ) {
            return NextResponse.json(
              { error: "Tasks system not yet available" },
              { status: 503 }
            );
          }
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ task }, { status: 201 });
      }

      case "apply": {
        const { task_id, message } = body;
        const applicant_id = user!.id; // Use authenticated user

        if (!task_id) {
          return NextResponse.json(
            { error: "task_id is required" },
            { status: 400 }
          );
        }

        const { data: application, error } = await supabaseAdmin
          .from("task_applications")
          .insert({
            task_id,
            applicant_id,
            message: sanitizeText(message, 1000) || null,
            status: "pending",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          if (
            error.message.includes("does not exist") ||
            error.code === "42P01"
          ) {
            return NextResponse.json(
              { error: "Tasks system not yet available" },
              { status: 503 }
            );
          }
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ application }, { status: 201 });
      }

      case "approve": {
        const { application_id, task_id: approveTaskId } = body;

        if (!application_id) {
          return NextResponse.json(
            { error: "application_id is required" },
            { status: 400 }
          );
        }

        // Update application status
        const { data: approved, error: approveError } = await supabaseAdmin
          .from("task_applications")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", application_id)
          .select()
          .single();

        if (approveError) {
          if (
            approveError.message.includes("does not exist") ||
            approveError.code === "42P01"
          ) {
            return NextResponse.json(
              { error: "Tasks system not yet available" },
              { status: 503 }
            );
          }
          return NextResponse.json(
            { error: approveError.message },
            { status: 500 }
          );
        }

        // Mark task as completed if task_id provided
        if (approveTaskId) {
          await supabaseAdmin
            .from("tasks")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", approveTaskId);
        }

        // Fetch the task to calculate fee
        const taskId = approveTaskId || approved?.task_id;
        let payout = null;

        if (taskId) {
          const { data: task } = await supabaseAdmin
            .from("tasks")
            .select("reward_amount, reward_currency")
            .eq("id", taskId)
            .single();

          if (task) {
            const gross = task.reward_amount;
            const fee = gross * PLATFORM_FEE_RATE;
            const net = gross - fee;
            const currency = task.reward_currency || "ETH";
            const feeWallet =
              FEE_WALLETS[currency as keyof typeof FEE_WALLETS] ||
              FEE_WALLETS.ETH;

            payout = {
              gross,
              platform_fee: fee,
              net_to_worker: net,
              currency,
              fee_wallet: feeWallet,
            };
          }
        }

        return NextResponse.json({ application: approved, payout });
      }

      case "reject": {
        const { application_id: rejectAppId } = body;

        if (!rejectAppId) {
          return NextResponse.json(
            { error: "application_id is required" },
            { status: 400 }
          );
        }

        const { data: rejected, error: rejectError } = await supabaseAdmin
          .from("task_applications")
          .update({ status: "rejected", rejected_at: new Date().toISOString() })
          .eq("id", rejectAppId)
          .select()
          .single();

        if (rejectError) {
          if (
            rejectError.message.includes("does not exist") ||
            rejectError.code === "42P01"
          ) {
            return NextResponse.json(
              { error: "Tasks system not yet available" },
              { status: 503 }
            );
          }
          return NextResponse.json(
            { error: rejectError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ application: rejected });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: create, apply, approve, reject" },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
