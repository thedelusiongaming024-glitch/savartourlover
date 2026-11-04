"use client";

/**
 * Authorization header for same-origin API calls made from the browser.
 * Staff session (sessionStorage) wins over the customer session (localStorage).
 * The customer session cookie is also sent automatically, so a stale header never locks anyone out.
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const staff =
      sessionStorage.getItem("tourlover_staff_access_token") ||
      sessionStorage.getItem("atithi_staff_access_token");
    if (staff) return { Authorization: `Bearer ${staff}` };
    const customer =
      localStorage.getItem("tourlover_customer_token") ||
      localStorage.getItem("atithi_customer_token");
    if (customer) return { Authorization: `Bearer ${customer}` };
  } catch {
    // Storage can be unavailable (private mode / blocked cookies); fall back to cookie auth only.
  }
  return {};
}
