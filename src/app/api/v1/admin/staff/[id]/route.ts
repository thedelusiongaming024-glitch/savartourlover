import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getStaffById, saveStaffUser, deleteStaffUser } from "@/server/db";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  const staff = getStaffById(id);
  if (!staff) {
    return NextResponse.json({ detail: "Staff user not found." }, { status: 404 });
  }

  const { password_hash, salt, ...safe } = staff;
  return NextResponse.json(safe);
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  try {
    const body = await request.json();
    const updated = await saveStaffUser({ ...body, id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update staff user.";
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
  try {
    const ok = await deleteStaffUser(id, user.username);
    if (!ok) {
      return NextResponse.json({ detail: "Staff user not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete staff user.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
