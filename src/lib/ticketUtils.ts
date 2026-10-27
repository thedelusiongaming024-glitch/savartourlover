import { siteAddressEn, siteAddressBn, sitePhones, sitePhonesFormatted, siteEmail, siteName, siteNameBn } from "@/data/site";

/**
 * Determines whether a ticket is still visible and downloadable in the customer profile.
 * Rule: The ticket is visible upon booking, through departure day, and through the entire day after departure day (until 23:59:59.999).
 * After that, it expires.
 * 
 * Example:
 * If departure date is 2026-09-25:
 * - Up to and on 2026-09-25: Visible
 * - On 2026-09-26 (the day after departure day): Visible
 * - On 2026-09-27 and later: Expired (Not visible)
 */
export function isTicketVisible(departureDateStr?: string | null): boolean {
  if (!departureDateStr) return true;
  try {
    const raw = departureDateStr.slice(0, 10);
    const parts = raw.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      // Expiry is end of day after departure (day + 1 at 23:59:59.999)
      const expiry = new Date(year, month - 1, day + 1, 23, 59, 59, 999);
      return Date.now() <= expiry.getTime();
    }
    const d = new Date(departureDateStr);
    if (!isNaN(d.getTime())) {
      const expiry = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 23, 59, 59, 999);
      return Date.now() <= expiry.getTime();
    }
  } catch {
    // If parsing fails, preserve visibility
    return true;
  }
  return true;
}

/**
 * Returns formatted expiration message or countdown for display.
 */
export function getTicketVisibilityStatus(departureDateStr?: string | null, isBn = false): {
  isVisible: boolean;
  message: string;
} {
  const visible = isTicketVisible(departureDateStr);
  if (!departureDateStr) {
    return {
      isVisible: true,
      message: isBn ? "টিকিট ডাউনলোড উপলব্ধ" : "Ticket available for download",
    };
  }

  if (visible) {
    try {
      const parts = departureDateStr.slice(0, 10).split("-").map(Number);
      const expiry = new Date(parts[0], parts[1] - 1, parts[2] + 1);
      const expiryStr = expiry.toLocaleDateString(isBn ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        isVisible: true,
        message: isBn
          ? `টিকিট ডাউনলোডের মেয়াদ: ${expiryStr} পর্যন্ত (যাত্রার পরের দিন)`
          : `Ticket downloadable until ${expiryStr} (day after departure)`,
      };
    } catch {
      return {
        isVisible: true,
        message: isBn ? "টিকিট ডাউনলোড সক্রিয়" : "Active E-Ticket",
      };
    }
  }

  return {
    isVisible: false,
    message: isBn
      ? "যাত্রা সম্পন্ন — টিকিট ডাউনলোডের মেয়াদ শেষ হয়েছে"
      : "Tour completed — Ticket download expired",
  };
}

export const TICKET_COMPANY_INFO = {
  name: siteName,
  nameBn: siteNameBn,
  tagline: "আপনার স্বপ্ন উড়তে দিন — Let Your Dreams Fly",
  phones: sitePhonesFormatted,
  rawPhones: sitePhones,
  addressEn: siteAddressEn,
  addressBn: siteAddressBn,
  website: "www.savartourlover.com",
  email: siteEmail,
  logoBadgeUrl: "/images/logo-badge.png",
  logoHorizontalUrl: "/images/logo-horizontal.png",
};
