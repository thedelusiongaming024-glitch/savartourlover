import { NextResponse } from "next/server";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import { getAuthUserFromHeader } from "@/server/auth";
import { deleteDestination, saveDestination } from "@/server/db";

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const { id } = await props.params;
    const body = await request.json();
    const destination = await saveDestination({ ...body, id });
    revalidatePublicContent(destination.slug ? [`/destinations/${destination.slug}`] : []);
    return NextResponse.json(destination);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update destination.";
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

  const { id } = await props.params;
  const ok = await deleteDestination(id);
  if (!ok) {
    return NextResponse.json({ detail: "Destination not found." }, { status: 404 });
  }

  revalidatePublicContent();
  return NextResponse.json({ success: true, id });
}
