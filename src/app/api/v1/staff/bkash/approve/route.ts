import { NextResponse } from "next/server";
import { approveBkashVerification, ensureDbHydrated } from "@/server/db";

export async function POST(request: Request) {
  try {
    await ensureDbHydrated();
    const body = await request.json().catch(() => ({}));
    const { booking_id, admin_name, trx_id } = body;

    if (!booking_id) {
      return NextResponse.json({ detail: "booking_id is required." }, { status: 400 });
    }

    const result = await approveBkashVerification(
      String(booking_id),
      admin_name || "Staff Admin",
      trx_id
    );

    return NextResponse.json({
      success: true,
      message: `Booking ${result.booking.reference} approved successfully.`,
      booking: result.booking,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error approving bKash verification.";
    console.error("[Staff bKash Approve Error]:", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
