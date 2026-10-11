import { NextResponse } from "next/server";
import { createBooking } from "@/server/db";
import { customerCookieOptions, generateCustomerToken } from "@/server/auth";
import { limitOr429 } from "@/server/rateLimit";
import { trackServerEvent } from "@/server/tracking";

export async function POST(request: Request) {
  // Public endpoint that reserves seats: cap creation rate per IP to prevent seat-hoarding/spam.
  const limited = await limitOr429(request, "bookings-create", 10, 10 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const {
      tour_id,
      departure_id,
      traveler_count,
      payment_plan,
      customer_full_name,
      customer_phone_number,
      customer_email,
      pickup_point,
      special_requests,
      selected_seats,
      promo_code,
      payment_method,
    } = body;

    if (!tour_id) {
      return NextResponse.json({ tour_id: ["Tour ID is required."] }, { status: 400 });
    }
    if (!customer_full_name) {
      return NextResponse.json({ customer_full_name: ["Full name is required."] }, { status: 400 });
    }
    if (!customer_phone_number) {
      return NextResponse.json({ customer_phone_number: ["Phone number is required."] }, { status: 400 });
    }

    const { booking, customer } = await createBooking({
      tour_id,
      departure_id,
      traveler_count: Math.max(1, Number(traveler_count) || 1),
      payment_plan: payment_plan === "full" ? "full" : "partial",
      payment_method: typeof payment_method === "string" ? payment_method.trim() : undefined,
      customer_full_name,
      customer_phone_number,
      customer_email,
      pickup_point: typeof pickup_point === "string" ? pickup_point.trim() : undefined,
      special_requests,
      selected_seats: Array.isArray(selected_seats) ? selected_seats : undefined,
      promo_code: typeof promo_code === "string" ? promo_code.trim() : undefined,
    });

    const customer_token = generateCustomerToken(customer);

    // Server-side conversion tracking
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
    void trackServerEvent({
      event_name: "booking_created",
      path: `/tours/${booking.tour_slug || booking.tour_id}`,
      title: `Booking: ${booking.tour_title}`,
      referrer: request.headers.get("referer") || "",
      user_agent: request.headers.get("user-agent") || "",
      ip: forwardedFor,
      metadata: {
        booking_id: booking.id,
        reference: booking.reference,
        tour_id: booking.tour_id,
        tour_title: booking.tour_title,
        traveler_count: booking.traveler_count,
        total_price: booking.total_price,
        advance_amount: booking.advance_amount,
        payment_method: booking.payment_method,
        payment_plan: booking.payment_plan,
      },
    });

    const response = NextResponse.json(
      {
        ...booking,
        customer,
        customer_token,
      },
      { status: 201 }
    );

    response.cookies.set("tourlover_customer_token", customer_token, customerCookieOptions());

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create booking.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const booking_id = body.booking_id || new URL(request.url).searchParams.get("booking_id");
    if (!booking_id) {
      return NextResponse.json({ detail: "booking_id is required." }, { status: 400 });
    }

    const { deleteIncompleteBooking, getBookingById } = await import("@/server/db");
    const booking = getBookingById(booking_id);
    if (!booking) {
      return NextResponse.json({ success: true, message: "Booking already deleted or not found." });
    }

    if (booking.status !== "pending_payment" && booking.status !== "pending_cash_approval" && parseFloat(booking.amount_paid || "0") > 0) {
      return NextResponse.json({ detail: "Cannot delete an already paid or confirmed booking." }, { status: 400 });
    }

    const res = await deleteIncompleteBooking(booking_id, "User requested cancellation");
    return NextResponse.json({
      success: true,
      message: "Incomplete booking cancelled and deleted. Seats released.",
      seats_released: res.seatsReleased,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete booking.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

