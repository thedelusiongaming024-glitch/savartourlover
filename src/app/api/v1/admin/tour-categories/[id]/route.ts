import { NextResponse } from "next/server";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import { getAuthUserFromHeader } from "@/server/auth";
import { deleteTourCategory, ensureDbHydrated, saveTourCategory } from "@/server/db";

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    await ensureDbHydrated();
    const { id } = await props.params;
    const body = await request.json();
    const category = await saveTourCategory({ ...body, id });
    revalidatePublicContent(["/tours"]);
    return NextResponse.json(category);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update tour category.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    await ensureDbHydrated();
    const { id } = await props.params;
    const ok = await deleteTourCategory(id);
    if (!ok) {
      return NextResponse.json({ detail: "Tour category not found." }, { status: 404 });
    }

    revalidatePublicContent(["/tours"]);
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete tour category.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
