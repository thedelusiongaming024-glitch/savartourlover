import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllInquiriesAdmin, updateInquiryStatus, deleteInquiry } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const inquiries = getAllInquiriesAdmin();
  return NextResponse.json({ results: inquiries });
}

export async function PATCH(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, admin_notes } = body;
    if (!id || !status) {
      return NextResponse.json({ detail: "id and status are required." }, { status: 400 });
    }

    const updated = await updateInquiryStatus(id, status, admin_notes);
    if (!updated) {
      return NextResponse.json({ detail: "Inquiry not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update inquiry.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ detail: "id parameter is required." }, { status: 400 });
    }

    const ok = await deleteInquiry(id);
    if (!ok) {
      return NextResponse.json({ detail: "Inquiry not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete inquiry.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
