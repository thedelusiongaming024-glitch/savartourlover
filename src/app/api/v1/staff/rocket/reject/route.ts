import { NextResponse } from "next/server";
import { ensureDbHydrated, rejectRocketVerification } from "@/server/db";

export async function POST(request: Request) {
  try {
    await ensureDbHydrated();
    const body = await request.json().catch(() => ({}));
    const { booking_id, reason } = body;

    if (!booking_id) {
      return NextResponse.json({ detail: "booking_id is required." }, { status: 400 });
    }

    const result = await rejectRocketVerification(
      String(booking_id),
      reason || "Rocket TrxID rejected as fake or unverified by staff"
    );

    return NextResponse.json({
      success: true,
      message: `Booking cancelled and seats [${result.seatsReleased.join(", ")}] have been released.`,
      seats_released: result.seatsReleased,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error rejecting Rocket verification.";
    console.error("[Staff Rocket Reject Error]:", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
