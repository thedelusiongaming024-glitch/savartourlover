import { getAuthUserFromHeader, getCustomerFromRequest } from "./auth";
import { verifyClearanceToken } from "./clearance";
import { normalizePhoneNumber } from "./db";
import type { DbBooking } from "./types";

export type BookingAccess = "staff" | "owner" | "token" | null;

/**
 * Decides how (if at all) the caller may access a booking:
 *  - "staff": valid staff Bearer token
 *  - "owner": signed-in customer who owns the booking
 *  - "token": a valid signed clearance token for exactly this booking
 */
export function resolveBookingAccess(
  request: Request,
  booking: DbBooking,
  clearanceToken?: string | null,
  ticketExpiresAtIso?: string
): BookingAccess {
  if (getAuthUserFromHeader(request.headers.get("authorization"))) return "staff";

  const customer = getCustomerFromRequest(request);
  if (customer) {
    const ownsById = Boolean(booking.customer_id) && booking.customer_id === customer.customer_id;
    const ownsByPhone =
      Boolean(customer.phone_number) &&
      normalizePhoneNumber(customer.phone_number) === normalizePhoneNumber(booking.customer_phone_number);
    if (ownsById || ownsByPhone) return "owner";
  }

  if (clearanceToken) {
    const verified = verifyClearanceToken(clearanceToken, booking.id, ticketExpiresAtIso);
    if (verified.valid) return "token";
  }

  return null;
}
