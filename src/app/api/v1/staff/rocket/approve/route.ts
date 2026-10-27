import { NextResponse } from "next/server";
import { approveRocketVerification } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { booking_id, admin_name } = body;

    if (!booking_id) {
      return NextResponse.json({ detail: "booking_id is required." }, { status: 400 });
    }

    const result = await approveRocketVerification(
      String(booking_id),
      admin_name || "Staff Admin"
    );

    return NextResponse.json({
      success: true,
      message: `Booking ${result.booking.reference} approved successfully.`,
      booking: result.booking,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error approving Rocket verification.";
    console.error("[Staff Rocket Approve Error]:", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
