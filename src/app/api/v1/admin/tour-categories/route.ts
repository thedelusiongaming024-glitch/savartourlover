import { NextResponse } from "next/server";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import { getAuthUserFromHeader } from "@/server/auth";
import { getTourCategories, saveTourCategory, getAllToursAdmin } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const categories = getTourCategories();
  const tours = getAllToursAdmin();
  const withCounts = categories.map((c) => ({
    ...c,
    tour_count: tours.filter((t) => t.category === c.slug || t.category === c.name).length,
  }));

  return NextResponse.json({ results: withCounts });
}

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const category = await saveTourCategory(body);
    revalidatePublicContent(["/tours"]);
    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save tour category.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
