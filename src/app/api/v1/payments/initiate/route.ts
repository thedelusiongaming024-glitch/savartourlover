import { NextResponse } from "next/server";
import { createPayment, ensureDbHydrated, getBookingById, loadDb, saveDb } from "@/server/db";
import { initiateBKashPayment, isBKashConfigured } from "@/lib/bkash";
import { initiateRocketPayment, isRocketConfigured } from "@/lib/rocket";
import { isPaymentSimulatorEnabled } from "@/lib/paymentMode";
import { limitOr429 } from "@/server/rateLimit";

export async function POST(request: Request) {
  const limited = await limitOr429(request, "payments-initiate", 20, 10 * 60 * 1000);
  if (limited) return limited;

  try {
    await ensureDbHydrated();
    const body = await request.json();
    const { booking_id, payment_type = "advance", payment_method, gateway } = body;

    if (!booking_id || typeof booking_id !== "string") {
      return NextResponse.json({ detail: "booking_id is required." }, { status: 400 });
    }

    const booking = getBookingById(booking_id);
    if (!booking) {
      return NextResponse.json({ detail: "Booking not found." }, { status: 404 });
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
      return NextResponse.json({ detail: "This booking is no longer active." }, { status: 400 });
    }

    const amountDue = parseFloat(booking.amount_due);
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      return NextResponse.json({ detail: "This booking is already fully paid." }, { status: 400 });
    }

    // Amounts always come from the server-side booking, never from the request. "full" pays what is
    // still outstanding (not the original total, which over-charged after an advance), and an
    // advance can only be requested while nothing has been paid yet.
    const isFull = payment_type === "full";
    const alreadyPaid = parseFloat(booking.amount_paid) || 0;
    if (!isFull && alreadyPaid > 0) {
      return NextResponse.json(
        { detail: "The advance is already paid. Please pay the remaining balance instead." },
        { status: 400 }
      );
    }
    const amount = isFull
      ? amountDue
      : Math.min(parseFloat(booking.advance_amount), amountDue);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ detail: "Invalid payment amount for this booking." }, { status: 400 });
    }

    // Determine target payment method / gateway
    const isRocket =
      gateway === "rocket" ||
      payment_method === "Rocket payment" ||
      (!payment_method && (booking.advance_payment_method === "Rocket payment" || booking.payment_method === "Rocket payment"));

    const resolvedMethod = isRocket ? "Rocket payment" : "Bkash payment";

    const payment = await createPayment({
      booking_id: booking.id,
      amount: amount.toFixed(2),
      payment_type: isFull ? "full" : "advance",
      payment_method: resolvedMethod,
    });

    const origin = new URL(request.url).origin;
    let redirect_url: string;

    if (isRocket) {
      const rocketSimulatorUrl = `${origin}/payments/rocket/simulator?tran_id=${encodeURIComponent(
        payment.tran_id
      )}&amount=${payment.amount}&reference=${encodeURIComponent(
        booking.reference
      )}&title=${encodeURIComponent(booking.tour_title)}&cus_phone=${encodeURIComponent(
        booking.customer_phone_number || ""
      )}&cus_name=${encodeURIComponent(booking.customer_full_name || "")}`;

      if (isRocketConfigured()) {
        const rocketRes = await initiateRocketPayment({
          tran_id: payment.tran_id,
          amount: payment.amount,
          cus_name: booking.customer_full_name,
          cus_phone: booking.customer_phone_number,
          cus_email: booking.customer_email,
          tour_title: booking.tour_title,
          callback_url: `${origin}/api/v1/payments/rocket/callback?tran_id=${encodeURIComponent(payment.tran_id)}`,
          booking_id: booking.id,
          booking_ref: booking.reference,
        });

        if (rocketRes.success && (rocketRes.rocketUrl || rocketRes.gatewayUrl)) {
          redirect_url = (rocketRes.rocketUrl || rocketRes.gatewayUrl)!;
          if (rocketRes.paymentId) {
            const db = loadDb();
            const p = db.payments.find((x) => x.id === payment.id);
            if (p) {
              p.gateway_session_key = rocketRes.paymentId;
              p.val_id = rocketRes.paymentId;
              await saveDb(db);
            }
          }
        } else if (isPaymentSimulatorEnabled()) {
          console.warn("Rocket initiation failed, using simulator fallback:", rocketRes.error);
          redirect_url = rocketSimulatorUrl;
        } else {
          console.error("Rocket initiation failed:", rocketRes.error);
          return NextResponse.json(
            { detail: `Rocket payment gateway error: ${rocketRes.error || "Please try again shortly."}` },
            { status: 502 }
          );
        }
      } else if (isPaymentSimulatorEnabled()) {
        redirect_url = rocketSimulatorUrl;
      } else {
        console.error("Payment initiation attempted but Rocket is not configured.");
        return NextResponse.json({ detail: "Online Rocket payment is not available right now." }, { status: 503 });
      }
    } else {
      const simulatorUrl = `${origin}/payments/simulator?tran_id=${encodeURIComponent(payment.tran_id)}&amount=${payment.amount}&reference=${encodeURIComponent(booking.reference)}&title=${encodeURIComponent(booking.tour_title)}`;

      if (isBKashConfigured()) {
        const bkashRes = await initiateBKashPayment({
          tran_id: payment.tran_id,
          amount: payment.amount,
          cus_name: booking.customer_full_name,
          cus_phone: booking.customer_phone_number,
          cus_email: booking.customer_email,
          tour_title: booking.tour_title,
          callback_url: `${origin}/api/v1/payments/bkash/callback?tran_id=${encodeURIComponent(payment.tran_id)}`,
          booking_id: booking.id,
          booking_ref: booking.reference,
        });

        if (bkashRes.success && (bkashRes.bkashUrl || bkashRes.gatewayUrl)) {
          redirect_url = (bkashRes.bkashUrl || bkashRes.gatewayUrl)!;
          if (bkashRes.paymentId) {
            const db = loadDb();
            const p = db.payments.find((x) => x.id === payment.id);
            if (p) {
              p.gateway_session_key = bkashRes.paymentId;
              p.val_id = bkashRes.paymentId;
              await saveDb(db);
            }
          }
        } else if (isPaymentSimulatorEnabled()) {
          console.warn("bKash initiation failed, using simulator fallback:", bkashRes.error);
          redirect_url = simulatorUrl;
        } else {
          console.error("bKash initiation failed:", bkashRes.error);
          return NextResponse.json(
            { detail: `bKash payment gateway error: ${bkashRes.error || "Please try again shortly."}` },
            { status: 502 }
          );
        }
      } else if (isPaymentSimulatorEnabled()) {
        redirect_url = simulatorUrl;
      } else {
        console.error("Payment initiation attempted but bKash is not configured.");
        return NextResponse.json({ detail: "Online bKash payment is not available right now." }, { status: 503 });
      }
    }

    return NextResponse.json({
      payment_id: payment.id,
      tran_id: payment.tran_id,
      redirect_url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate payment.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
