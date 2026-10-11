import { NextResponse } from "next/server";
import { getCustomerByPhone, normalizePhoneNumber, getOrCreateCustomerByPhone } from "@/server/db";
import { customerCookieOptions, generateCustomerToken } from "@/server/auth";
import { limitOr429 } from "@/server/rateLimit";

/**
 * Customer sign-in & registration by phone number.
 * If account doesn't exist and full_name is provided, an account is created.
 */
export async function POST(request: Request) {
  const limited = await limitOr429(request, "customer-login", 10, 10 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { phone_number, full_name, email } = body;

    if (!phone_number || typeof phone_number !== "string" || !phone_number.trim()) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const normalized = normalizePhoneNumber(phone_number);
    let customer = getCustomerByPhone(normalized || phone_number);

    if (!customer) {
      if (full_name && typeof full_name === "string" && full_name.trim().length >= 2) {
        const res = await getOrCreateCustomerByPhone({
          phone_number: normalized || phone_number,
          full_name: full_name.trim(),
          email: typeof email === "string" && email.trim() ? email.trim() : undefined,
        });
        customer = res.customer;
      } else {
        return NextResponse.json(
          {
            error: "No account found with this phone number. Please check the number or book a tour to get started.",
            notFound: true,
          },
          { status: 404 }
        );
      }
    }

    customer.last_login_at = new Date().toISOString();
    const token = generateCustomerToken(customer);

    const response = NextResponse.json(
      {
        success: true,
        customer,
        token,
      },
      { status: 200 }
    );

    response.cookies.set("tourlover_customer_token", token, customerCookieOptions());

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
