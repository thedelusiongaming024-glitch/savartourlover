import { NextResponse } from "next/server";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllToursAdmin, saveTour } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const tours = getAllToursAdmin();
  return NextResponse.json({ results: tours });
}

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const tour = await saveTour(body);
    revalidatePublicContent([...(tour.slug ? [`/tours/${tour.slug}`] : []), ...(tour.destination_slug ? [`/destinations/${tour.destination_slug}`] : [])]);
    return NextResponse.json(tour, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save tour.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
