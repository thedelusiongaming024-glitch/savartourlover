import { NextResponse } from "next/server";
import { confirmPaymentSuccess, getPaymentByTranId, getBookingById, deleteIncompleteBooking } from "@/server/db";
import { isPaymentSimulatorEnabled } from "@/lib/paymentMode";

/**
 * Callback used ONLY by the built-in payment simulator (local development / demos).
 *
 * It confirms a payment on the caller's word alone, so exposing it in production would let anyone
 * mark any booking as paid with a single unauthenticated POST. Real payments are confirmed
 * exclusively through the SSLCommerz success/IPN routes, which validate with the gateway.
 */
export async function POST(request: Request) {
  if (!isPaymentSimulatorEnabled()) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { tran_id, status = "VALID", val_id, card_type } = body;

    if (!tran_id || typeof tran_id !== "string") {
      return NextResponse.json({ detail: "tran_id is required." }, { status: 400 });
    }

    const payment = getPaymentByTranId(tran_id);
    if (!payment) {
      return NextResponse.json({ detail: "Transaction not found." }, { status: 404 });
    }

    if (status === "VALID" || status === "SUCCESS") {
      const result = await confirmPaymentSuccess(tran_id, val_id, card_type);
      return NextResponse.json({
        status: "success",
        message: "Payment confirmed successfully.",
        booking_reference: result.booking.reference,
        amount_paid: result.booking.amount_paid,
        amount_due: result.booking.amount_due,
      });
    } else {
      const booking = getBookingById(payment.booking_id);
      if (
        booking &&
        (booking.status === "pending_payment" || parseFloat(booking.amount_paid || "0") === 0)
      ) {
        await deleteIncompleteBooking(booking.id, `Payment ${status.toLowerCase()} in simulator`);
      }
      return NextResponse.json({
        status: "failed",
        message: "Payment transaction marked as failed or cancelled. Incomplete booking deleted and seats released.",
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment processing failed.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
