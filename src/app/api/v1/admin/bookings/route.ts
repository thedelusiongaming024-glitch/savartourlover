import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import {
  getAllBookingsAdmin,
  updateBookingStatus,
  updateBooking,
  completeDuePayment,
  approveCashPayment,
  rejectCashPayment,
} from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const bookings = getAllBookingsAdmin();
  return NextResponse.json({ results: bookings });
}

export async function PATCH(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, action, method, received_type, reason } = body;
    if (!id) {
      return NextResponse.json({ detail: "id is required." }, { status: 400 });
    }

    if (action === "approve_cash_payment") {
      const recType = received_type === "due" ? "due" : received_type === "full" ? "full" : "advance";
      const result = await approveCashPayment(id, user.username, recType);
      return NextResponse.json(result.booking);
    }

    if (action === "reject_cash_payment") {
      const rejected = await rejectCashPayment(id, user.username, reason, body.reject_type);
      return NextResponse.json(rejected);
    }

    if (action === "settle_due") {
      const result = await completeDuePayment(id, method || "host_cash", body.amount, user.username);
      return NextResponse.json(result.booking);
    }

    if (action === "update_pickup_point" || body.pickup_point !== undefined) {
      const updated = await updateBooking(id, { pickup_point: String(body.pickup_point || "").trim() });
      if (!updated) {
        return NextResponse.json({ detail: "Booking not found." }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    if (!status) {
      return NextResponse.json({ detail: "status or action is required." }, { status: 400 });
    }

    const updated = await updateBookingStatus(id, status);
    if (!updated) {
      return NextResponse.json({ detail: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update booking.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
