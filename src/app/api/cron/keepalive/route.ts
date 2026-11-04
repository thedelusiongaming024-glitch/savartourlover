import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

// Supabase free-tier projects pause automatically after 7 days with no
// activity; a paused project is a total outage (every page, booking, and
// login stops working) until someone manually restores it from the
// Supabase dashboard. Vercel's Hobby plan only allows cron jobs to run once
// a day, so wire this up in vercel.json as a daily schedule — one cheap
// read a day is enough to count as "activity" and keep the project alive
// indefinitely without any manual work.
export async function GET(request: Request) {
  // Optional but recommended: set CRON_SECRET in the Vercel project env vars
  // so this endpoint can't be triggered by anyone who finds the URL. Vercel
  // automatically sends this header on its own cron invocations.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ detail: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdminClient();
    // Cheapest possible real query against the project — a row count, not a
    // data fetch — just enough to register as activity.
    const { error } = await supabase.from("destinations").select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Keep-alive ping failed.";
    // Still 200: a failed ping shouldn't page anyone or look like a broken
    // deployment, but it is worth seeing in the Vercel cron logs.
    console.error("[keepalive] Supabase ping failed:", message);
    return NextResponse.json({ ok: false, detail: message }, { status: 200 });
  }
}
