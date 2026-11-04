import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { invokeCloudSnapshotSync } from "@/server/supabase";
import { refreshFromSupabase } from "@/server/db";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const freshDb = await refreshFromSupabase();
    const result = await invokeCloudSnapshotSync();
    revalidatePublicContent();

    return NextResponse.json({
      ok: result.success,
      source: result.source,
      details: {
        ...result.details,
        destinations: freshDb.destinations.length,
        tours: freshDb.tours.length,
        bookings: freshDb.bookings.length,
        payments: freshDb.payments.length,
        clearanceTickets: freshDb.clearanceTickets.length,
        alerts: freshDb.alerts.length,
      },
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to trigger cloud snapshot sync.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
