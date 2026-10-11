import { NextResponse } from "next/server";
import { validatePromoCode } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, tour_id, tour_slug, total_amount } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { valid: false, error: "Please enter a valid promo code." },
        { status: 400 }
      );
    }

    const result = validatePromoCode(
      code.trim(),
      String(tour_id || ""),
      tour_slug ? String(tour_slug) : undefined,
      Number(total_amount) || 0
    );

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to validate promo code.";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
