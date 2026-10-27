import { NextResponse } from "next/server";
import { getPaymentByTranId, getBookingById, deleteIncompleteBooking } from "@/server/db";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  let tran_id = "";
  let value_b = "";

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      tran_id = (formData.get("tran_id") as string) || "";
      value_b = (formData.get("value_b") as string) || "";
    } else {
      const body = await request.json().catch(() => ({}));
      tran_id = body.tran_id || "";
      value_b = body.value_b || "";
    }

    if (tran_id) {
      const payment = getPaymentByTranId(tran_id);
      const booking = payment ? getBookingById(payment.booking_id) : null;
      const reference = booking?.reference || value_b || "";
      if (booking && (booking.status === "pending_payment" || parseFloat(booking.amount_paid || "0") === 0)) {
        await deleteIncompleteBooking(booking.id, "Payment cancelled");
      }
      return NextResponse.redirect(
        `${origin}/payment-result?status=cancel${reference ? `&reference=${encodeURIComponent(reference)}` : ""}`,
        303
      );
    }

    return NextResponse.redirect(`${origin}/payment-result?status=cancel`, 303);
  } catch (err: unknown) {
    console.error("Error handling SSLCommerz cancel callback:", err);
    return NextResponse.redirect(`${origin}/payment-result?status=cancel`, 303);
  }
}
