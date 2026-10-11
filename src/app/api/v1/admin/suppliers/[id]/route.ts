import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getSupplierById, saveSupplier, deleteSupplier } from "@/server/db";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Supplier management privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  const supplier = getSupplierById(id);
  if (!supplier) {
    return NextResponse.json({ detail: "Supplier not found." }, { status: 404 });
  }

  return NextResponse.json(supplier);
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Supplier management privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  try {
    const body = await request.json();
    const updated = await saveSupplier({ ...body, id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update supplier.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Supplier management privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  const ok = await deleteSupplier(id);
  if (!ok) {
    return NextResponse.json({ detail: "Supplier not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
