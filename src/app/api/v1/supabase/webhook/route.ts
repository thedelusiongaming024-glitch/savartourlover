import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { syncDatabaseToSupabase } from "@/server/supabase";
import { refreshFromSupabase } from "@/server/db";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";

/**
 * Supabase Database Webhook Handler
 * Triggered automatically by Supabase Cloud whenever database tables are modified.
 * Recompiles the snapshot and updates the database snapshot (db.json) in the storage bucket.
 */
function isAuthorizedWebhook(request: Request): boolean {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Fail closed in production; allow local development without configuration.
    return process.env.NODE_ENV !== "production";
  }
  const provided =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  // This endpoint rebuilds and re-uploads the full database snapshot, so it must not be callable by
  // anonymous internet traffic.
  if (!isAuthorizedWebhook(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const startTime = Date.now();

  try {
    // Read payload from Supabase Webhook (contains table, type, record, schema)
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      // Body may be empty on manual triggers
    }

    const table = body?.table || "unknown";
    const type = body?.type || "TRIGGER";

    console.log(`[Supabase Webhook] Received ${type} event on table '${table}'. Synchronizing database & snapshot mirror...`);

    // 1. Refresh local memory & disk database directly from Supabase PostgreSQL
    const freshDb = await refreshFromSupabase();
    if (!freshDb) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch PostgreSQL records" },
        { status: 500 }
      );
    }

    // 2. Upload the updated JSON mirror to storage snapshot (db.json) with CDN cache header
    const ok = await syncDatabaseToSupabase(freshDb);

    // 3. Purge public ISR cache so visitors see updated changes immediately
    revalidatePublicContent();

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      ok,
      message: "Storage bucket mirror refreshed successfully",
      table,
      type,
      duration_ms: durationMs,
      stats: {
        destinations: freshDb.destinations.length,
        tours: freshDb.tours.length,
        offers: freshDb.offers.length,
        testimonials: freshDb.testimonials.length,
        blogPosts: freshDb.blogPosts.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Supabase Webhook] Error rebuilding snapshot mirror:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "/api/v1/supabase/webhook",
    purpose: "Supabase Database Webhook to mirror PostgreSQL changes into Storage Bucket",
  });
}
