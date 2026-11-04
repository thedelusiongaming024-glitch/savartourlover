import { NextResponse } from "next/server";
import { getDestinations, ensureDbHydrated } from "@/server/db";

export async function GET() {
  await ensureDbHydrated();
  const destinations = getDestinations();
  return NextResponse.json({ results: destinations });
}
