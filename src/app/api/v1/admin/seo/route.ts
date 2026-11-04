import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { ensureDbHydrated, getSeoSettings, saveSeoSettings } from "@/server/db";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import type { SeoSettings } from "@/server/types";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user) {
    return NextResponse.json({ detail: "Staff authorization required." }, { status: 401 });
  }

  await ensureDbHydrated();
  const seo = getSeoSettings();
  return NextResponse.json(seo);
}

export async function PUT(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    await ensureDbHydrated();
    const payload = (await request.json()) as Partial<SeoSettings>;
    const savedBlock = await saveSeoSettings(payload);
    revalidatePublicContent(["/contact", "/sitemap.xml"]);

    return NextResponse.json({
      success: true,
      message: "SEO configurations updated and published live across Bangladesh!",
      seo: savedBlock.content,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save SEO settings.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
