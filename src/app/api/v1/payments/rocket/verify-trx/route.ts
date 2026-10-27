import { NextResponse } from "next/server";
import { verifyRocketTrxHybrid } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tran_id, payment_id, trx_id, sender_phone, amount } = body;

    if (!tran_id && !payment_id) {
      return NextResponse.json({ detail: "tran_id or payment_id is required." }, { status: 400 });
    }

    if (!trx_id || typeof trx_id !== "string" || trx_id.trim().length < 6) {
      return NextResponse.json(
        { detail: "Please provide a valid Rocket Transaction ID (at least 6 characters)." },
        { status: 400 }
      );
    }

    if (!sender_phone || typeof sender_phone !== "string") {
      return NextResponse.json(
        { detail: "Sender Rocket mobile number is required." },
        { status: 400 }
      );
    }

    const result = await verifyRocketTrxHybrid({
      tran_id: String(tran_id || ""),
      payment_id: payment_id ? String(payment_id) : undefined,
      trx_id: String(trx_id).trim(),
      sender_phone: String(sender_phone).trim(),
      amount: amount ? String(amount) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ detail: result.message || result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error verifying Rocket transaction.";
    console.error("[Rocket Verify Trx Error]:", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
