import { NextResponse } from "next/server";
import { getTourCategories, ensureDbHydrated } from "@/server/db";

export async function GET() {
  await ensureDbHydrated();
  const categories = getTourCategories();
  const activeCategories = categories.filter((c) => c.is_active !== false);
  return NextResponse.json({ results: activeCategories });
}
