import { NextResponse } from "next/server";
import { getBookingById, getClearanceTicket } from "@/server/db";
import { resolveBookingAccess } from "@/server/access";
import { isTicketVisible, getTicketVisibilityStatus, TICKET_COMPANY_INFO } from "@/lib/ticketUtils";

export async function GET(
  request: Request,
  props: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await props.params;
    const booking = getBookingById(bookingId);

    // Same response for "missing" and "not yours" so ids cannot be probed.
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const ticket = getClearanceTicket(bookingId);
    const token = new URL(request.url).searchParams.get("token");
    const access = resolveBookingAccess(request, booking, token, ticket?.token_expires_at);
    if (!access) {
      // This response contains the traveller's name, phone and email: never serve it anonymously.
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const visible = isTicketVisible(booking.departure_date);
    const status = getTicketVisibilityStatus(booking.departure_date);

    return NextResponse.json({
      booking,
      is_visible: visible,
      visibility_status: status,
      company: TICKET_COMPANY_INFO,
      // Lets the ticket page embed a working, signed link in its QR code.
      clearance_token: ticket?.token ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
