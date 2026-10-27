import { NextResponse } from "next/server";
import { getCustomerById, getCustomerByPhone, getCustomerBookings, updateCustomer } from "@/server/db";
import { getCustomerFromRequest } from "@/server/auth";

function resolveCustomer(request: Request) {
  // Authorization header first, then the session cookie. Both are signed tokens.
  // (A `?phone=` query fallback used to return any customer's profile and bookings — and let anyone
  // edit it via PUT — with no authentication at all. It has been removed.)
  const payload = getCustomerFromRequest(request);
  if (!payload) return null;
  return getCustomerById(payload.customer_id) || getCustomerByPhone(payload.phone_number);
}

export async function GET(request: Request) {
  try {
    const customer = resolveCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in with your phone number." },
        { status: 401 }
      );
    }

    const bookings = getCustomerBookings(customer.phone_number, customer.id);

    return NextResponse.json({
      customer,
      bookings,
      activities: customer.activities || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const customer = resolveCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in with your phone number." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, email } = body;

    if (typeof full_name === "string" && (full_name.trim().length < 2 || full_name.trim().length > 100)) {
      return NextResponse.json({ error: "Please enter a valid name (2-100 characters)." }, { status: 400 });
    }
    if (typeof email === "string" && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const updated = await updateCustomer(customer.id, {
      full_name: typeof full_name === "string" ? full_name.trim() : undefined,
      email: typeof email === "string" ? email.trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      customer: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
