import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { refreshFromSupabase, resetMemoryDb } from "@/server/db";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return NextResponse.json({ detail: "Staff/Admin privileges required." }, { status: 403 });
  }

  try {
    // 1. Reset in-memory database cache
    resetMemoryDb();

    // 2. Fetch fresh database snapshot from Supabase PostgreSQL
    const freshDb = await refreshFromSupabase();

    // 3. Purge Next.js / Vercel Edge CDN caches across all public routes
    revalidatePublicContent();

    return NextResponse.json({
      success: true,
      message: "Edge cache successfully purged. All public pages are now serving live data.",
      stats: {
        destinations: freshDb.destinations?.length || 0,
        tours: freshDb.tours?.length || 0,
        offers: freshDb.offers?.length || 0,
        blogPosts: freshDb.blogPosts?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to purge cache.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
