import { NextResponse } from "next/server";
import { confirmPaymentSuccess, getPaymentByTranId } from "@/server/db";
import { verifyGatewayPayment } from "@/server/paymentVerification";

/**
 * SSLCommerz Instant Payment Notification (server-to-server, but the URL is public, so the body is
 * still untrusted). Confirmation requires the gateway's Order Validation API to vouch for the
 * val_id / tran_id / amount. The `status` field of the body is deliberately ignored: the old code
 * accepted `status=VALID` with no val_id and confirmed the payment without any verification.
 */
export async function POST(request: Request) {
  let tran_id = "";
  let val_id = "";

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      tran_id = (formData.get("tran_id") as string) || "";
      val_id = (formData.get("val_id") as string) || "";
    } else {
      const body = await request.json().catch(() => ({}));
      tran_id = body.tran_id || "";
      val_id = body.val_id || "";
    }

    if (!tran_id) {
      return NextResponse.json({ detail: "tran_id is required." }, { status: 400 });
    }

    // Idempotent: already confirmed by the browser redirect.
    const payment = getPaymentByTranId(tran_id);
    if (payment && payment.status === "success") {
      return NextResponse.json({ status: "ALREADY_CONFIRMED" });
    }

    if (!val_id) {
      // Failed / cancelled notifications carry no val_id; nothing to confirm.
      return NextResponse.json({ status: "FAILED_OR_CANCELLED" });
    }

    const verification = await verifyGatewayPayment(tran_id, val_id);
    if (!verification.ok) {
      console.error(`IPN rejected for ${tran_id}: ${verification.reason}`);
      return NextResponse.json({ status: "INVALID_TRANSACTION" }, { status: 400 });
    }

    await confirmPaymentSuccess(tran_id, val_id, verification.cardType, {
      bookingId: verification.bookingId,
      bookingRef: verification.bookingRef,
      verifiedAmount: verification.amount,
    });
    return NextResponse.json({ status: "CONFIRMED" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "IPN processing error";
    console.error("SSLCommerz IPN error:", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
