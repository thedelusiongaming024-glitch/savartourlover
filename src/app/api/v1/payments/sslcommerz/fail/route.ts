import { NextResponse } from "next/server";
import { getPaymentByTranId, getBookingByIdAsync, deleteIncompleteBooking } from "@/server/db";

export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin =
    host && host.includes("savartourlover.com")
      ? `https://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
        (host ? `${proto}://${host}` : new URL(request.url).origin);
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
      const booking = payment ? await getBookingByIdAsync(payment.booking_id) : (value_b ? await getBookingByIdAsync(value_b) : null);
      const reference = booking?.reference || value_b || "";
      if (booking && (booking.status === "pending_payment" || parseFloat(booking.amount_paid || "0") === 0)) {
        await deleteIncompleteBooking(booking.id, "Payment failed");
      }
      return NextResponse.redirect(
        `${origin}/payment-result?status=fail${reference ? `&reference=${encodeURIComponent(reference)}` : ""}`,
        303
      );
    }

    return NextResponse.redirect(`${origin}/payment-result?status=fail`, 303);
  } catch (err: unknown) {
    console.error("Error handling SSLCommerz fail callback:", err);
    return NextResponse.redirect(`${origin}/payment-result?status=fail`, 303);
  }
}
