import { NextResponse } from "next/server";
import { verifyClearanceToken } from "@/server/clearance";
import { getBookingById, getClearanceTicket } from "@/server/db";
import { resolveBookingAccess } from "@/server/access";

export async function GET(
  request: Request,
  props: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await props.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    const ticket = getClearanceTicket(bookingId);
    if (!ticket) {
      return NextResponse.json({ detail: "No clearance ticket found for this booking." }, { status: 404 });
    }

    // A token, when supplied, must be valid (expired links get a clear 410).
    if (token) {
      const verify = verifyClearanceToken(token, bookingId, ticket.token_expires_at);
      if (!verify.valid) {
        if (verify.reason === "expired") {
          return NextResponse.json({ detail: "This clearance link has expired." }, { status: 410 });
        }
        return NextResponse.json({ detail: "Invalid clearance token." }, { status: 400 });
      }
    }

    const booking = getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ detail: "Booking not found." }, { status: 404 });
    }

    const dueNum = parseFloat(booking.amount_due);
    const isCleared = ticket.is_cleared || dueNum <= 0;

    const bookingPayload = {
      booking_reference: booking.reference,
      customer_name: booking.customer_full_name,
      tour_title: booking.tour_title,
      amount_paid: booking.amount_paid,
      amount_due: booking.amount_due,
      total_price: booking.total_price,
      is_cleared: isCleared,
      departure_date: booking.departure_date,
      traveler_count: booking.traveler_count,
      selected_seats: booking.selected_seats || [],
      pickup_point: booking.pickup_point || null,
      payment_method: booking.payment_method,
      advance_payment_method: booking.advance_payment_method || (booking.payment_method === "cash_on_hand" || booking.payment_method === "cash" ? "cash_on_hand" : "sslcommerz"),
      due_payment_method: booking.due_payment_method,
      due_cash_approved_by: booking.due_cash_approved_by,
      due_cash_approved_at: booking.due_cash_approved_at,
      booking_status: booking.status,
    };

    // The signed token is a credential: only hand it out to someone who already proved access
    // (valid token, the booking's signed-in owner, or staff). It used to be returned to anyone who
    // knew the booking id, which made the token worthless.
    const access = resolveBookingAccess(request, booking, token, ticket.token_expires_at);
    const tokenForClient = access ? ticket.token : undefined;

    if (isCleared) {
      return NextResponse.json({
        status: "verified",
        message: "Booking Confirmed — Fully Paid",
        token: tokenForClient,
        booking: bookingPayload,
      });
    }

    return NextResponse.json({
      status: "due_pending",
      message: "Remaining balance due — proceed to payment.",
      amount_due: booking.amount_due,
      token: tokenForClient,
      booking: bookingPayload,
      pay_endpoint: `/api/v1/clearance/${bookingId}/pay/`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
