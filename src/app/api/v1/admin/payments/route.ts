import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllPaymentsAdmin, getPaymentById } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Payment audit privileges required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    const payment = getPaymentById(id);
    if (!payment) {
      return NextResponse.json({ detail: "Payment not found." }, { status: 404 });
    }
    return NextResponse.json(payment);
  }

  const payments = getAllPaymentsAdmin();
  return NextResponse.json({ results: payments, count: payments.length });
}
