import { NextResponse } from "next/server";
import { ensureDbHydrated, recordIncomingRocketSms } from "@/server/db";

export async function POST(request: Request) {
  try {
    await ensureDbHydrated();
    const expectedSecret = (process.env.ROCKET_SMS_SECRET || "rkt_sms_sec_99238475201").trim();
    const url = new URL(request.url);

    // Verify secret via header, authorization, or query param
    const providedSecret =
      request.headers.get("x-rocket-secret") ||
      request.headers.get("x-sms-secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      url.searchParams.get("secret");

    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized. Invalid secret key." }, { status: 401 });
    }

    let rawMessage = "";
    let sender = "";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      rawMessage =
        body.message ||
        body.text ||
        body.content ||
        body.msg ||
        body.sms ||
        body.body ||
        "";
      sender = body.from || body.sender || body.phone || "";
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      rawMessage =
        (formData.get("message") as string) ||
        (formData.get("text") as string) ||
        (formData.get("content") as string) ||
        (formData.get("sms") as string) ||
        "";
      sender = (formData.get("from") as string) || (formData.get("sender") as string) || "";
    } else {
      rawMessage = await request.text().catch(() => "");
    }

    if (!rawMessage || typeof rawMessage !== "string") {
      return NextResponse.json(
        { error: "SMS message text is required." },
        { status: 400 }
      );
    }

    const result = await recordIncomingRocketSms({
      raw_message: rawMessage,
      sender,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          detail: result.error || "Message did not match a valid Rocket payment SMS format.",
          parsed: result.parsed,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.autoMatchedBooking
        ? `SMS recorded and auto-confirmed booking ${result.autoMatchedBooking.reference}!`
        : "SMS successfully recorded into Rocket payment ledger.",
      trx_id: result.parsed.trxId,
      amount: result.parsed.amount,
      auto_confirmed_booking: result.autoMatchedBooking?.reference || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing incoming SMS webhook.";
    console.error("[Rocket SMS Webhook Error]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
