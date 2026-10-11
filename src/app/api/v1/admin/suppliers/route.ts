import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllSuppliersAdmin, saveSupplier } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Supplier management privileges required." }, { status: 403 });
  }

  const suppliers = getAllSuppliersAdmin();
  return NextResponse.json({ results: suppliers });
}

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Supplier management privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, category, contact_person, phone, email, outstanding_balance, is_active, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ detail: "Supplier name is required." }, { status: 400 });
    }

    const saved = await saveSupplier({
      name: name.trim(),
      category: category || "other",
      contact_person: contact_person?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      outstanding_balance: String(Number(outstanding_balance || 0).toFixed(2)),
      is_active: is_active !== false,
      notes: notes?.trim(),
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record supplier.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
