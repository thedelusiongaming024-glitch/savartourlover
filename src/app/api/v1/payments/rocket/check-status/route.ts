import { NextResponse } from "next/server";
import { ensureDbHydrated, loadDb } from "@/server/db";

export async function GET(request: Request) {
  try {
    await ensureDbHydrated();
    const url = new URL(request.url);
    const bookingRef = url.searchParams.get("booking_ref") || url.searchParams.get("reference");
    const tranId = url.searchParams.get("tran_id");
    const bookingId = url.searchParams.get("booking_id");

    const db = loadDb();
    let booking = null;

    if (bookingRef) {
      booking = db.bookings.find((b) => b.reference === bookingRef);
    } else if (bookingId) {
      booking = db.bookings.find((b) => b.id === bookingId);
    } else if (tranId) {
      const payment = db.payments.find((p) => p.tran_id === tranId);
      if (payment) {
        booking = db.bookings.find((b) => b.id === payment.booking_id);
      }
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const isConfirmed =
      booking.status === "confirmed_advance_paid" ||
      booking.status === "confirmed_fully_paid" ||
      booking.status === "cleared_on_tour_day";

    const isCancelled = booking.status === "cancelled";

    return NextResponse.json({
      status: booking.status,
      is_confirmed: isConfirmed,
      is_cancelled: isCancelled,
      reference: booking.reference,
      hold_expires_at: booking.verification_expires_at || null,
      redirect_url: isConfirmed
        ? `/payment-result?status=success&reference=${encodeURIComponent(booking.reference)}`
        : isCancelled
        ? `/payment-result?status=cancel&reference=${encodeURIComponent(booking.reference)}`
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error checking payment status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
