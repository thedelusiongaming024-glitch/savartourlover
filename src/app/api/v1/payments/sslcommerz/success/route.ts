import { NextResponse } from "next/server";
import { confirmPaymentSuccess, getPaymentByTranId, getBookingById } from "@/server/db";
import { verifyGatewayPayment } from "@/server/paymentVerification";

/**
 * SSLCommerz redirects the customer's browser here after a successful payment.
 *
 * This URL is public and the body is attacker-controllable, so nothing in it is trusted: the payment
 * is confirmed only if SSLCommerz's Order Validation API vouches for this exact val_id + tran_id +
 * amount. (Previously a missing val_id skipped validation entirely and confirmed the payment.)
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  let tran_id = "";
  let val_id = "";
  let value_b = "";

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      tran_id = (formData.get("tran_id") as string) || "";
      val_id = (formData.get("val_id") as string) || "";
      value_b = (formData.get("value_b") as string) || "";
    } else {
      const body = await request.json().catch(() => ({}));
      tran_id = body.tran_id || "";
      val_id = body.val_id || "";
      value_b = body.value_b || "";
    }

    if (!tran_id) {
      return NextResponse.redirect(`${origin}/payment-result?status=fail`, 303);
    }

    const payment = getPaymentByTranId(tran_id);
    const booking = payment ? getBookingById(payment.booking_id) : null;
    let reference = booking?.reference || value_b || "";

    // Already confirmed (e.g. by the IPN): just show the result.
    if (payment && payment.status === "success") {
      return NextResponse.redirect(
        `${origin}/payment-result?status=success&reference=${encodeURIComponent(reference)}`,
        303
      );
    }

    const verification = await verifyGatewayPayment(tran_id, val_id);
    if (!verification.ok) {
      console.error(`SSLCommerz success callback rejected for ${tran_id}: ${verification.reason}`);
      return NextResponse.redirect(
        `${origin}/payment-result?status=fail${reference ? `&reference=${encodeURIComponent(reference)}` : ""}`,
        303
      );
    }

    const result = await confirmPaymentSuccess(tran_id, val_id, verification.cardType, {
      bookingId: verification.bookingId,
      bookingRef: verification.bookingRef,
      verifiedAmount: verification.amount,
    });

    if (result.booking?.reference) {
      reference = result.booking.reference;
    }

    return NextResponse.redirect(
      `${origin}/payment-result?status=success&reference=${encodeURIComponent(reference)}`,
      303
    );
  } catch (err: unknown) {
    console.error("Error handling SSLCommerz success callback:", err);
    return NextResponse.redirect(`${origin}/payment-result?status=fail`, 303);
  }
}
