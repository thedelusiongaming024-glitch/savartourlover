import { NextResponse } from "next/server";
import { executeBKashPayment } from "@/lib/bkash";
import { confirmPaymentSuccess, getPaymentByTranId, getBookingById, loadDb, deleteIncompleteBooking } from "@/server/db";

function isAdvanceBooking(booking: any, payment: any): boolean {
  if (!booking) return true;
  // If already confirmed as advance paid or fully paid, it's not an incomplete advance booking
  if (
    booking.status === "confirmed_advance_paid" ||
    booking.status === "confirmed_fully_paid" ||
    booking.status === "cleared_on_tour_day"
  ) {
    return false;
  }
  if (parseFloat(booking.amount_paid || "0") > 0) {
    return false;
  }
  return true;
}

async function handleCallback(request: Request) {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);

  let paymentID = url.searchParams.get("paymentID") || "";
  let status = url.searchParams.get("status") || "";
  let tran_id = url.searchParams.get("tran_id") || "";

  // If request is POST with form data / json body
  if (request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        paymentID = (formData.get("paymentID") as string) || paymentID;
        status = (formData.get("status") as string) || status;
        tran_id = (formData.get("tran_id") as string) || tran_id;
      } else if (contentType.includes("application/json")) {
        const body = await request.json().catch(() => ({}));
        paymentID = body.paymentID || paymentID;
        status = body.status || status;
        tran_id = body.tran_id || tran_id;
      }
    } catch {}
  }

  // Attempt to locate the payment record
  let payment = tran_id ? getPaymentByTranId(tran_id) : null;
  if (!payment && paymentID) {
    const db = loadDb();
    payment = db.payments.find((p: any) => p.val_id === paymentID || p.gateway_session_key === paymentID) || null;
  }

  const booking = payment ? getBookingById(payment.booking_id) : null;
  let reference = booking?.reference || "";

  // If payment was cancelled by customer on bKash page
  if (status === "cancel") {
    if (booking && isAdvanceBooking(booking, payment)) {
      await deleteIncompleteBooking(booking.id, "bKash checkout cancelled by customer");
    }
    return NextResponse.redirect(
      `${origin}/payment-result?status=cancel${reference ? `&reference=${encodeURIComponent(reference)}` : ""}`,
      303
    );
  }

  // If payment failed on bKash page
  if (status === "failure" || status === "failed") {
    if (booking && isAdvanceBooking(booking, payment)) {
      await deleteIncompleteBooking(booking.id, "bKash checkout payment failed");
    }
    return NextResponse.redirect(
      `${origin}/payment-result?status=fail${reference ? `&reference=${encodeURIComponent(reference)}` : ""}`,
      303
    );
  }

  if (status === "success" && paymentID) {
    // If payment already marked as successful (e.g. double redirect/replay)
    if (payment && payment.status === "success") {
      return NextResponse.redirect(
        `${origin}/payment-result?status=success&reference=${encodeURIComponent(reference)}`,
        303
      );
    }

    // Call bKash execute API
    const executeRes = await executeBKashPayment(paymentID);

    if (!executeRes.success) {
      console.error(`[bKash Callback] Payment execution failed for paymentID ${paymentID}:`, executeRes.error);
      if (booking && isAdvanceBooking(booking, payment)) {
        await deleteIncompleteBooking(booking.id, `bKash execution failed: ${executeRes.error || "Unknown"}`);
      }
      return NextResponse.redirect(
        `${origin}/payment-result?status=fail${reference ? `&reference=${encodeURIComponent(reference)}` : ""}`,
        303
      );
    }

    const resolvedTranId = executeRes.merchantInvoiceNumber || tran_id || payment?.tran_id;
    if (!resolvedTranId) {
      console.error("[bKash Callback] No transaction ID found in executed payment:", executeRes);
      return NextResponse.redirect(`${origin}/payment-result?status=fail`, 303);
    }

    // Confirm payment in local DB and Supabase with payment_method: "Bkash payment"
    const verifiedAmount = executeRes.amount || payment?.amount;
    const trxId = executeRes.trxId || paymentID;

    const result = await confirmPaymentSuccess(
      resolvedTranId,
      trxId,
      "Bkash payment",
      {
        bookingId: payment?.booking_id,
        bookingRef: reference,
        verifiedAmount,
      }
    );

    if (result.booking?.reference) {
      reference = result.booking.reference;
    }

    return NextResponse.redirect(
      `${origin}/payment-result?status=success&reference=${encodeURIComponent(reference)}`,
      303
    );
  }

  // Unknown status: purge incomplete advance booking if any
  if (booking && isAdvanceBooking(booking, payment)) {
    await deleteIncompleteBooking(booking.id, `bKash checkout ended with unknown status: ${status || "none"}`);
  }
  return NextResponse.redirect(`${origin}/payment-result?status=fail`, 303);
}

export async function GET(request: Request) {
  return handleCallback(request);
}

export async function POST(request: Request) {
  return handleCallback(request);
}
