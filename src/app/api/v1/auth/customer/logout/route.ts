import { NextResponse } from "next/server";
import { clearedCustomerCookieOptions } from "@/server/auth";

/**
 * The customer session cookie is httpOnly, so client-side JavaScript can no
 * longer clear it with `document.cookie = "...; max-age=0"`. This endpoint
 * does it server-side instead.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("tourlover_customer_token", "", clearedCustomerCookieOptions());
  return response;
}
