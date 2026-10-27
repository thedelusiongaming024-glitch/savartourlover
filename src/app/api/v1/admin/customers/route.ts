import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllCustomers, deleteCustomer, ensureDbHydrated } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user) {
    return NextResponse.json({ detail: "Staff authentication required." }, { status: 401 });
  }
  if (user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  await ensureDbHydrated();
  const customers = getAllCustomers();
  return NextResponse.json({ count: customers.length, results: customers });
}

export async function DELETE(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user) {
    return NextResponse.json({ detail: "Staff authentication required." }, { status: 401 });
  }
  if (user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  await ensureDbHydrated();

  let id: string | null = null;
  try {
    const body = await request.json();
    id = body.id || null;
  } catch {
    const url = new URL(request.url);
    id = url.searchParams.get("id");
  }

  if (!id) {
    return NextResponse.json({ error: "Customer ID is required." }, { status: 400 });
  }

  const success = await deleteCustomer(id);
  if (!success) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Customer profile deleted successfully." });
}
