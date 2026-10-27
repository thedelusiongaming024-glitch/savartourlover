import { NextResponse } from "next/server";
import { createInquiry } from "@/server/db";
import { limitOr429 } from "@/server/rateLimit";
import { trackServerEvent } from "@/server/tracking";

export async function POST(request: Request) {
  const limited = await limitOr429(request, "contact", 5, 10 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { name, email, phone, destination, dates, trip_type, travelers, message } = body;

    if (!name || !phone) {
      return NextResponse.json({ detail: "Name and phone number are required." }, { status: 400 });
    }

    const inquiry = await createInquiry({
      name,
      email: email || "",
      phone,
      destination: destination || "",
      dates: dates || "",
      trip_type: trip_type || "Group Tour",
      travelers: Math.max(1, Number(travelers) || 1),
      message: typeof message === "string" ? message.slice(0, 2000) : "",
    });

    // Server-side lead tracking
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
    void trackServerEvent({
      event_name: "contact_inquiry",
      path: "/contact",
      title: `Contact Inquiry: ${trip_type || "Group Tour"} (${destination || "Custom"})`,
      referrer: request.headers.get("referer") || "",
      user_agent: request.headers.get("user-agent") || "",
      ip: forwardedFor,
      metadata: {
        inquiry_id: inquiry.id,
        destination: inquiry.destination,
        trip_type: inquiry.trip_type,
        travelers: inquiry.travelers,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Thank you for reaching out! A tour planner will contact you shortly.",
        inquiry_id: inquiry.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process inquiry.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
