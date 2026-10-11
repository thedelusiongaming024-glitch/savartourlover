import { NextResponse } from "next/server";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import { getAuthUserFromHeader } from "@/server/auth";
import { deleteTestimonial, saveTestimonial } from "@/server/db";

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
    const testimonial = await saveTestimonial({ ...body, id });
    revalidatePublicContent();
    return NextResponse.json(testimonial);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update testimonial.";
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
  const ok = await deleteTestimonial(id);
  if (!ok) {
    return NextResponse.json({ detail: "Testimonial not found." }, { status: 404 });
  }

  revalidatePublicContent();
  return NextResponse.json({ success: true, id });
}
