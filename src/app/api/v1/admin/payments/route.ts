import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllPaymentsAdmin, getPaymentById, ensureDbHydrated, approveOnlinePayment, approveCashPayment, loadDb } from "@/server/db";

function isStaffOrAdmin(role?: string) {
  return role === "super_admin" || role === "admin" || role === "staff" || role === "finance_manager";
}

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ detail: "Staff/Admin privileges required." }, { status: 403 });
  }

  await ensureDbHydrated();

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

export async function PATCH(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ detail: "Staff/Admin privileges required." }, { status: 403 });
  }

  await ensureDbHydrated();

  try {
    const body = await request.json();
    const { id, action, trx_id } = body;
    if (!id) {
      return NextResponse.json({ detail: "Payment ID is required." }, { status: 400 });
    }

    if (action === "approve") {
      const db = loadDb();
      const payment = db.payments.find((p) => p.id === id);
      if (!payment) {
        return NextResponse.json({ detail: "Payment transaction not found." }, { status: 404 });
      }

      const pmLower = (payment.payment_method || "").toLowerCase();
      if (pmLower.includes("cash")) {
        const result = await approveCashPayment(payment.booking_id, user.username, payment.payment_type as any);
        return NextResponse.json({ success: true, payment: result.payment, booking: result.booking });
      } else {
        const result = await approveOnlinePayment(payment.booking_id, user.username, {
          paymentId: payment.id,
          trxId: trx_id || payment.trx_id,
          paymentMethod: payment.payment_method,
          receivedType: payment.payment_type as any,
        });
        return NextResponse.json({ success: true, payment: result.payment, booking: result.booking });
      }
    }

    return NextResponse.json({ detail: "Unknown action." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update payment.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
