import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { checkSupabaseHealth, invokeCloudSnapshotSync } from "@/server/supabase";
import { refreshFromSupabase } from "@/server/db";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";

// Both handlers were completely unauthenticated (anyone could trigger cloud syncs and read backend
// health/diagnostics). Restricted to Super Admins.
function requireSuperAdmin(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user) {
    return NextResponse.json({ detail: "Staff authentication required." }, { status: 401 });
  }
  if (user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = requireSuperAdmin(request);
  if (denied) return denied;

  const health = await checkSupabaseHealth();
  return NextResponse.json(health);
}

export async function POST(request: Request) {
  const denied = requireSuperAdmin(request);
  if (denied) return denied;

  await refreshFromSupabase();
  const syncResult = await invokeCloudSnapshotSync();
  revalidatePublicContent();
  const health = await checkSupabaseHealth();
  return NextResponse.json({ ok: syncResult.success, syncResult, ...health });
}
