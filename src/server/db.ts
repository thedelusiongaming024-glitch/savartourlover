import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./auth";
import { generateClearanceToken } from "./clearance";
import {
  syncDatabaseToSupabase,
  syncDestinationToSupabase,
  deleteDestinationFromSupabase,
  syncTourToSupabase,
  deleteTourFromSupabase,
  syncOfferToSupabase,
  deleteOfferFromSupabase,
  syncTestimonialToSupabase,
  deleteTestimonialFromSupabase,
  syncBlogPostToSupabase,
  deleteBlogPostFromSupabase,
  syncHomepageBlockToSupabase,
  deleteHomepageBlockFromSupabase,
  syncBookingToSupabase,
  deleteBookingFromSupabase,
  syncCustomerToSupabase,
  deleteCustomerFromSupabase,
  syncCustomerActivityToSupabase,
  syncPaymentToSupabase,
  deletePaymentFromSupabase,
  syncClearanceTicketToSupabase,
  syncAlertToSupabase,
  syncContactInquiryToSupabase,
  deleteInquiryFromSupabase,
  syncStaffUserToSupabase,
  deleteStaffUserFromSupabase,
  syncTourCategoriesToSupabase,
  DEFAULT_TOUR_CATEGORIES,
  fetchDatabaseFromSupabase,
  fetchDatabaseFromStorageBucket,
  invokeCloudSnapshotSync,
} from "./supabase";
import { normalizeImageUrl } from "@/lib/media";
import { parseRocketSms, type ParsedRocketSms } from "./rocketSmsParser";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type {
  AboutPageCmsContent,
  DatabaseSchema,
  DbAlert,
  DbAnalyticsEvent,
  DbBlogPost,
  DbBooking,
  DbClearanceTicket,
  DbContactInquiry,
  DbCustomerActivity,
  DbCustomerUser,
  DbDeparture,
  DbDestination,
  DbExpense,
  DbHomepageBlock,
  DbOffer,
  DbPayment,
  DbRocketIncomingSms,
  DbStaffUser,
  DbSupplier,
  DbTestimonial,
  DbTour,
  DbTourCategory,
  HeroSlideItem,
  HomePageCmsContent,
  JournalPageCmsContent,
  SeoSettings,
} from "./types";

// On Vercel (and most serverless hosts) the deployed bundle's directory is
// read-only — only /tmp is writable, and /tmp itself is ephemeral (wiped
// between cold starts, not shared across concurrent instances). So this file
// is purely a same-instance warm-cache speedup, never a durable store;
// Supabase is the actual source of truth (see fetchDatabaseFromSupabase /
// syncDatabaseToSupabase below). Using process.cwd() there causes every
// write to fail (silently, since saveDb() already catches it) — this just
const isServerlessReadOnly = Boolean(
  process.env.VERCEL ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY
);
const DB_DIR = isServerlessReadOnly ? path.join("/tmp", ".data") : path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "db.json");

// How often a warm serverless instance is allowed to re-pull the full
// database snapshot from Supabase (see triggerBackgroundSupabaseSync below).
// Every public page now uses ISR instead of force-dynamic (see the
// `revalidate` export on src/app/**/page.tsx), which already absorbs the
// bulk of anonymous traffic without invoking the function at all — so this
// interval mainly bounds worst-case Supabase egress from instances that
// *are* running, not overall traffic. Kept configurable since the right
// value depends on how close to the free-tier egress cap (5 GB/month) the
// project is running.
const SUPABASE_SYNC_INTERVAL_MS = Number(process.env.SUPABASE_SYNC_INTERVAL_MS) || 45000;

let memoryDb: DatabaseSchema | null = null;

/** Unguessable suffix for ids that act as capabilities (bookings, payments, transactions). */
function randomToken(bytes = 8): string {
  return crypto.randomBytes(bytes).toString("hex");
}

const MAX_TRAVELERS_PER_BOOKING = 20;

/** How long an unpaid booking keeps its seats reserved before auto-release and deletion. (10 minutes) */
const PENDING_HOLD_MS = 10 * 60 * 1000;

/**
 * Checks and auto-cancels/deletes any bookings where advance payment was not completed:
 * 1) Cash-by-hand bookings where the 10-minute admin approval window has passed without approval.
 * 2) Online (bKash) bookings where advance payment was not completed within the 10-minute hold window.
 * Releases all held seats immediately and purges incomplete records from the database.
 */
export function autoCancelExpiredCashBookings(db: DatabaseSchema): boolean {
  return autoCancelExpiredUnpaidBookings(db);
}

export function autoCancelExpiredUnpaidBookings(db: DatabaseSchema): boolean {
  let changed = false;
  const now = Date.now();
  const toDeleteIds: string[] = [];

  for (const b of db.bookings) {
    // Check 1: Cash advance bookings past 10-minute approval window
    const isCash = b.payment_method === "cash_on_hand" || b.payment_method === "cash";
    const isPendingCash = b.status === "pending_cash_approval" || (isCash && b.status === "pending_payment");
    if (isCash && isPendingCash && b.cash_approval_expires_at) {
      const exp = new Date(b.cash_approval_expires_at).getTime();
      if (!isNaN(exp) && now > exp) {
        toDeleteIds.push(b.id);
        continue;
      }
    }

    // Check 2: Online bKash / pending bookings where advance was never paid within 10 minutes
    if (b.status === "pending_payment" && parseFloat(b.amount_paid || "0") === 0) {
      const created = new Date(b.created_at).getTime();
      if (!isNaN(created) && now - created > PENDING_HOLD_MS) {
        toDeleteIds.push(b.id);
        continue;
      }
    }

    // Check 3: Rocket pending_verification bookings past 15-minute verification window
    if (b.status === "pending_verification" && parseFloat(b.amount_paid || "0") === 0) {
      if (b.verification_expires_at) {
        const exp = new Date(b.verification_expires_at).getTime();
        if (!isNaN(exp) && now > exp) {
          toDeleteIds.push(b.id);
          continue;
        }
      }
    }

    // Check 4: Any legacy cancelled bookings with 0 advance paid that remained in database
    if (b.status === "cancelled" && parseFloat(b.amount_paid || "0") === 0) {
      toDeleteIds.push(b.id);
      continue;
    }
  }

  if (toDeleteIds.length > 0) {
    for (const bookingId of toDeleteIds) {
      const booking = db.bookings.find((b) => b.id === bookingId);
      const seats = Array.isArray(booking?.selected_seats) ? booking.selected_seats.join(", ") : "";
      const ref = booking?.reference || bookingId;

      // Remove from bookings list
      db.bookings = db.bookings.filter((b) => b.id !== bookingId);

      // Remove associated pending payments
      db.payments = db.payments.filter((p) => p.booking_id !== bookingId);

      // Remove clearance ticket if any
      if (Array.isArray(db.clearanceTickets)) {
        db.clearanceTickets = db.clearanceTickets.filter((ct) => ct.booking_id !== bookingId);
      }

      // Add alert
      db.alerts.unshift({
        id: `alt-exp-del-${Date.now()}-${bookingId.slice(-4)}`,
        alert_type: "booking_cancelled",
        severity: "warning",
        message: `Incomplete booking ${ref} was auto-cancelled & deleted: advance was not paid within the 10-minute window. Seats released: ${seats || "None"}.`,
        is_acknowledged: false,
        created_at: new Date().toISOString(),
      });

      // Purge from Supabase in background
      void deleteBookingFromSupabase(bookingId);
      changed = true;
    }
  }

  return changed;
}

/**
 * Cancels and permanently purges an incomplete booking where advance payment was not made.
 * Immediately releases the reserved seats, deletes pending payments, deletes the booking from
 * local storage (db.json) and Supabase PostgreSQL so it is not saved further in the database.
 */
export async function deleteIncompleteBooking(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; seatsReleased: string[]; reference?: string }> {
  const db = loadDb();
  const bIndex = db.bookings.findIndex((b) => b.id === bookingId);
  if (bIndex === -1) {
    await deleteBookingFromSupabase(bookingId);
    return { success: false, seatsReleased: [] };
  }

  const booking = db.bookings[bIndex];

  // Safety protection: Do NOT delete bookings where advance or full payment was already received
  const isPaid =
    booking.status === "confirmed_advance_paid" ||
    booking.status === "confirmed_fully_paid" ||
    booking.status === "cleared_on_tour_day" ||
    parseFloat(booking.amount_paid || "0") > 0;

  if (isPaid) {
    console.warn(`[deleteIncompleteBooking] Prevented deletion of confirmed/paid booking ${bookingId}`);
    return { success: false, seatsReleased: [] };
  }

  const seatsReleased = Array.isArray(booking.selected_seats) ? [...booking.selected_seats] : [];
  const reference = booking.reference;

  // 1. Remove the booking from db.bookings
  db.bookings.splice(bIndex, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
      bookings: [],
    };
  }
  if (!db.deletedEntities.bookings) db.deletedEntities.bookings = [];
  if (!db.deletedEntities.bookings.includes(bookingId)) {
    db.deletedEntities.bookings.push(bookingId);
  }

  // 2. Remove associated payments
  db.payments = db.payments.filter((p) => p.booking_id !== bookingId);

  // 3. Remove clearance tickets if any
  if (Array.isArray(db.clearanceTickets)) {
    db.clearanceTickets = db.clearanceTickets.filter((ct) => ct.booking_id !== bookingId);
  }

  // 4. Record an operational alert for staff visibility
  db.alerts.unshift({
    id: `alt-del-unpaid-${Date.now()}-${bookingId.slice(-4)}`,
    alert_type: "booking_cancelled",
    severity: "info",
    message: `Incomplete booking ${reference || bookingId} cancelled & deleted: advance was not paid${reason ? ` (${reason})` : ""}. Seats released: ${seatsReleased.length > 0 ? seatsReleased.join(", ") : "None"}.`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  });

  // 5. Persist the updated database without the incomplete booking
  await saveDb(db, true);

  // 6. Delete from Supabase PostgreSQL
  await deleteBookingFromSupabase(bookingId);

  return { success: true, seatsReleased, reference };
}

/** Bookings that still occupy seats. Abandoned unpaid bookings stop blocking after the hold expires. */
function isSeatHoldingBooking(b: DbBooking, nowMs: number = Date.now()): boolean {
  if (b.status === "cancelled" || b.status === "refunded") return false;
  if (b.status === "pending_cash_approval" || ((b.payment_method === "cash_on_hand" || b.payment_method === "cash") && b.status === "pending_payment")) {
    if (b.cash_approval_expires_at) {
      const exp = new Date(b.cash_approval_expires_at).getTime();
      if (!isNaN(exp) && nowMs > exp) return false;
    }
  }
  if (b.status === "pending_verification") {
    if (b.verification_expires_at) {
      const exp = new Date(b.verification_expires_at).getTime();
      if (!isNaN(exp) && nowMs > exp) return false;
    }
  }
  if (b.status === "pending_payment") {
    const created = new Date(b.created_at).getTime();
    if (!isNaN(created) && nowMs - created > PENDING_HOLD_MS) return false;
  }
  return true;
}

function slugToId(slug: string): string {
  // Deterministic UUID-like string from slug
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-${hex.repeat(2).slice(0, 12)}`;
}

export function extractPromoInfo(specialRequests?: string | null): { promoCode?: string; discountAmount?: string } {
  if (!specialRequests) return {};
  const match = specialRequests.match(/\[Promo:\s*([A-Za-z0-9_\-]+)\s*\(-৳?([0-9,.]+)\)\]/i);
  if (!match) return {};
  const code = match[1];
  const discount = match[2].replace(/,/g, "");
  return { promoCode: code, discountAmount: discount };
}

function generateInitialDepartures(tourTotalSeats = 40): DbDeparture[] {
  // Generate upcoming departures for next 4 Fridays
  const departures: DbDeparture[] = [];
  // Work in Asia/Dhaka (UTC+6) and read the UTC fields of the shifted date, so the
  // weekday and the ISO date string always agree regardless of the server timezone.
  const dhakaNow = Date.now() + 6 * 60 * 60 * 1000;
  let dayOffset = 1;
  const capacity = Math.max(1, Number(tourTotalSeats) || 40);
  while (departures.length < 4) {
    const d = new Date(dhakaNow + dayOffset * 24 * 60 * 60 * 1000);
    if (d.getUTCDay() === 5) {
      // Friday
      const dateStr = d.toISOString().split("T")[0];
      departures.push({
        id: `dep-${dateStr}-${departures.length + 1}`,
        departure_date: dateStr,
        total_seats: capacity,
        seats_remaining: capacity,
        booked_seats: [],
        is_active: true,
      });
    }
    dayOffset++;
  }
  return departures;
}

function seedPassword(envName: string, devDefault: string): string {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    // Never ship well-known default credentials to production.
    const generated = crypto.randomBytes(12).toString("base64url");
    console.warn(`[SECURITY] ${envName} is not set. Generated one-time password for the seeded account: ${generated}`);
    return generated;
  }
  return devDefault;
}



function createSeedData(): DatabaseSchema {
  const adminAuth = hashPassword(seedPassword("SEED_ADMIN_PASSWORD", "adminpassword123"));

  // Only the super_admin account is seeded on first boot.
  // All other staff accounts must be created by the admin through the dashboard.
  const seededStaff: DbStaffUser[] = [
    {
      id: "usr-admin-1",
      username: "admin",
      password_hash: adminAuth.hash,
      salt: adminAuth.salt,
      role: "super_admin",
      phone_number: "",
      email: "admin@savartourlover.com",
      first_name: "Admin",
      last_name: "",
    },
  ];

  const seededHomepageBlocks: DbHomepageBlock[] = [
    {
      id: "block-hero-1",
      block_type: "hero",
      display_order: 1,
      content: {
        eyebrow: "Domestic tours across Bangladesh",
        headline: "Discover Bangladesh,",
        highlight: "your way",
        subheadline: "Curated domestic tours. Trusted local hosts. Book with an advance and clear the balance on tour day.",
        primary_cta_label: "Explore Tours",
        primary_cta_href: "/tours",
        secondary_cta_label: "Plan My Trip",
        secondary_cta_href: "/contact",
      },
    },
    {
      id: "block-dest-grid-2",
      block_type: "destination_grid",
      display_order: 2,
      content: { hidden: false },
    },
    {
      id: "block-tours-3",
      block_type: "featured_tours",
      display_order: 3,
      content: { hidden: false },
    },
    {
      id: "block-testimonials-4",
      block_type: "testimonials",
      display_order: 4,
      content: { hidden: false },
    },
  ];

  return {
    destinations: [],   // No mock destinations — admin adds real ones via dashboard
    tours: [],
    tourCategories: [...DEFAULT_TOUR_CATEGORIES],
    offers: [],
    testimonials: [],
    blogPosts: [],
    homepageBlocks: seededHomepageBlocks,
    staffUsers: seededStaff,
    customers: [],
    bookings: [],
    payments: [],
    clearanceTickets: [],
    alerts: [],
    expenses: [],
    suppliers: [],
    contactInquiries: [],
    analyticsEvents: [],
  };
}

let lastDbMtime = 0;
/** Bumped on every saveDb(); lets a slow background fetch detect that newer local writes happened meanwhile. */
let mutationCounter = 0;
let lastSupabaseFetch = 0;
let isFetchingSupabase = false;

async function getCloudDatabase(): Promise<DatabaseSchema | null> {
  // Always query direct PostgreSQL tables as primary single source of truth!
  return await fetchDatabaseFromSupabase();
}

function mergeCloudWithLocal(cloudDb: DatabaseSchema, localDb: DatabaseSchema): DatabaseSchema {
  // 0. Merge tombstones (deletedEntities) so deleted items are NEVER resurrected from cloud
  const mergedDeletedEntities = {
    destinations: Array.from(new Set([...(localDb.deletedEntities?.destinations || []), ...(cloudDb.deletedEntities?.destinations || [])])),
    tours: Array.from(new Set([...(localDb.deletedEntities?.tours || []), ...(cloudDb.deletedEntities?.tours || [])])),
    offers: Array.from(new Set([...(localDb.deletedEntities?.offers || []), ...(cloudDb.deletedEntities?.offers || [])])),
    testimonials: Array.from(new Set([...(localDb.deletedEntities?.testimonials || []), ...(cloudDb.deletedEntities?.testimonials || [])])),
    blogPosts: Array.from(new Set([...(localDb.deletedEntities?.blogPosts || []), ...(cloudDb.deletedEntities?.blogPosts || [])])),
    homepageBlocks: Array.from(new Set([...(localDb.deletedEntities?.homepageBlocks || []), ...(cloudDb.deletedEntities?.homepageBlocks || [])])),
    tourCategories: Array.from(new Set([...(localDb.deletedEntities?.tourCategories || []), ...(cloudDb.deletedEntities?.tourCategories || [])])),
    bookings: Array.from(new Set([...(localDb.deletedEntities?.bookings || []), ...(cloudDb.deletedEntities?.bookings || [])])),
    customers: Array.from(new Set([...(localDb.deletedEntities?.customers || []), ...(cloudDb.deletedEntities?.customers || [])])),
    contactInquiries: Array.from(new Set([...(localDb.deletedEntities?.contactInquiries || []), ...(cloudDb.deletedEntities?.contactInquiries || [])])),
  };
  cloudDb.deletedEntities = mergedDeletedEntities;

  const deletedDestSet = new Set(mergedDeletedEntities.destinations);
  const deletedTourSet = new Set(mergedDeletedEntities.tours);
  const deletedOfferSet = new Set(mergedDeletedEntities.offers);
  const deletedTestimonialSet = new Set(mergedDeletedEntities.testimonials);
  const deletedBlogSet = new Set(mergedDeletedEntities.blogPosts);
  const deletedBlockSet = new Set(mergedDeletedEntities.homepageBlocks);
  const deletedCatSet = new Set(mergedDeletedEntities.tourCategories);
  const deletedBookingSet = new Set(mergedDeletedEntities.bookings);
  const deletedCustomerSet = new Set(mergedDeletedEntities.customers);
  const deletedInquirySet = new Set(mergedDeletedEntities.contactInquiries);

  // Filter out deleted destinations from cloudDb and reconcile with local destinations
  cloudDb.destinations = (cloudDb.destinations || []).filter(
    (d) => !deletedDestSet.has(d.id) && !deletedDestSet.has(d.slug)
  );

  if (localDb.destinations && localDb.destinations.length > 0) {
    const localDestMap = new Map<string, DbDestination>();
    for (const d of localDb.destinations) {
      if (d.id) localDestMap.set(d.id, d);
      if (d.slug) localDestMap.set(d.slug, d);
    }

    cloudDb.destinations = cloudDb.destinations.map((cloudD) => {
      const localD = localDestMap.get(cloudD.id) || localDestMap.get(cloudD.slug);
      if (!localD) return cloudD;
      return {
        ...localD,
        ...cloudD,
        cover_image: cloudD.cover_image || localD.cover_image,
        cover_video_url: cloudD.cover_video_url || localD.cover_video_url,
        gallery: (cloudD.gallery && cloudD.gallery.length > 0) ? cloudD.gallery : (localD.gallery || []),
        popular_attractions:
          (cloudD.popular_attractions && cloudD.popular_attractions.length > 0)
            ? cloudD.popular_attractions
            : (localD.popular_attractions || []),
      };
    });

    const cloudDestIds = new Set(cloudDb.destinations.map((d) => d.id));
    const cloudDestSlugs = new Set(cloudDb.destinations.map((d) => d.slug));
    for (const localD of localDb.destinations) {
      if (!deletedDestSet.has(localD.id) && !deletedDestSet.has(localD.slug)) {
        if (!cloudDestIds.has(localD.id) && !cloudDestSlugs.has(localD.slug)) {
          cloudDb.destinations.push(localD);
        }
      }
    }
  }

  // Filter out deleted tours from cloudDb and reconcile
  cloudDb.tours = (cloudDb.tours || []).filter(
    (t) => !deletedTourSet.has(t.id) && !deletedTourSet.has(t.slug)
  );
  const localTourMap = new Map((localDb.tours || []).map((t) => [t.id, t]));
  const localTourSlugMap = new Map((localDb.tours || []).map((t) => [t.slug, t]));
  cloudDb.tours = cloudDb.tours.map((cloudT) => {
    const localT = localTourMap.get(cloudT.id) || localTourSlugMap.get(cloudT.slug);
    if (!localT) return cloudT;
    return {
      ...localT,
      ...cloudT,
      meals_notes: (cloudT.meals_notes && cloudT.meals_notes !== "Breakfast included")
        ? cloudT.meals_notes
        : (localT.meals_notes || cloudT.meals_notes || "Breakfast included"),
      accommodation_notes: (cloudT.accommodation_notes && cloudT.accommodation_notes !== "Standard hotel / resort")
        ? cloudT.accommodation_notes
        : (localT.accommodation_notes || cloudT.accommodation_notes || "Standard hotel / resort"),
      transportation_notes: (cloudT.transportation_notes && cloudT.transportation_notes !== "AC Bus / Private Jeep")
        ? cloudT.transportation_notes
        : (localT.transportation_notes || cloudT.transportation_notes || "AC Bus / Private Jeep"),
      gallery: (cloudT.gallery && cloudT.gallery.length > 0) ? cloudT.gallery : (localT.gallery || []),
      places_to_visit: (cloudT.places_to_visit && cloudT.places_to_visit.length > 0) ? cloudT.places_to_visit : (localT.places_to_visit || []),
    };
  });

  const cloudTourIds = new Set(cloudDb.tours.map((t) => t.id));
  const cloudTourSlugs = new Set(cloudDb.tours.map((t) => t.slug));
  for (const localT of localDb.tours || []) {
    if (!deletedTourSet.has(localT.id) && !deletedTourSet.has(localT.slug)) {
      if (!cloudTourIds.has(localT.id) && !cloudTourSlugs.has(localT.slug)) {
        cloudDb.tours.push(localT);
      }
    }
  }

  // Filter out deleted offers from cloudDb
  cloudDb.offers = (cloudDb.offers || []).filter(
    (o) => !deletedOfferSet.has(o.id) && (!o.code || !deletedOfferSet.has(o.code)) && (!o.slug || !deletedOfferSet.has(o.slug))
  );

  // Filter out deleted testimonials from cloudDb
  cloudDb.testimonials = (cloudDb.testimonials || []).filter(
    (t) => !deletedTestimonialSet.has(t.id)
  );

  // Filter out deleted blog posts from cloudDb
  cloudDb.blogPosts = (cloudDb.blogPosts || []).filter(
    (b) => !deletedBlogSet.has(b.id) && !deletedBlogSet.has(b.slug)
  );

  // Filter out deleted homepage blocks from cloudDb
  cloudDb.homepageBlocks = (cloudDb.homepageBlocks || []).filter(
    (b) => !deletedBlockSet.has(b.id)
  );

  // Filter out deleted tour categories from cloudDb
  cloudDb.tourCategories = (cloudDb.tourCategories || []).filter(
    (c) => !deletedCatSet.has(c.id) && !deletedCatSet.has(c.slug)
  );

  // 1. Enrich existing cloud customers with local activities & preserve active/recent local customers
  cloudDb.customers = (cloudDb.customers || []).filter(
    (c) => !deletedCustomerSet.has(c.id) && (!c.phone_number || !deletedCustomerSet.has(c.phone_number))
  );
  const localCustMap = new Map((localDb.customers || []).filter((c) => !deletedCustomerSet.has(c.id) && (!c.phone_number || !deletedCustomerSet.has(c.phone_number))).map((c) => [c.id, c]));
  const cloudCustIds = new Set((cloudDb.customers || []).map((c) => c.id));
  cloudDb.customers = (cloudDb.customers || []).map((cloudC) => {
    const localC = localCustMap.get(cloudC.id);
    if (!localC) return cloudC;
    const localActs = localC.activities || [];
    const cloudActs = cloudC.activities || [];
    const actIds = new Set(cloudActs.map((a) => a.id));
    const mergedActs = [...cloudActs];
    for (const la of localActs) {
      if (!actIds.has(la.id)) mergedActs.push(la);
    }
    return {
      ...cloudC,
      activities: mergedActs,
    };
  });

  for (const localC of (localDb.customers || []).filter((c) => !deletedCustomerSet.has(c.id) && (!c.phone_number || !deletedCustomerSet.has(c.phone_number)))) {
    if (!cloudCustIds.has(localC.id)) {
      cloudDb.customers.unshift(localC);
    }
  }

  // 2. Enrich existing cloud bookings with local promo_code/discount/seats/travelers & preserve active/pending/recent local bookings
  cloudDb.bookings = (cloudDb.bookings || []).filter((b) => !deletedBookingSet.has(b.id));
  const localBookingMap = new Map((localDb.bookings || []).filter((b) => !deletedBookingSet.has(b.id)).map((b) => [b.id, b]));
  const cloudBookingIds = new Set((cloudDb.bookings || []).map((b) => b.id));
  cloudDb.bookings = (cloudDb.bookings || []).map((cloudB) => {
    const localB = localBookingMap.get(cloudB.id);
    const promoInfo = extractPromoInfo(cloudB.special_requests);
    const promo_code = localB?.promo_code || cloudB.promo_code || promoInfo.promoCode || null;
    const discount_amount = localB?.discount_amount || cloudB.discount_amount || promoInfo.discountAmount || undefined;
    const pickup_point = cloudB.pickup_point || localB?.pickup_point || undefined;

    if (!localB) return { ...cloudB, promo_code, discount_amount, pickup_point };
    return {
      ...cloudB,
      pickup_point,
      promo_code,
      discount_amount,
      payment_method: cloudB.payment_method || localB.payment_method,
      cash_approval_expires_at: cloudB.cash_approval_expires_at || localB.cash_approval_expires_at,
      cash_approved_by: cloudB.cash_approved_by || localB.cash_approved_by,
      cash_approved_at: cloudB.cash_approved_at || localB.cash_approved_at,
      selected_seats:
        cloudB.selected_seats && cloudB.selected_seats.length > 0
          ? cloudB.selected_seats
          : localB.selected_seats || [],
      travelers:
        cloudB.travelers && cloudB.travelers.length > 0
          ? cloudB.travelers
          : localB.travelers,
    };
  });

  for (const localB of (localDb.bookings || []).filter((b) => !deletedBookingSet.has(b.id))) {
    // Only preserve local bookings that reference an existing, valid tour to prevent foreign key violations
    if (!cloudBookingIds.has(localB.id) && cloudTourIds.has(localB.tour_id)) {
      cloudDb.bookings.unshift(localB);
    }
  }

  // 3. Payments: cloud payments from PostgreSQL are authoritative, preserve any valid local uncommitted payments
  const validBookingIds = new Set((cloudDb.bookings || []).map((b) => b.id));
  const cloudPaymentIds = new Set((cloudDb.payments || []).map((p) => p.id));
  const mergedPayments = [...(cloudDb.payments || [])];
  for (const localP of localDb.payments || []) {
    if (!cloudPaymentIds.has(localP.id) && validBookingIds.has(localP.booking_id)) {
      mergedPayments.unshift(localP);
    }
  }
  cloudDb.payments = mergedPayments;

  // 4. Clearance Tickets: cloud tickets from PostgreSQL are authoritative, preserve any valid local uncommitted tickets
  const cloudTicketIds = new Set((cloudDb.clearanceTickets || []).map((t) => t.id));
  const mergedTickets = [...(cloudDb.clearanceTickets || [])];
  for (const localT of localDb.clearanceTickets || []) {
    if (!cloudTicketIds.has(localT.id) && validBookingIds.has(localT.booking_id)) {
      mergedTickets.unshift(localT);
    }
  }
  cloudDb.clearanceTickets = mergedTickets;

  // 5. Operational Alerts: cloud alerts from PostgreSQL are authoritative, preserve local uncommitted alerts
  const cloudAlertIds = new Set((cloudDb.alerts || []).map((a) => a.id));
  const mergedAlerts = [...(cloudDb.alerts || [])];
  for (const localA of localDb.alerts || []) {
    if (!cloudAlertIds.has(localA.id)) {
      mergedAlerts.unshift(localA);
    }
  }
  cloudDb.alerts = mergedAlerts;

  // 6. Contact Inquiries: cloud inquiries from PostgreSQL are authoritative, preserve local uncommitted inquiries
  cloudDb.contactInquiries = (cloudDb.contactInquiries || []).filter((i) => !deletedInquirySet.has(i.id));
  const cloudInquiryIds = new Set((cloudDb.contactInquiries || []).map((i) => i.id));
  const mergedInquiries = [...(cloudDb.contactInquiries || [])];
  for (const localI of (localDb.contactInquiries || []).filter((i) => !deletedInquirySet.has(i.id))) {
    if (!cloudInquiryIds.has(localI.id)) {
      mergedInquiries.unshift(localI);
    }
  }
  cloudDb.contactInquiries = mergedInquiries;

  // 7. Expenses, Suppliers & Analytics (Storage mirror collections)
  if (localDb.expenses?.length && (!cloudDb.expenses || cloudDb.expenses.length === 0)) {
    cloudDb.expenses = localDb.expenses;
  }
  if (localDb.suppliers?.length && (!cloudDb.suppliers || cloudDb.suppliers.length === 0)) {
    cloudDb.suppliers = localDb.suppliers;
  }
  if (localDb.analyticsEvents?.length && (!cloudDb.analyticsEvents || cloudDb.analyticsEvents.length === 0)) {
    cloudDb.analyticsEvents = localDb.analyticsEvents;
  }

  // 8. Offers: merge offers so promo codes and valid dates are retained
  const existingOffers = localDb.offers || [];
  if (existingOffers.length) {
    const cloudOfferMap = new Map((cloudDb.offers || []).map((o) => [o.id, o]));
    const mergedOffers = [...(cloudDb.offers || [])];
    for (const localO of existingOffers) {
      if (!cloudOfferMap.has(localO.id)) {
        mergedOffers.push(localO);
      } else {
        const idx = mergedOffers.findIndex((o) => o.id === localO.id);
        if (idx !== -1) {
          mergedOffers[idx] = {
            ...mergedOffers[idx],
            tour_id: localO.tour_id ?? mergedOffers[idx].tour_id,
            tour_slug: localO.tour_slug ?? mergedOffers[idx].tour_slug,
            tour_title: localO.tour_title ?? mergedOffers[idx].tour_title,
            code: localO.code ?? mergedOffers[idx].code,
            is_active: localO.is_active !== undefined ? localO.is_active : mergedOffers[idx].is_active,
            discount_type: localO.discount_type ?? mergedOffers[idx].discount_type,
            discount_value: localO.discount_value ?? mergedOffers[idx].discount_value,
            minimum_spend: localO.minimum_spend ?? mergedOffers[idx].minimum_spend,
            valid_from: localO.valid_from ?? mergedOffers[idx].valid_from,
            valid_until: localO.valid_until ?? mergedOffers[idx].valid_until,
          };
        }
      }
    }
    cloudDb.offers = mergedOffers;
  }

  // 9. Tours: preserve customizations and ensure total_seats and departures are merged
  if (localDb.tours && localDb.tours.length > 0) {
    const localTourMap = new Map(localDb.tours.map((t) => [t.id, t]));
    cloudDb.tours = (cloudDb.tours || []).map((cloudT) => {
      const localT = localTourMap.get(cloudT.id) || localDb.tours.find((t) => t.slug === cloudT.slug);
      if (!localT) return cloudT;
      const effectiveSeats = Number(cloudT.total_seats || localT.total_seats || 40);
      return {
        ...cloudT,
        total_seats: effectiveSeats,
        departures: (cloudT.departures && cloudT.departures.length > 0) ? cloudT.departures : (localT.departures || []),
        meeting_point: cloudT.meeting_point || localT.meeting_point || "Dhaka Sayedabad / Fakirapool",
        pickup_points: (cloudT.pickup_points && cloudT.pickup_points.length > 0) ? cloudT.pickup_points : (localT.pickup_points || []),
        departure_schedule: cloudT.departure_schedule || localT.departure_schedule || "Every Friday 7:00 AM",
        gallery: (localT.gallery && localT.gallery.length > 0) ? localT.gallery : cloudT.gallery,
      };
    });
  }

  // 10. CMS Homepage Blocks: preserve blocks
  if (localDb.homepageBlocks && localDb.homepageBlocks.length > 0) {
    const cloudBlockIds = new Set((cloudDb.homepageBlocks || []).map((b) => b.id));
    const mergedBlocks = [...(cloudDb.homepageBlocks || [])];
    for (const localB of localDb.homepageBlocks) {
      if (!cloudBlockIds.has(localB.id)) {
        mergedBlocks.push(localB);
      } else if (localB.id === "block-home-page" || localB.id === "block-about-page" || localB.id === "block-journal-page" || localB.id === "block-hero-1" || localB.id === "block-seo-settings") {
        const idx = mergedBlocks.findIndex((b) => b.id === localB.id);
        if (idx !== -1) {
          mergedBlocks[idx] = {
            ...mergedBlocks[idx],
            content: { ...mergedBlocks[idx].content, ...localB.content },
          };
        }
      }
    }
    cloudDb.homepageBlocks = mergedBlocks;
  }

  // 11. Tour Categories: reconcile cloud and local categories
  const catMap = new Map<string, DbTourCategory>();
  for (const c of DEFAULT_TOUR_CATEGORIES) {
    catMap.set(c.id, c);
  }
  for (const lc of localDb.tourCategories || []) {
    catMap.set(lc.id, lc);
  }
  for (const cc of cloudDb.tourCategories || []) {
    catMap.set(cc.id, cc);
  }
  cloudDb.tourCategories = Array.from(catMap.values());

  // 12. Staff Users: preserve local staff accounts if cloud is empty or missing them
  if (localDb.staffUsers && localDb.staffUsers.length > 0) {
    const cloudStaffIds = new Set((cloudDb.staffUsers || []).map((s) => s.id));
    const mergedStaff = [...(cloudDb.staffUsers || [])];
    for (const localS of localDb.staffUsers) {
      if (!cloudStaffIds.has(localS.id)) {
        mergedStaff.push(localS);
      }
    }
    cloudDb.staffUsers = mergedStaff;
  }

  // 13. Testimonials & Blog Posts: preserve local testimonials and blogs
  if (localDb.testimonials && localDb.testimonials.length > 0) {
    const cloudIds = new Set((cloudDb.testimonials || []).map((t) => t.id));
    const merged = [...(cloudDb.testimonials || [])];
    for (const localT of localDb.testimonials) {
      if (!cloudIds.has(localT.id)) {
        merged.push(localT);
      }
    }
    cloudDb.testimonials = merged;
  }

  if (localDb.blogPosts && localDb.blogPosts.length > 0) {
    const cloudIds = new Set((cloudDb.blogPosts || []).map((b) => b.id));
    const merged = [...(cloudDb.blogPosts || [])];
    for (const localB of localDb.blogPosts) {
      if (!cloudIds.has(localB.id)) {
        merged.push(localB);
      }
    }
    cloudDb.blogPosts = merged;
  }

  return cloudDb;
}

function triggerBackgroundSupabaseSync() {
  if (isFetchingSupabase) return;
  const now = Date.now();
  if (now - lastSupabaseFetch < SUPABASE_SYNC_INTERVAL_MS) return;
  lastSupabaseFetch = now;
  isFetchingSupabase = true;
  const counterAtStart = mutationCounter;

  getCloudDatabase()
    .then((cloudDb) => {
      if (!cloudDb) return;
      if (mutationCounter !== counterAtStart) return;
      if (cloudDb.destinations.length > 0 || cloudDb.tours.length > 0) {
        if (!memoryDb && fs.existsSync(DB_FILE)) {
          try {
            const raw = fs.readFileSync(DB_FILE, "utf-8");
            memoryDb = JSON.parse(raw) as DatabaseSchema;
          } catch {}
        }
        const merged = memoryDb ? mergeCloudWithLocal(cloudDb, memoryDb) : cloudDb;
        memoryDb = merged;
        try {
          if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
          fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), "utf-8");
          lastDbMtime = fs.statSync(DB_FILE).mtimeMs;
        } catch {}
      }
    })
    .catch((err) => console.warn("[Supabase Sync] Background sync error:", err))
    .finally(() => {
      isFetchingSupabase = false;
    });
}

export async function refreshFromSupabase(): Promise<DatabaseSchema> {
  const cloudDb = await fetchDatabaseFromSupabase();
  if (cloudDb && (cloudDb.destinations.length > 0 || cloudDb.tours.length > 0)) {
    lastSupabaseFetch = Date.now();
    if (!memoryDb && fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        memoryDb = JSON.parse(raw) as DatabaseSchema;
      } catch {}
    }
    const merged = memoryDb ? mergeCloudWithLocal(cloudDb, memoryDb) : cloudDb;
    memoryDb = merged;
    try {
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), "utf-8");
      lastDbMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch {}
    return merged;
  }
  return loadDb();
}

let hydrationPromise: Promise<DatabaseSchema> | null = null;

/**
 * Guarantees that live database data is populated from Supabase into memoryDb.
 * Coalesces concurrent calls into a single in-flight network request.
 */
export async function ensureDbHydrated(): Promise<DatabaseSchema> {
  const now = Date.now();
  if (
    memoryDb &&
    Array.isArray(memoryDb.tours) &&
    memoryDb.tours.length > 0 &&
    lastSupabaseFetch > 0 &&
    now - lastSupabaseFetch < SUPABASE_SYNC_INTERVAL_MS
  ) {
    return memoryDb;
  }
  if (!hydrationPromise) {
    hydrationPromise = refreshFromSupabase().finally(() => {
      hydrationPromise = null;
    });
  }
  return await hydrationPromise;
}

export function normalizeDatabaseSchema(db: any): DatabaseSchema {
  if (!db || typeof db !== "object") db = {};
  if (!db.deletedEntities || typeof db.deletedEntities !== "object") {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
      bookings: [],
    };
  }

  const deletedDests = new Set(db.deletedEntities.destinations || []);
  if (!Array.isArray(db.destinations)) {
    db.destinations = [];
  }
  if (Array.isArray(db.destinations)) {
    db.destinations = db.destinations.filter(
      (d: any) => !deletedDests.has(d.id) && !deletedDests.has(d.slug)
    );
  }

  const deletedTours = new Set(db.deletedEntities.tours || []);
  if (!Array.isArray(db.tours)) db.tours = [];
  else {
    db.tours = db.tours.filter(
      (t: any) => !deletedTours.has(t.id) && !deletedTours.has(t.slug)
    );
  }

  const deletedOffers = new Set(db.deletedEntities.offers || []);
  if (!Array.isArray(db.offers)) db.offers = [];
  else {
    db.offers = db.offers.filter(
      (o: any) => !deletedOffers.has(o.id) && (!o.code || !deletedOffers.has(o.code)) && (!o.slug || !deletedOffers.has(o.slug))
    );
  }

  const deletedTestimonials = new Set(db.deletedEntities.testimonials || []);
  if (!Array.isArray(db.testimonials)) db.testimonials = [];
  else {
    db.testimonials = db.testimonials.filter((t: any) => !deletedTestimonials.has(t.id));
  }

  const deletedBlogs = new Set(db.deletedEntities.blogPosts || []);
  if (!Array.isArray(db.blogPosts)) db.blogPosts = [];
  else {
    db.blogPosts = db.blogPosts.filter(
      (b: any) => !deletedBlogs.has(b.id) && !deletedBlogs.has(b.slug)
    );
  }

  const deletedBlocks = new Set(db.deletedEntities.homepageBlocks || []);
  if (!Array.isArray(db.homepageBlocks)) db.homepageBlocks = [];
  else {
    db.homepageBlocks = db.homepageBlocks.filter((b: any) => !deletedBlocks.has(b.id));
  }

  const deletedCategories = new Set(db.deletedEntities.tourCategories || []);
  if (!Array.isArray(db.tourCategories)) db.tourCategories = [];
  else {
    db.tourCategories = db.tourCategories.filter(
      (c: any) => !deletedCategories.has(c.id) && !deletedCategories.has(c.slug)
    );
  }

  const deletedBookings = new Set(db.deletedEntities?.bookings || []);
  if (!Array.isArray(db.staffUsers)) db.staffUsers = [];
  if (!Array.isArray(db.customers)) db.customers = [];
  if (!Array.isArray(db.bookings)) db.bookings = [];
  else {
    db.bookings = db.bookings.filter((b: any) => !deletedBookings.has(b.id));
  }
  if (!Array.isArray(db.payments)) db.payments = [];
  if (!Array.isArray(db.clearanceTickets)) db.clearanceTickets = [];
  if (!Array.isArray(db.alerts)) db.alerts = [];
  if (!Array.isArray(db.expenses)) db.expenses = [];
  if (!Array.isArray(db.suppliers)) db.suppliers = [];
  if (!Array.isArray(db.contactInquiries)) db.contactInquiries = [];
  if (!Array.isArray(db.analyticsEvents)) db.analyticsEvents = [];
  if (!Array.isArray(db.rocketIncomingSms)) db.rocketIncomingSms = [];

  // Guarantee that every booking has its transaction numbers linked from successful payments
  if (Array.isArray(db.bookings) && Array.isArray(db.payments)) {
    for (const b of db.bookings) {
      if (!b) continue;
      const pays = db.payments.filter((p: any) => p && p.booking_id === b.id && p.status === "success");
      for (const p of pays) {
        const trx = p.val_id || p.trx_id || p.tran_id;
        if (trx) {
          if (!b.transaction_id) b.transaction_id = trx;
          if (p.payment_type === "advance" && !b.advance_transaction_id) b.advance_transaction_id = trx;
          else if ((p.payment_type === "final" || p.payment_type === "due") && !b.due_transaction_id) b.due_transaction_id = trx;
          else if (p.payment_type === "full") {
            if (!b.advance_transaction_id) b.advance_transaction_id = trx;
            if (!b.due_transaction_id) b.due_transaction_id = trx;
          }
        }
      }
      if (b.transaction_id && !b.advance_transaction_id) {
        b.advance_transaction_id = b.transaction_id;
      }
    }
  }

  // Guarantee tours are connected to valid destination IDs, names, and slugs
  if (Array.isArray(db.tours) && Array.isArray(db.destinations)) {
    const destBySlug = new Map<string, DbDestination>(db.destinations.map((d: DbDestination) => [d.slug, d]));
    const destById = new Map<string, DbDestination>(db.destinations.map((d: DbDestination) => [d.id, d]));
    for (const t of db.tours) {
      if (!t) continue;
      const matched = destBySlug.get(t.destination_slug) || (t.destination_id ? destById.get(t.destination_id) : null);
      if (matched) {
        if (!t.destination_id) t.destination_id = matched.id;
        if (!t.destination_name) t.destination_name = matched.name;
        if (!t.destination_slug) t.destination_slug = matched.slug;
      }
    }
  }

  return db as DatabaseSchema;
}

export function loadDb(): DatabaseSchema {
  triggerBackgroundSupabaseSync();
  try {
    if (fs.existsSync(DB_FILE)) {
      const stat = fs.statSync(DB_FILE);
      if (memoryDb && stat.mtimeMs <= lastDbMtime) {
        if (autoCancelExpiredCashBookings(memoryDb)) {
          void saveDb(memoryDb);
        }
        return normalizeDatabaseSchema(memoryDb);
      }
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      memoryDb = normalizeDatabaseSchema(JSON.parse(raw));
      lastDbMtime = stat.mtimeMs;
      if (autoCancelExpiredCashBookings(memoryDb)) {
        void saveDb(memoryDb);
      }
      return memoryDb;
    }
  } catch (err) {
    console.error("Failed to read database file, initializing from seed:", err);
  }

  if (memoryDb) {
    return normalizeDatabaseSchema(memoryDb);
  }

  // When deployed on serverless (e.g. Vercel), DB_FILE is in /tmp and does not exist on cold start.
  // Check for pre-bundled database snapshots in the project before falling back to empty seed data.
  const bundledCandidates = [
    path.join(process.cwd(), ".data", "db.json"),
    path.join(process.cwd(), "data_storage", "db.json"),
  ];
  for (const candidatePath of bundledCandidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidatePath)) {
      try {
        const raw = fs.readFileSync(/*turbopackIgnore: true*/ candidatePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && (Array.isArray(parsed.destinations) || Array.isArray(parsed.tours))) {
          memoryDb = normalizeDatabaseSchema(parsed);
          void saveDb(memoryDb, false);
          return memoryDb;
        }
      } catch (err) {
        console.warn(`[loadDb] Failed reading candidate bundled snapshot at ${candidatePath}:`, err);
      }
    }
  }

  memoryDb = createSeedData();
  void saveDb(memoryDb, true);
  return memoryDb;
}

// Throttle periodic backups to manage Supabase free tier bandwidth
let lastFullSnapshotBackup = 0;
const FULL_SNAPSHOT_BACKUP_INTERVAL_MS = Number(process.env.SUPABASE_SNAPSHOT_BACKUP_INTERVAL_MS) || 5 * 60 * 1000;

export async function saveDb(data: DatabaseSchema, forceCloudSync = false): Promise<boolean> {
  // Cap unbounded alerts array to prevent memory leaks / OOM
  if (Array.isArray(data.alerts) && data.alerts.length > 1000) {
    data.alerts.length = 1000;
  }
  memoryDb = normalizeDatabaseSchema(data);
  mutationCounter++;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), "utf-8");
    try {
      lastDbMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch {
      lastDbMtime = Date.now();
    }
  } catch (err) {
    console.error("Failed to persist database file to disk:", err);
  }

  const now = Date.now();
  const shouldSyncSnapshot = forceCloudSync || (!isServerlessReadOnly && (now - lastFullSnapshotBackup >= FULL_SNAPSHOT_BACKUP_INTERVAL_MS));
  if (!shouldSyncSnapshot) {
    return true;
  }
  lastFullSnapshotBackup = now;

  try {
    return await syncDatabaseToSupabase(memoryDb);
  } catch (err) {
    console.warn("[Supabase Sync] Cloud storage snapshot sync warning:", err);
    return false;
  }
}

/**
 * Guarantees that the current in-memory database is immediately committed to disk
 * and uploaded to Supabase Cloud Storage mirror (bypassing any throttle intervals).
 */
export async function persistDatabase(forceCloudSnapshot = true): Promise<boolean> {
  const db = loadDb();
  return await saveDb(db, forceCloudSnapshot);
}

export function getRawDb(): DatabaseSchema {
  return loadDb();
}

// ---------------------------------------------------------------------------
// Destinations
// ---------------------------------------------------------------------------

export function getDestinations(): DbDestination[] {
  const db = loadDb();
  return db.destinations.filter((d) => d.status === "published");
}

export function getDestinationBySlug(slug: string): DbDestination | null {
  const db = loadDb();
  return db.destinations.find((d) => d.slug === slug || d.id === slug) || null;
}

// ---------------------------------------------------------------------------
// Tours
// ---------------------------------------------------------------------------

/**
 * Calculates all currently occupied/booked seats for a specific tour departure.
 * Gathers selected seats from all non-cancelled bookings.
 */
function bookingsForDeparture(
  db: DatabaseSchema,
  tourId: string,
  departureId?: string,
  departureDate?: string
): DbBooking[] {
  const nowMs = Date.now();
  return db.bookings.filter((b) => {
    if (!isSeatHoldingBooking(b, nowMs)) return false;
    if (b.tour_id !== tourId && b.tour_slug !== tourId) return false;

    const matchDepId = Boolean(departureId) && b.departure_id === departureId;
    const matchDepDate =
      Boolean(departureDate) && Boolean(b.departure_date) && b.departure_date!.slice(0, 10) === departureDate!.slice(0, 10);

    return matchDepId || matchDepDate || (!departureId && !departureDate);
  });
}

export function getBookedSeatsForDeparture(
  tourId: string,
  departureId?: string,
  departureDate?: string
): string[] {
  const db = loadDb();
  const bookedSet = new Set<string>();

  for (const b of bookingsForDeparture(db, tourId, departureId, departureDate)) {
    if (Array.isArray(b.selected_seats)) {
      for (const seat of b.selected_seats) {
        if (seat && typeof seat === "string") bookedSet.add(seat.trim().toUpperCase());
      }
    }
  }

  return Array.from(bookedSet).sort();
}

/**
 * Seats taken on a departure. Bookings made WITHOUT seat selection still occupy
 * `traveler_count` seats; counting only named seats let those bookings oversell
 * a departure indefinitely.
 */
export function getOccupiedSeatCount(tourId: string, departureId?: string, departureDate?: string): number {
  const db = loadDb();
  let total = 0;
  for (const b of bookingsForDeparture(db, tourId, departureId, departureDate)) {
    const named = Array.isArray(b.selected_seats) ? b.selected_seats.length : 0;
    total += Math.max(named, Number(b.traveler_count) || 1);
  }
  return total;
}

function attachDepartureSeats(tour: DbTour): DbTour {
  const totalSeats = Number(tour.total_seats) || 40;
  const rawDepartures =
    tour.departures && tour.departures.length > 0
      ? tour.departures
      : generateInitialDepartures();

  return {
    ...tour,
    total_seats: totalSeats,
    departures: rawDepartures.map((d) => {
      const booked = getBookedSeatsForDeparture(tour.id, d.id, d.departure_date);
      const occupied = getOccupiedSeatCount(tour.id, d.id, d.departure_date);
      const depTotalSeats = Number(tour.total_seats) || Number(d.total_seats) || totalSeats;
      return {
        ...d,
        total_seats: depTotalSeats,
        seats_remaining: Math.max(0, depTotalSeats - Math.max(occupied, booked.length)),
        booked_seats: booked,
      };
    }),
  };
}

export function getTours(destinationSlug?: string, category?: string): DbTour[] {
  const db = loadDb();
  let results = db.tours.filter((t) => t.status === "published");

  if (destinationSlug) {
    results = results.filter((t) => t.destination_slug === destinationSlug || t.destination_id === destinationSlug);
  }
  if (category && category !== "All") {
    const catNorm = category.toLowerCase().replace(/[^a-z0-9]+/g, "");
    results = results.filter((t) => {
      const tourCatNorm = t.category.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return tourCatNorm.includes(catNorm) || catNorm.includes(tourCatNorm);
    });
  }

  return results.map(attachDepartureSeats);
}

export function getTourBySlug(slug: string): DbTour | null {
  const db = loadDb();
  const tour = db.tours.find((t) => t.slug === slug);
  if (!tour) return null;
  return attachDepartureSeats(tour);
}

export function getTourById(id: string): DbTour | null {
  const db = loadDb();
  const tour = db.tours.find((t) => t.id === id);
  if (!tour) return null;
  return attachDepartureSeats(tour);
}

// ---------------------------------------------------------------------------
// CMS: Offers, Testimonials, Blog
// ---------------------------------------------------------------------------

export function getOffers(): DbOffer[] {
  const db = loadDb();
  return db.offers.filter((o) => o.is_active !== false);
}

export interface PromoValidationResult {
  valid: boolean;
  code?: string;
  title?: string;
  discount_type?: "percent" | "flat";
  discount_value?: string;
  discount_amount?: number;
  new_total?: number;
  error?: string;
  tour_id?: string | null;
  tour_title?: string | null;
}

export function validatePromoCode(
  code: string,
  tourId: string,
  tourSlug?: string,
  totalAmount?: number
): PromoValidationResult {
  const db = loadDb();
  if (!code || !code.trim()) {
    return { valid: false, error: "Please enter a promo code." };
  }

  const cleanCode = code.trim().toUpperCase();
  const offer = db.offers.find(
    (o) => (o.code || o.slug).toUpperCase() === cleanCode && o.is_active !== false
  );

  if (!offer) {
    return { valid: false, error: "Invalid promo code." };
  }

  const now = new Date();
  if (offer.valid_until) {
    // Date-only values are inclusive through the end of that day in Asia/Dhaka.
    const untilMs = offer.valid_until.length === 10
      ? new Date(`${offer.valid_until}T23:59:59.999+06:00`).getTime()
      : new Date(offer.valid_until).getTime();
    if (!isNaN(untilMs) && untilMs < now.getTime()) {
      return { valid: false, error: "This promo code has expired." };
    }
  }

  if (offer.valid_from) {
    const fromMs = offer.valid_from.length === 10
      ? new Date(`${offer.valid_from}T00:00:00.000+06:00`).getTime()
      : new Date(offer.valid_from).getTime();
    if (!isNaN(fromMs) && fromMs > now.getTime()) {
      return { valid: false, error: "This promo code is not active yet." };
    }
  }

  // Check specific tour restriction
  const isTourRestricted = Boolean(offer.tour_id || offer.tour_slug);
  if (isTourRestricted) {
    const matchesTour =
      (offer.tour_id && (offer.tour_id === tourId || offer.tour_id === tourSlug)) ||
      (offer.tour_slug && (offer.tour_slug === tourSlug || offer.tour_slug === tourId));

    if (!matchesTour) {
      const targetTour = offer.tour_title || offer.tour_slug || "another specific tour";
      return {
        valid: false,
        error: `This promo code is only valid for "${targetTour}". It cannot be used for this tour.`,
      };
    }
  }

  const baseTotal = totalAmount || 0;
  const minSpend = parseFloat(offer.minimum_spend || "0");
  if (minSpend > 0 && baseTotal > 0 && baseTotal < minSpend) {
    return {
      valid: false,
      error: `Minimum booking spend of ৳${minSpend.toLocaleString()} is required to use promo code ${cleanCode}.`,
    };
  }

  let discountAmount = 0;
  if (offer.discount_type === "percent") {
    const pct = parseFloat(offer.discount_value || "0") || 0;
    discountAmount = Math.round((baseTotal * pct) / 100);
  } else {
    discountAmount = Math.round(parseFloat(offer.discount_value || "0") || 0);
  }

  if (baseTotal > 0) {
    discountAmount = Math.min(discountAmount, baseTotal);
  }

  const newTotal = Math.max(0, baseTotal - discountAmount);

  return {
    valid: true,
    code: offer.code || offer.slug,
    title: offer.title,
    discount_type: offer.discount_type,
    discount_value: offer.discount_value,
    discount_amount: discountAmount,
    new_total: newTotal,
    tour_id: offer.tour_id || null,
    tour_title: offer.tour_title || null,
  };
}

export function getTestimonials(onlyFeatured: boolean = false): DbTestimonial[] {
  const db = loadDb();
  if (onlyFeatured) {
    const featured = db.testimonials.filter((t) => t.is_featured);
    return featured.length > 0 ? featured : db.testimonials;
  }
  return db.testimonials;
}

export function getBlogPosts(): DbBlogPost[] {
  const db = loadDb();
  return db.blogPosts
    .filter((p) => p.status === "published" || p.is_published !== false)
    .sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (
        new Date(b.published_at || b.created_at || 0).getTime() -
        new Date(a.published_at || a.created_at || 0).getTime()
      );
    });
}

export function getBlogPostBySlug(slug: string): DbBlogPost | null {
  const db = loadDb();
  return db.blogPosts.find((p) => p.slug === slug) || null;
}

export function getHomepageBlocks(): DbHomepageBlock[] {
  const db = loadDb();
  return [...db.homepageBlocks].sort((a, b) => a.display_order - b.display_order);
}

export const DEFAULT_ABOUT_CMS: AboutPageCmsContent = {
  hero_eyebrow: "Our story",
  hero_title: "Built by people who call Bangladesh home",
  hero_subtitle:
    "Savar Tour Lover (সাভার ট্যুর লাভার) started with a simple belief: আপনার স্বপ্ন উড়তে দিন (Let your dreams fly). Booking a domestic trip shouldn't mean middlemen, vague pricing, and cash changing hands with no record. We built the agency we wished existed — local hosts, honest pricing, and transparent booking.",
  story_badge: "The Savar Tour Lover Standard",
  story_title: "Why we started",
  story_paragraphs: [
    "Most domestic travel in Bangladesh is organized through word-of-mouth recommendations, social media groups, or informal fixers. Prices shift depending on who's asking, booking confirmations are a verbal promise, and if something goes wrong, there's no recourse.",
    "We wanted something different: trips you could book with complete confidence, hosted by people from the actual communities you're visiting, with clear itineraries and receipts for every taka paid.",
    "Every route we offer is one we've traveled ourselves multiple times — staying at the same eco-cottages, riding the same wooden engine boats, and breaking bread with the same village hosts.",
  ],
  mission_title: "Our Mission",
  mission_text:
    "To connect travelers with authentic, dignified local hosting across every district of Bangladesh — backed by transparent pricing, flexible payments, and human support.",
  values: [
    {
      icon: "shield",
      title: "Radical transparency",
      description:
        "Every taka is accounted for — the price you see is the price you pay, and every payment is confirmed on both sides.",
    },
    {
      icon: "users",
      title: "Local, always",
      description:
        "No outsourced guides, no foreign templates. Every host is Bangladeshi, and every itinerary is built around real local knowledge.",
    },
    {
      icon: "heart",
      title: "Hospitality first",
      description:
        "We host you the way we'd host family, not process you like a booking number. Your dream travel is our passion.",
    },
    {
      icon: "sparkle",
      title: "Considered detail",
      description:
        "From the ridge walk only locals know to the candlelit dinner arranged without being asked — the small things are the trip.",
    },
  ],
  booking_eyebrow: "How booking works",
  booking_title: "Zero-friction, start to finish",
  booking_description:
    "From your first search to your final confirmed payment, every step is designed to remove friction and ambiguity.",
  team_eyebrow: "The team",
  team_title: "A few of the people who'll host you",
  team: [
    {
      name: "Raisa Chowdhury",
      role: "Co-founder & Head of Experience",
      bio: "Ten years guiding across the Chittagong Hill Tracts before building Savar Tour Lover's tour design team.",
      scene: "sajek",
    },
    {
      name: "Tanvir Hasan",
      role: "Co-founder & Head of Operations",
      bio: "Runs the host network and on-ground logistics across all twelve destinations.",
      scene: "sundarbans",
    },
    {
      name: "Mehedi Hasan",
      role: "Head of Finance",
      bio: "Built the secure payment and booking system so every advance and balance is tracked without ambiguity.",
      scene: "coxsbazar",
    },
  ],
  payment_badge: "Payment & Confirmation",
  payment_title: "How your money is handled, end to end",
  payment_description:
    "Pay in full or pay a small advance through bKash, Nagad, Rocket, or card at booking. If you paid partially, the remaining balance is settled on the day of the tour — either online or in cash directly with your host. The moment it clears, both you and our team get a WhatsApp and email confirmation, so there's a clean record of what was paid, when, on both sides.",
  payment_cta_label: "Talk to us",
  payment_cta_href: "/contact",
  cta_title: "Ready to plan your own story?",
  cta_description:
    "Tell us where you want to go — we'll take it from there, right through to your final confirmed payment.",
  cta_label: "Plan My Trip",
  cta_href: "/contact",
};

export const DEFAULT_JOURNAL_CMS: JournalPageCmsContent = {
  header_eyebrow: "Travel Journal",
  header_title: "Stories from the road",
  header_description:
    "Field guides, food trails, and honest travel writing from our hosts and guests across Bangladesh.",
  featured_badge: "Latest story",
  empty_title: "No articles published yet",
  empty_description:
    "Stories, packing guides, and field notes will appear here once written and published from the Super Admin Panel.",
};

export function getAboutPageCms(): AboutPageCmsContent {
  const db = loadDb();
  const block = db.homepageBlocks.find(
    (b) => b.block_type === "about_page" || b.id === "block-about-page"
  );
  if (!block || !block.content) return DEFAULT_ABOUT_CMS;
  return { ...DEFAULT_ABOUT_CMS, ...(block.content as Partial<AboutPageCmsContent>) };
}

export async function saveAboutPageCms(content: Partial<AboutPageCmsContent>): Promise<DbHomepageBlock> {
  const current = getAboutPageCms();
  const merged = { ...current, ...content };
  return await saveHomepageBlock("block-about-page", "about_page", merged as Record<string, unknown>);
}

export function getJournalPageCms(): JournalPageCmsContent {
  const db = loadDb();
  const block = db.homepageBlocks.find(
    (b) => b.block_type === "journal_page" || b.id === "block-journal-page"
  );
  if (!block || !block.content) return DEFAULT_JOURNAL_CMS;
  return { ...DEFAULT_JOURNAL_CMS, ...(block.content as Partial<JournalPageCmsContent>) };
}

export async function saveJournalPageCms(content: Partial<JournalPageCmsContent>): Promise<DbHomepageBlock> {
  const current = getJournalPageCms();
  const merged = { ...current, ...content };
  return await saveHomepageBlock("block-journal-page", "journal_page", merged as Record<string, unknown>);
}

export const DEFAULT_HERO_SLIDES: HeroSlideItem[] = [];

export const DEFAULT_HOME_CMS: HomePageCmsContent = {
  // 1. Hero
  hero_media_type: "slideshow",
  hero_video_url: "",
  hero_slides: DEFAULT_HERO_SLIDES,
  hero_eyebrow: "Savar Tour Lover — আপনার স্বপ্ন উড়তে দিন",
  hero_headline: "Discover Bangladesh,",
  hero_highlight: "Let Your Dreams Fly",
  hero_subheadline: "Curated domestic tours with Savar Tour Lover. Trusted local hosts. Book with an advance and clear the balance on tour day.",
  hero_primary_cta_label: "Explore Tours",
  hero_primary_cta_href: "/tours",
  hero_secondary_cta_label: "Plan My Trip",
  hero_secondary_cta_href: "/contact",

  // 2. Destinations
  destinations_eyebrow: "Destinations",
  destinations_title: "Popular destinations across Bangladesh",
  destinations_description: "Beaches, hill tracts, mangrove forests, and tea country — pick a place, we'll handle the rest.",
  destinations_cta_label: "All destinations",
  destinations_cta_href: "/destinations",
  destinations_hidden: false,

  // 3. Tours
  tours_eyebrow: "Tour Packages",
  tours_title: "Popular tour packages",
  tours_description: "Small groups, local hosts, and everything included. Filter by place, duration, or price to find your trip in seconds.",
  tours_cta_label: "Browse all tours",
  tours_cta_href: "/tours",
  tours_hidden: false,

  // 4. Why Us
  why_us_eyebrow: "Why Savar Tour Lover",
  why_us_title: "Travel with people who call Bangladesh home",
  why_us_description: "We're not a booking platform that outsources your trip to strangers. We're local hosts who plan, accompany, and settle every detail — including your final payment, confirmed on both sides.",
  why_us_items: [
    {
      title: "Trusted local hosts",
      description: "Every tour is led by a verified Bangladeshi host who knows their district like family — not a scripted guide.",
      icon: "users",
    },
    {
      title: "Transparent pricing",
      description: "The price you see is the price you pay. No hidden fees, no last-minute 'fuel surcharges', no surprises.",
      icon: "receipt",
    },
    {
      title: "Flexible payment",
      description: "Book with a 40% advance and clear the balance on tour day — online or directly with your host, with confirmation to both sides.",
      icon: "receipt",
    },
    {
      title: "Zero-friction booking",
      description: "From browsing to e-ticket in minutes. Your voucher, digital ticket, and reminders arrive automatically on WhatsApp and email.",
      icon: "ticket",
    },
    {
      title: "Real 24/7 support",
      description: "A human answers on WhatsApp throughout your trip — not a chatbot that loops you in circles.",
      icon: "support",
    },
    {
      title: "Money, fully accounted",
      description: "Every payment is tracked end-to-end and confirmed to you and our team, so there's never a dispute about what was paid.",
      icon: "shield",
    },
  ],
  why_us_hidden: false,

  // 5. Services
  services_eyebrow: "Services",
  services_title: "Every kind of trip, handled",
  services_description: "Group or private, family or honeymoon, weekend or expedition — if it's in Bangladesh, we'll host it.",
  services_items: [
    {
      title: "Group Tours",
      description: "Curated group departures to every corner of Bangladesh, led by a local host and priced all-inclusive.",
      icon: "users",
    },
    {
      title: "Private & Custom Trips",
      description: "Your dates, your pace, your budget. We design a private itinerary around exactly what you want to do.",
      icon: "route",
    },
    {
      title: "Honeymoon Packages",
      description: "Ocean-view suites, candlelit dinners, and private moments — built for two, from arrival flowers to departure.",
      icon: "heart",
    },
    {
      title: "Family Holidays",
      description: "Kids-first pacing, safe transport, and hosts who handle the logistics so parents actually relax.",
      icon: "home",
    },
    {
      title: "Corporate Retreats",
      description: "Team trips to the hills or the coast with planning, logistics, and bonding activities handled end to end.",
      icon: "briefcase",
    },
    {
      title: "Adventure & Trekking",
      description: "Hill-tract treks, forest cruises, and off-the-map experiences with certified local guides and permits arranged.",
      icon: "mountain",
    },
  ],
  services_hidden: false,

  // 6. Offers
  offers_eyebrow: "Special Offers",
  offers_title: "A little reason to book today",
  offers_description: "Seasonal savings and group perks — applied automatically at checkout with the right code.",
  offers_hidden: false,

  // 7. Reviews
  reviews_eyebrow: "Customer Reviews",
  reviews_title: "Loved by travelers across Bangladesh",
  reviews_description: "Real words from guests who booked, travelled, and settled their balances — all in one seamless flow.",
  reviews_hidden: false,

  // 8. Journal
  journal_eyebrow: "Travel Journal",
  journal_title: "Stories from the road",
  journal_description: "Field guides, food trails, and honest travel writing from our hosts and guests.",
  journal_cta_label: "All stories",
  journal_cta_href: "/journal",
  journal_hidden: false,

  // 9. CTA Banner
  cta_eyebrow: "Savar Tour Lover — আপনার স্বপ্ন উড়তে দিন",
  cta_title: "Plan your next journey across Bangladesh",
  cta_description: "Tell us where you want to go and when — we'll design a tour around you. Book with a small advance and settle the rest on tour day.",
  cta_primary_label: "Plan My Trip",
  cta_primary_href: "/contact",
  cta_secondary_label: "Browse Tours",
  cta_secondary_href: "/tours",
  cta_hidden: false,
};

export function getHomePageCms(): HomePageCmsContent {
  const db = loadDb();
  if (!Array.isArray(db.homepageBlocks)) {
    db.homepageBlocks = [];
  }
  const block = db.homepageBlocks.find(
    (b) => b.block_type === "home_page" || b.id === "block-home-page"
  );

  // Derive dynamic hero slides ONLY from real published destinations in the database
  const dynamicHeroSlides: HeroSlideItem[] = (db.destinations || [])
    .filter((d) => d.status === "published" && d.cover_image)
    .map((d) => ({
      id: `slide-${d.slug}`,
      title: d.name,
      subtitle: d.tagline || d.description ? (d.tagline || d.description).slice(0, 70) : "",
      image_url: d.cover_image || "",
    }));

  const baseHomeCms: HomePageCmsContent = {
    ...DEFAULT_HOME_CMS,
    hero_slides: dynamicHeroSlides.length > 0 ? dynamicHeroSlides : [],
  };

  if (!block || !block.content) return baseHomeCms;
  const content = block.content as Partial<HomePageCmsContent>;
  return {
    ...baseHomeCms,
    ...content,
    hero_slides:
      Array.isArray(content.hero_slides) && content.hero_slides.length > 0
        ? content.hero_slides
        : (dynamicHeroSlides.length > 0 ? dynamicHeroSlides : []),
  };
}

export async function saveHomePageCms(content: Partial<HomePageCmsContent>): Promise<DbHomepageBlock> {
  const current = getHomePageCms();
  const merged = { ...current, ...content };
  return await saveHomepageBlock("block-home-page", "home_page", merged as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// SEO Settings & Bangladesh Ranking Engine
// ---------------------------------------------------------------------------

export { DEFAULT_BANGLADESH_SEO_KEYWORDS, DEFAULT_SEO_SETTINGS } from "@/data/seo";
import { DEFAULT_SEO_SETTINGS } from "@/data/seo";

export function getSeoSettings(): SeoSettings {
  const db = loadDb();
  if (!Array.isArray(db.homepageBlocks)) {
    db.homepageBlocks = [];
  }
  const block = db.homepageBlocks.find(
    (b) => b.block_type === "seo_settings" || b.id === "block-seo-settings"
  );
  if (!block || !block.content) return DEFAULT_SEO_SETTINGS;
  const content = block.content as Partial<SeoSettings>;
  return {
    ...DEFAULT_SEO_SETTINGS,
    ...content,
    keywords:
      Array.isArray(content.keywords) && content.keywords.length > 0
        ? content.keywords
        : DEFAULT_SEO_SETTINGS.keywords,
    pages: {
      ...DEFAULT_SEO_SETTINGS.pages,
      ...(content.pages || {}),
    },
  };
}

export async function saveSeoSettings(settings: Partial<SeoSettings>): Promise<DbHomepageBlock> {
  const current = getSeoSettings();
  const merged: SeoSettings = {
    ...current,
    ...settings,
    keywords:
      Array.isArray(settings.keywords) && settings.keywords.length > 0
        ? settings.keywords
        : current.keywords,
    pages: {
      ...current.pages,
      ...(settings.pages || {}),
    },
  };
  return await saveHomepageBlock("block-seo-settings", "seo_settings", merged as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export function findStaffByUsername(username: string): DbStaffUser | null {
  const db = loadDb();
  return db.staffUsers.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export function getStaffById(id: string): DbStaffUser | null {
  const db = loadDb();
  return db.staffUsers.find((u) => u.id === id) || null;
}

// Persists an upgraded password hash for a staff user (used to lazily
// migrate old low-iteration PBKDF2 hashes to the current standard the next
// time that user logs in successfully — see needsRehash() in server/auth.ts).
export async function updateStaffPasswordHash(userId: string, hash: string, salt: string): Promise<void> {
  const db = loadDb();
  const user = db.staffUsers.find((u) => u.id === userId);
  if (!user) return;
  user.password_hash = hash;
  user.salt = salt;
  await syncStaffUserToSupabase(user);
  await saveDb(db, false);
}

// Invalidates every refresh token issued to this user before now (see
// tokens_valid_from on DbStaffUser). Used by logout and can also be called
// to force-log-out a staff account (e.g. after a password reset or a
// suspected compromise) without needing to track individual token IDs.
export async function revokeStaffRefreshTokens(userId: string): Promise<void> {
  const db = loadDb();
  const user = db.staffUsers.find((u) => u.id === userId);
  if (!user) return;
  user.tokens_valid_from = Math.floor(Date.now() / 1000);
  await syncStaffUserToSupabase(user);
  await saveDb(db, false);
}

export function getAllStaffAdmin(): Omit<DbStaffUser, "password_hash" | "salt">[] {
  const db = loadDb();
  return db.staffUsers.map(({ password_hash, salt, ...safe }) => safe);
}

export async function saveStaffUser(data: {
  id?: string;
  username: string;
  password?: string;
  role: DbStaffUser["role"];
  phone_number?: string | null;
  email?: string | null;
  first_name: string;
  last_name: string;
}): Promise<Omit<DbStaffUser, "password_hash" | "salt">> {
  const db = loadDb();
  const id = data.id || `usr-${Date.now()}-${randomToken(4)}`;
  const index = db.staffUsers.findIndex(
    (u) => u.id === id || u.username.toLowerCase() === data.username.toLowerCase().trim()
  );

  if (index !== -1) {
    const existing = db.staffUsers[index];
    existing.first_name = data.first_name.trim();
    existing.last_name = data.last_name.trim();
    existing.role = data.role;
    if (data.phone_number !== undefined) existing.phone_number = data.phone_number;
    if (data.email !== undefined) existing.email = data.email;
    if (data.password && data.password.trim()) {
      const auth = hashPassword(data.password.trim());
      existing.password_hash = auth.hash;
      existing.salt = auth.salt;
    }
    await saveDb(db, true);
    await syncStaffUserToSupabase(existing);
    const { password_hash, salt, ...safe } = existing;
    return safe;
  }

  if (!data.password || !data.password.trim()) {
    throw new Error("Password is required when creating a new staff user.");
  }

  const auth = hashPassword(data.password.trim());
  const newStaff: DbStaffUser = {
    id,
    username: data.username.toLowerCase().trim(),
    password_hash: auth.hash,
    salt: auth.salt,
    role: data.role,
    phone_number: data.phone_number || null,
    email: data.email || null,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
  };

  db.staffUsers.push(newStaff);
  await saveDb(db, true);
  await syncStaffUserToSupabase(newStaff);
  const { password_hash, salt, ...safe } = newStaff;
  return safe;
}

export async function deleteStaffUser(id: string, currentAdminUsername: string): Promise<boolean> {
  const db = loadDb();
  const target = db.staffUsers.find((u) => u.id === id);
  if (!target) return false;

  if (target.username.toLowerCase() === currentAdminUsername.toLowerCase()) {
    throw new Error("You cannot delete your own staff account.");
  }

  const remainingSuperAdmins = db.staffUsers.filter(
    (u) => u.id !== id && u.role === "super_admin"
  );
  if (target.role === "super_admin" && remainingSuperAdmins.length === 0) {
    throw new Error("Cannot delete the last super admin account.");
  }

  db.staffUsers = db.staffUsers.filter((u) => u.id !== id);
  await saveDb(db, true);
  await deleteStaffUserFromSupabase(id);
  return true;
}

// ---------------------------------------------------------------------------
// Customers & Activities
// ---------------------------------------------------------------------------

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+880")) return cleaned;
  if (cleaned.startsWith("880")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+88" + cleaned;
  if (cleaned.startsWith("1")) return "+880" + cleaned;
  return cleaned;
}

export function getCustomerByPhone(phone: string): DbCustomerUser | null {
  const db = loadDb();
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return null;
  return (
    db.customers?.find(
      (c) => normalizePhoneNumber(c.phone_number) === normalized
    ) || null
  );
}

export function getCustomerById(id: string): DbCustomerUser | null {
  const db = loadDb();
  return db.customers?.find((c) => c.id === id) || null;
}

export async function getOrCreateCustomerByPhone(input: {
  phone_number: string;
  full_name: string;
  email?: string;
}): Promise<{ customer: DbCustomerUser; isNew: boolean }> {
  const db = loadDb();
  const normalized = normalizePhoneNumber(input.phone_number);

  if (!Array.isArray(db.customers)) {
    db.customers = [];
  }

  const existing = db.customers.find(
    (c) => normalizePhoneNumber(c.phone_number) === normalized
  );

  if (existing) {
    let changed = false;
    if (input.full_name && existing.full_name !== input.full_name && existing.full_name === "Valued Traveler") {
      existing.full_name = input.full_name;
      changed = true;
    }
    if (input.email && !existing.email) {
      existing.email = input.email;
      changed = true;
    }
    existing.updated_at = new Date().toISOString();
    if (changed) {
      await saveDb(db);
      await syncCustomerToSupabase(existing);
    }
    return { customer: existing, isNew: false };
  }

  const newCustomerId = `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const newCustomer: DbCustomerUser = {
    id: newCustomerId,
    phone_number: normalized || input.phone_number,
    full_name: input.full_name || "Valued Traveler",
    email: input.email || undefined,
    created_at: now,
    updated_at: now,
    last_login_at: now,
    activities: [
      {
        id: `act-${Date.now()}-1`,
        customer_id: newCustomerId,
        type: "account_created",
        title: "Account Created",
        description: `Welcome to Savar Tour Lover! Account instantly created for ${input.full_name || "Traveler"} (${normalized || input.phone_number}).`,
        created_at: now,
      },
    ],
  };

  db.customers.unshift(newCustomer);
  await saveDb(db);
  await syncCustomerToSupabase(newCustomer);
  return { customer: newCustomer, isNew: true };
}

export async function updateCustomer(
  id: string,
  update: Partial<Pick<DbCustomerUser, "full_name" | "email">>
): Promise<DbCustomerUser | null> {
  const db = loadDb();
  if (!Array.isArray(db.customers)) return null;
  const cust = db.customers.find((c) => c.id === id);
  if (!cust) return null;

  if (update.full_name !== undefined) cust.full_name = update.full_name;
  if (update.email !== undefined) cust.email = update.email;
  cust.updated_at = new Date().toISOString();

  await addCustomerActivity(cust.id, {
    type: "profile_updated",
    title: "Profile Updated",
    description: "Profile information was updated.",
  });

  await saveDb(db);
  await syncCustomerToSupabase(cust);
  return cust;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const db = loadDb();
  if (!Array.isArray(db.customers)) return false;
  const index = db.customers.findIndex((c) => c.id === id || c.phone_number === id);
  if (index === -1) return false;
  const [removed] = db.customers.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
      bookings: [],
      customers: [],
      contactInquiries: [],
    };
  }
  if (!db.deletedEntities.customers) db.deletedEntities.customers = [];
  if (removed.id && !db.deletedEntities.customers.includes(removed.id)) {
    db.deletedEntities.customers.push(removed.id);
  }
  if (removed.phone_number && !db.deletedEntities.customers.includes(removed.phone_number)) {
    db.deletedEntities.customers.push(removed.phone_number);
  }

  await saveDb(db, true);
  await deleteCustomerFromSupabase(removed.id);
  return true;
}

export async function addCustomerActivity(
  customerId: string,
  activity: {
    type: DbCustomerActivity["type"];
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const db = loadDb();
  if (!Array.isArray(db.customers)) return;
  const cust = db.customers.find((c) => c.id === customerId);
  if (!cust) return;

  if (!Array.isArray(cust.activities)) {
    cust.activities = [];
  }

  const newActivity: DbCustomerActivity = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    customer_id: customerId,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    metadata: activity.metadata,
    created_at: new Date().toISOString(),
  };

  cust.activities.unshift(newActivity);

  await saveDb(db);
  await syncCustomerActivityToSupabase(newActivity);
}

export function getCustomerBookings(phone: string, customerId?: string): DbBooking[] {
  const db = loadDb();
  const normalized = normalizePhoneNumber(phone);

  return db.bookings.filter((b) => {
    if (customerId && b.customer_id === customerId) return true;
    if (normalized && normalizePhoneNumber(b.customer_phone_number) === normalized) return true;
    return false;
  });
}

export interface CustomerWithDetails extends DbCustomerUser {
  bookings_count: number;
  total_spent: number;
  total_due: number;
  bookings: DbBooking[];
}

export function getAllCustomers(): CustomerWithDetails[] {
  const db = loadDb();
  if (!Array.isArray(db.customers)) {
    db.customers = [];
  }

  return db.customers.map((c) => {
    const custBookings = getCustomerBookings(c.phone_number, c.id);
    const totalSpent = custBookings.reduce(
      (acc, b) => acc + (parseFloat(b.amount_paid) || 0),
      0
    );
    const totalDue = custBookings.reduce(
      (acc, b) => acc + (parseFloat(b.amount_due) || 0),
      0
    );

    return {
      ...c,
      bookings_count: custBookings.length,
      total_spent: totalSpent,
      total_due: totalDue,
      bookings: custBookings,
    };
  });
}


// ---------------------------------------------------------------------------
// Bookings & Payments
// ---------------------------------------------------------------------------

export async function createBooking(input: {
  tour_id: string;
  departure_id?: string;
  traveler_count: number;
  payment_plan: "full" | "partial";
  payment_method?: "Bkash payment" | "sslcommerz" | "cash_on_hand" | "cash" | string;
  customer_full_name: string;
  customer_phone_number: string;
  customer_email?: string;
  pickup_point?: string;
  special_requests?: string;
  selected_seats?: string[];
  promo_code?: string;
}): Promise<{ booking: DbBooking; customer: DbCustomerUser }> {
  let db = loadDb();
  const tour = db.tours.find((t) => t.id === input.tour_id || t.slug === input.tour_id);
  if (!tour) {
    throw new Error("Tour not found");
  }

  // ---- Input validation (this endpoint is public) ----
  const customerName = String(input.customer_full_name ?? "").trim();
  if (customerName.length < 2 || customerName.length > 100) {
    throw new Error("Please enter your full name (2-100 characters).");
  }
  const phoneDigits = String(input.customer_phone_number ?? "").replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    throw new Error("Please enter a valid phone number.");
  }
  const customerEmail = String(input.customer_email ?? "").trim();
  if (customerEmail && (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
    throw new Error("Please enter a valid email address.");
  }
  // The server appends its own "[Promo: ...]" tag to special_requests and later parses it back.
  // Strip look-alikes from user text so nobody can forge a discount line.
  const userRequests = String(input.special_requests ?? "")
    .replace(/\[\s*Promo\s*:[^\]]*\]?/gi, "")
    .trim()
    .slice(0, 1000);

  // De-duplicate seats: ["A1","A1"] used to count as two travelers for one seat.
  const selectedSeats = Array.from(
    new Set(
      (Array.isArray(input.selected_seats) ? input.selected_seats : [])
        .map((seat) => String(seat).trim().toUpperCase())
        .filter(Boolean)
    )
  );
  if (selectedSeats.length > MAX_TRAVELERS_PER_BOOKING) {
    throw new Error(`You can book at most ${MAX_TRAVELERS_PER_BOOKING} seats at a time.`);
  }
  if (selectedSeats.some((seat) => !/^[A-Z]{1,2}[0-9]{1,2}$/.test(seat))) {
    throw new Error("One or more selected seats are invalid.");
  }

  const effectiveTravelerCount =
    selectedSeats.length > 0
      ? selectedSeats.length
      : Math.min(MAX_TRAVELERS_PER_BOOKING, Math.max(1, Math.floor(Number(input.traveler_count)) || 1));

  let departure: DbDeparture | undefined;
  if (input.departure_id) {
    if (!tour.departures || tour.departures.length === 0) {
      tour.departures = generateInitialDepartures(Number(tour.total_seats) || 40);
    }
    departure = tour.departures.find((d) => d.id === input.departure_id);
    if (!departure) {
      throw new Error("Departure date not found");
    }

    // Anti-double-booking check: ensure none of the requested seats are already taken
    if (selectedSeats.length > 0) {
      const alreadyBooked = getBookedSeatsForDeparture(tour.id, departure.id, departure.departure_date);
      const conflicts = selectedSeats.filter((seat) => alreadyBooked.includes(seat));
      if (conflicts.length > 0) {
        throw new Error(
          `Seat(s) ${conflicts.join(", ")} are already booked by another traveler. Please choose other available seats.`
        );
      }
    }

    // Availability is derived from the actual bookings (same source the seat map uses) rather than
    // a stored counter, which drifted from reality and never gave seats back on cancellation.
    const departureCapacity = departure.total_seats || Number(tour.total_seats) || 40;
    const occupied = getOccupiedSeatCount(tour.id, departure.id, departure.departure_date);
    if (departureCapacity - occupied < effectiveTravelerCount) {
      throw new Error("Not enough seats remaining for this departure");
    }
  } else if (selectedSeats.length > 0) {
    const alreadyBooked = getBookedSeatsForDeparture(tour.id);
    const conflicts = selectedSeats.filter((seat) => alreadyBooked.includes(seat));
    if (conflicts.length > 0) {
      throw new Error(
        `Seat(s) ${conflicts.join(", ")} are already booked by another traveler. Please choose other available seats.`
      );
    }
  }

  const normalizedPhone = normalizePhoneNumber(input.customer_phone_number) || input.customer_phone_number;

  // Auto-create or link customer account
  const { customer } = await getOrCreateCustomerByPhone({
    phone_number: normalizedPhone,
    full_name: customerName,
    email: customerEmail || undefined,
  });

  const chosenPickupPoint = input.pickup_point?.trim().slice(0, 200) || tour.meeting_point || undefined;
  if (chosenPickupPoint) {
    customer.preferred_pickup_point = chosenPickupPoint;
  }

  let unitPrice = parseFloat(tour.final_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    unitPrice = parseFloat(tour.base_price);
  }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    const advAmt = parseFloat(tour.advance_amount);
    const advPct = parseFloat(tour.advance_payment_percent) || 40;
    if (advAmt > 0 && advPct > 0) {
      unitPrice = Math.round((advAmt / advPct) * 100);
    }
  }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    unitPrice = 1400;
  }
  const rawTotalPrice = unitPrice * effectiveTravelerCount;

  // Validate promo code and calculate discount if provided
  let appliedDiscount = 0;
  let validatedPromo: string | null = null;
  if (input.promo_code && input.promo_code.trim()) {
    const promoRes = validatePromoCode(input.promo_code, tour.id, tour.slug, rawTotalPrice);
    if (!promoRes.valid) {
      throw new Error(promoRes.error || "Invalid promo code for this tour.");
    }
    appliedDiscount = promoRes.discount_amount || 0;
    validatedPromo = promoRes.code || input.promo_code.trim().toUpperCase();
  }

  const totalPrice = Math.max(0, rawTotalPrice - appliedDiscount);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    // A zero total can never be paid through the gateway; refuse instead of creating an unpayable booking.
    throw new Error("This booking total is invalid. Please contact support.");
  }
  const advancePercent = input.payment_plan === "full" ? 100 : (parseFloat(tour.advance_payment_percent) || 40);
  const advanceAmount = Math.round((totalPrice * advancePercent) / 100);

  let specialReqs = userRequests;
  if (validatedPromo && appliedDiscount > 0) {
    const promoTag = `[Promo: ${validatedPromo} (-৳${appliedDiscount.toLocaleString()})]`;
    specialReqs = specialReqs ? `${specialReqs} ${promoTag}` : promoTag;
  }

  // Next reference = highest existing sequence + 1. `bookings.length + 1` produced duplicate
  // references whenever a booking was removed or two requests overlapped.
  const year = new Date().getFullYear();
  let maxSeq = 0;
  for (const existing of db.bookings) {
    const m = /^(?:STL|AT)-\d{4}-(\d+)$/.exec(existing.reference || "");
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const ref = `STL-${year}-${String(maxSeq + 1).padStart(5, "0")}`;
  // Booking ids double as links (/tickets/<id>, /clearance/<id>) so they must be unguessable.
  const bookingId = `book-${Date.now()}-${randomToken(8)}`;

  const isCashBooking = input.payment_method === "cash_on_hand" || input.payment_method === "cash";
  const bookingStatus: DbBooking["status"] = isCashBooking ? "pending_cash_approval" : "pending_payment";
  const cashExpiresAt = isCashBooking ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : undefined;

  const newBooking: DbBooking = {
    id: bookingId,
    reference: ref,
    tour_id: tour.id,
    tour_title: tour.title,
    tour_slug: tour.slug,
    destination_slug: tour.destination_slug,
    departure_id: departure?.id,
    departure_date: departure?.departure_date,
    traveler_count: effectiveTravelerCount,
    selected_seats: selectedSeats,
    pickup_point: chosenPickupPoint,
    unit_price: unitPrice.toFixed(2),
    total_price: totalPrice.toFixed(2),
    final_price: totalPrice.toFixed(2),
    payment_plan: input.payment_plan,
    payment_method: isCashBooking ? "cash_on_hand" : (input.payment_method || "Bkash payment"),
    advance_payment_method: isCashBooking ? "cash_on_hand" : (input.payment_method || "Bkash payment"),
    cash_approval_expires_at: cashExpiresAt,
    advance_required_percent: advancePercent.toString(),
    advance_amount: advanceAmount.toFixed(2),
    amount_paid: "0.00",
    amount_due: totalPrice.toFixed(2),
    due_date: departure?.departure_date || new Date().toISOString().split("T")[0],
    status: bookingStatus,
    promo_code: validatedPromo,
    discount_amount: appliedDiscount.toFixed(2),
    customer_id: customer.id,
    customer_full_name: customerName,
    customer_phone_number: normalizedPhone,
    customer_email: customerEmail,
    special_requests: specialReqs,
    travelers:
      selectedSeats.length > 0
        ? selectedSeats.map((seat, idx) => ({
            id: `trav-${bookingId}-${idx + 1}`,
            full_name: idx === 0 ? customerName : `Traveler ${idx + 1}`,
            seat_number: seat,
            is_lead_traveler: idx === 0,
          }))
        : [
            {
              id: `trav-${bookingId}-1`,
              full_name: customerName,
              is_lead_traveler: true,
            },
          ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // There were `await`s (customer upsert) between the first availability check and this point, so two
  // simultaneous requests could both have passed it. Re-check and insert with NO await in between
  // (JS is single-threaded, so this block is atomic). Also re-acquire the db in case a background
  // sync swapped the in-memory object while we were waiting.
  db = loadDb();
  {
    const takenSeats = getBookedSeatsForDeparture(tour.id, departure?.id, departure?.departure_date);
    const seatConflicts = selectedSeats.filter((seat) => takenSeats.includes(seat));
    if (seatConflicts.length > 0) {
      throw new Error(
        `Seat(s) ${seatConflicts.join(", ")} are already booked by another traveler. Please choose other available seats.`
      );
    }
    if (departure) {
      const capacity = departure.total_seats || Number(tour.total_seats) || 40;
      const occupiedNow = getOccupiedSeatCount(tour.id, departure.id, departure.departure_date);
      if (capacity - occupiedNow < effectiveTravelerCount) {
        throw new Error("Not enough seats remaining for this departure");
      }
    }
  }

  if (db.deletedEntities?.bookings) {
    db.deletedEntities.bookings = db.deletedEntities.bookings.filter((id) => id !== bookingId);
  }
  db.bookings.unshift(newBooking);

  let pendingCashPay: DbPayment | undefined;
  if (isCashBooking) {
    pendingCashPay = {
      id: `pay-${Date.now()}-${randomToken(4)}`,
      booking_id: bookingId,
      amount: input.payment_plan === "full" ? totalPrice.toFixed(2) : advanceAmount.toFixed(2),
      payment_type: input.payment_plan === "full" ? "full" : "advance",
      payment_method: "cash_on_hand",
      status: "pending_cash_approval",
      tran_id: `CASH-${Date.now().toString(36).toUpperCase()}${randomToken(5).toUpperCase()}`,
      created_at: new Date().toISOString(),
    };
    db.payments.unshift(pendingCashPay);

    db.alerts.unshift({
      id: `alt-cash-${Date.now()}`,
      alert_type: "cash_payment_pending",
      severity: "warning",
      message: `New "Pay Cash by Hand" booking ${ref} created for ${tour.title} (${effectiveTravelerCount} traveler(s)). Admin approval required within 10 minutes or it will auto-cancel.`,
      is_acknowledged: false,
      created_at: new Date().toISOString(),
    });
  } else {
    // Auto-alert for admin
    db.alerts.unshift({
      id: `alt-book-${Date.now()}`,
      alert_type: "new_booking",
      severity: "info",
      message: `New booking ${ref} created for ${tour.title} (${effectiveTravelerCount} traveler(s)${selectedSeats.length > 0 ? ` · Seats: ${selectedSeats.join(", ")}` : ""}${chosenPickupPoint ? ` · Pick-up: ${chosenPickupPoint}` : ""}).`,
      is_acknowledged: false,
      created_at: new Date().toISOString(),
    });
  }

  // Log booking activity for customer
  await addCustomerActivity(customer.id, {
    type: "booking_created",
    title: `Booked ${tour.title}`,
    description: `Booking reference ${ref} created for ${effectiveTravelerCount} traveler(s)${selectedSeats.length > 0 ? ` · Seats: ${selectedSeats.join(", ")}` : ""}${chosenPickupPoint ? ` · Pick-up: ${chosenPickupPoint}` : ""}. Total: ৳${totalPrice.toLocaleString()}.${isCashBooking ? " [Pay Cash by Hand - Awaiting 10-Minute Admin Approval]" : ""}`,
    metadata: {
      booking_id: bookingId,
      reference: ref,
      tour_id: tour.id,
      traveler_count: effectiveTravelerCount,
      selected_seats: selectedSeats,
      departure_date: departure?.departure_date,
      pickup_point: chosenPickupPoint,
      payment_method: isCashBooking ? "cash_on_hand" : "Bkash payment",
    },
  });

  await saveDb(db);
  await syncCustomerToSupabase(customer);
  await syncBookingToSupabase(newBooking);
  if (pendingCashPay) {
    await syncPaymentToSupabase(pendingCashPay);
  }
  return { booking: newBooking, customer };
}

export function getBookingById(id: string): DbBooking | null {
  const db = loadDb();
  return db.bookings.find((b) => b.id === id) || null;
}

export async function updateBooking(id: string, update: Partial<DbBooking>): Promise<DbBooking | null> {
  const db = loadDb();
  const index = db.bookings.findIndex((b) => b.id === id);
  if (index === -1) return null;

  db.bookings[index] = {
    ...db.bookings[index],
    ...update,
    updated_at: new Date().toISOString(),
  };
  await saveDb(db);
  await syncBookingToSupabase(db.bookings[index]);
  return db.bookings[index];
}

export async function createPayment(input: {
  booking_id: string;
  amount: string;
  payment_type: "advance" | "final" | "due" | "full";
  payment_method: "Bkash payment" | "sslcommerz" | "host_cash" | "host_pos" | "customer_self_pay" | "cash_on_hand" | "cash" | string;
}): Promise<DbPayment> {
  const amountNum = parseFloat(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const db = loadDb();
  // SSLCommerz limits tran_id to 30 chars: "TRAN-" + base36 time (8) + 10 hex = 23. The random part
  // keeps transaction ids unguessable (they used to be timestamp + 0-999, i.e. enumerable).
  const tranId = `TRAN-${Date.now().toString(36).toUpperCase()}${randomToken(5).toUpperCase()}`;
  const payment: DbPayment = {
    id: `pay-${Date.now()}-${randomToken(4)}`,
    booking_id: input.booking_id,
    amount: amountNum.toFixed(2),
    payment_type: input.payment_type,
    payment_method: input.payment_method,
    status: "pending",
    tran_id: tranId,
    created_at: new Date().toISOString(),
  };

  db.payments.unshift(payment);
  await saveDb(db);
  await syncPaymentToSupabase(payment);
  return payment;
}

export function getPaymentByTranId(tranId: string): DbPayment | null {
  const db = loadDb();
  return db.payments.find((p) => p.tran_id === tranId) || null;
}

export function getPaymentById(id: string): DbPayment | null {
  const db = loadDb();
  return db.payments.find((p) => p.id === id) || null;
}

export function getAllPaymentsAdmin(): DbPayment[] {
  const db = loadDb();
  return db.payments;
}

type ConfirmPaymentResult = { payment: DbPayment; booking: DbBooking; ticket: DbClearanceTicket };

/** Confirmations currently running, keyed by tran_id (browser redirect and IPN usually arrive together). */
const inFlightConfirmations = new Map<string, Promise<ConfirmPaymentResult>>();

/**
 * Marks a payment as paid and credits the booking.
 *
 * Callers MUST have verified the payment first (SSLCommerz validation API for gateway payments,
 * staff authentication for cash/POS). This function itself guarantees:
 *  - idempotency: a payment is credited at most once, however many callbacks arrive;
 *  - no fabricated data: an unknown transaction or booking is an error, never invented;
 *  - the credited amount never exceeds what is actually still owed on the booking.
 */
export function confirmPaymentSuccess(
  tranId: string,
  valId?: string,
  cardType?: string,
  extra?: { bookingId?: string; bookingRef?: string; verifiedAmount?: string }
): Promise<ConfirmPaymentResult> {
  const running = inFlightConfirmations.get(tranId);
  if (running) return running;

  const job = confirmPaymentSuccessInner(tranId, valId, cardType, extra).finally(() => {
    inFlightConfirmations.delete(tranId);
  });
  inFlightConfirmations.set(tranId, job);
  return job;
}

async function resolveBookingForPayment(
  db: DatabaseSchema,
  bookingId: string,
  bookingRef?: string
): Promise<DbBooking | undefined> {
  const local = db.bookings.find((b) => b.id === bookingId);
  if (local) return local;

  // The booking may have been created on another server instance: load the real row from Supabase.
  try {
    const supabase = getSupabaseAdminClient();
    const { data: remoteB } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!remoteB) return undefined;

    const recovered: DbBooking = {
      id: remoteB.id,
      reference: remoteB.reference || bookingRef || `STL-${String(remoteB.id).slice(-6).toUpperCase()}`,
      tour_id: remoteB.tour_id,
      tour_title: remoteB.tour_title,
      tour_slug: remoteB.tour_slug,
      destination_slug: (() => {
        if (remoteB.destination_slug && remoteB.destination_slug !== remoteB.tour_slug) {
          return remoteB.destination_slug;
        }
        const matchedTour = memoryDb?.tours?.find((t) => t.id === remoteB.tour_id || t.slug === remoteB.tour_slug);
        return matchedTour?.destination_slug || remoteB.destination_slug || remoteB.tour_slug || "bangladesh";
      })(),
      departure_date: remoteB.departure_date,
      traveler_count: Number(remoteB.traveler_count || 1),
      selected_seats: Array.isArray(remoteB.selected_seats) ? remoteB.selected_seats : [],
      unit_price: String(remoteB.unit_price || 0),
      total_price: String(remoteB.total_price || 0),
      final_price: String(remoteB.total_price || 0),
      payment_plan: Number(remoteB.due_on_tour_day || 0) > 0 ? "partial" : "full",
      advance_required_percent: "40",
      advance_amount: String(remoteB.advance_amount || 0),
      amount_paid: String(remoteB.amount_paid || 0),
      amount_due: String(remoteB.due_on_tour_day ?? remoteB.total_price ?? 0),
      due_date: remoteB.departure_date || new Date().toISOString().slice(0, 10),
      status: remoteB.status || "pending_payment",
      customer_id: remoteB.customer_id || undefined,
      customer_full_name: remoteB.customer_name || "Customer",
      customer_phone_number: remoteB.customer_phone || "",
      customer_email: remoteB.customer_email || "",
      special_requests: remoteB.special_requests || "",
      travelers: Array.isArray(remoteB.travelers) ? remoteB.travelers : [],
      created_at: remoteB.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.bookings.unshift(recovered);
    return recovered;
  } catch (err) {
    console.error("[Payments] Failed to recover booking from Supabase:", err);
    return undefined;
  }
}

async function confirmPaymentSuccessInner(
  tranId: string,
  valId?: string,
  cardType?: string,
  extra?: { bookingId?: string; bookingRef?: string; verifiedAmount?: string }
): Promise<ConfirmPaymentResult> {
  const db = loadDb();
  let payment = db.payments.find((p) => p.tran_id === tranId);

  if (!payment) {
    // Only a gateway-verified callback (verifiedAmount comes from SSLCommerz's own validation API)
    // may recreate a missing record, e.g. when it was created on another server instance.
    if (extra?.verifiedAmount && extra.bookingId) {
      payment = {
        id: `pay-${Date.now()}-${randomToken(4)}`,
        booking_id: extra.bookingId,
        amount: extra.verifiedAmount,
        payment_type: "advance",
        payment_method: "Bkash payment",
        status: "pending",
        tran_id: tranId,
        created_at: new Date().toISOString(),
      };
      db.payments.unshift(payment);
    } else {
      throw new Error(`Payment transaction ${tranId} not found.`);
    }
  }

  const booking = await resolveBookingForPayment(db, payment.booking_id, extra?.bookingRef);
  if (!booking) {
    console.error(
      `[Payments] PAYMENT RECEIVED BUT BOOKING NOT FOUND: tran_id=${tranId} booking_id=${payment.booking_id} amount=${payment.amount}. Needs manual reconciliation.`
    );
    throw new Error(`Booking ${payment.booking_id} not found for transaction ${tranId}.`);
  }

  // Idempotent: already credited (browser redirect + IPN, retries, double-clicks). Never credit twice.
  if (payment.status === "success") {
    const ticket = db.clearanceTickets.find((t) => t.booking_id === booking.id) ?? getClearanceTicket(booking.id);
    if (!ticket) throw new Error(`Clearance ticket missing for booking ${booking.id}.`);
    return { payment, booking, ticket };
  }

  // Anti-replay: check locally AND in Supabase to prevent cross-instance val_id reuse
  if (valId && db.payments.some((p) => p.val_id === valId && p.tran_id !== tranId && p.status === "success")) {
    throw new Error("This gateway validation id was already used for a different transaction.");
  }
  if (valId) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data: existingValId } = await supabase
        .from("payments")
        .select("id, tran_id")
        .eq("val_id", valId)
        .neq("tran_id", tranId)
        .eq("status", "success")
        .maybeSingle();
      if (existingValId) {
        throw new Error("This gateway validation id was already used for a different transaction (cross-instance check).");
      }
    } catch (err) {
      // If it's our own throw, re-throw it
      if (err instanceof Error && err.message.includes("already used")) throw err;
      // Supabase query failed — log but don't block (local check already passed)
      console.warn("[Payments] Cross-instance val_id check failed:", err);
    }
  }

  // Amount verification: when the payment was recreated from a gateway callback
  // (verifiedAmount), verify it matches what the booking actually expects
  if (extra?.verifiedAmount) {
    const verifiedAmt = parseFloat(extra.verifiedAmount);
    const expectedAdvance = parseFloat(booking.advance_amount);
    const expectedTotal = parseFloat(booking.total_price);
    const prevPaidCheck = parseFloat(booking.amount_paid) || 0;
    const expectedDue = Math.max(0, expectedTotal - prevPaidCheck);
    // The verified amount must match either the advance, the total, or what's remaining due
    const matchesExpected =
      Math.abs(verifiedAmt - expectedAdvance) <= 1 ||
      Math.abs(verifiedAmt - expectedTotal) <= 1 ||
      Math.abs(verifiedAmt - expectedDue) <= 1;
    if (!matchesExpected && verifiedAmt > 0) {
      console.error(
        `[Payments] Amount mismatch: gateway verified ৳${verifiedAmt} but booking ${booking.reference} expects advance ৳${expectedAdvance} / total ৳${expectedTotal} / due ৳${expectedDue}`
      );
      throw new Error(`Payment amount ৳${verifiedAmt} does not match any expected amount for booking ${booking.reference}.`);
    }
  }

  payment.status = "success";
  payment.val_id = valId || `VAL-${Date.now()}`;
  payment.trx_id = valId || payment.val_id;
  payment.card_type = cardType || payment.payment_method;
  payment.paid_at = new Date().toISOString();

  const paymentAmount = parseFloat(payment.amount);
  const totalPrice = parseFloat(booking.total_price);
  const prevPaid = parseFloat(booking.amount_paid) || 0;
  const outstanding = Math.max(0, totalPrice - prevPaid);
  // Never credit more than is owed (e.g. a "full" payment initiated after the advance was already paid).
  const credited = Math.min(paymentAmount, outstanding);
  if (paymentAmount - credited > 0.5) {
    console.warn(
      `[Payments] Overpayment on ${booking.reference}: paid ${paymentAmount}, only ${credited} was outstanding. Manual refund needed.`
    );
    db.alerts.unshift({
      id: `alt-over-${Date.now()}-${randomToken(3)}`,
      alert_type: "overpayment",
      severity: "warning",
      message: `Booking ${booking.reference} received ৳${Math.round(paymentAmount).toLocaleString()} but only ৳${Math.round(credited).toLocaleString()} was outstanding. Please refund the difference.`,
      is_acknowledged: false,
      created_at: new Date().toISOString(),
    });
  }

  const bookingClosed = booking.status === "cancelled" || booking.status === "refunded";
  let ticket: DbClearanceTicket | undefined;

  if (bookingClosed) {
    // Money arrived for a booking that was cancelled/refunded: record it, do NOT resurrect the booking.
    db.alerts.unshift({
      id: `alt-closed-${Date.now()}-${randomToken(3)}`,
      alert_type: "payment_on_closed_booking",
      severity: "critical",
      message: `Payment of ৳${Math.round(paymentAmount).toLocaleString()} received for ${booking.status} booking ${booking.reference}. Needs manual refund.`,
      is_acknowledged: false,
      created_at: new Date().toISOString(),
    });
    ticket = db.clearanceTickets.find((t) => t.booking_id === booking.id) ?? getClearanceTicket(booking.id) ?? undefined;
    await saveDb(db);
    await syncPaymentToSupabase(payment);
    if (!ticket) throw new Error(`Clearance ticket missing for booking ${booking.id}.`);
    return { payment, booking, ticket };
  }

  // A pending booking's seat hold releases after PENDING_HOLD_MS so other
  // customers aren't blocked by someone who never paid. If this payment is
  // arriving after that hold already expired, another booking may have
  // legitimately claimed the same seat(s) in the meantime — the seats are
  // no longer exclusively this booking's to confirm. We still take the
  // payment (money has already moved; declining it now would strand the
  // customer's cash), but flag it instead of silently overlapping two
  // bookings on the same seat.
  if (booking.status === "pending_payment" && Array.isArray(booking.selected_seats) && booking.selected_seats.length > 0) {
    const holdAlreadyExpired = !isSeatHoldingBooking(booking, Date.now());
    if (holdAlreadyExpired) {
      const claimedByOthers = new Set<string>();
      for (const other of bookingsForDeparture(db, booking.tour_id, booking.departure_id, booking.departure_date)) {
        if (other.id === booking.id) continue;
        for (const seat of other.selected_seats || []) claimedByOthers.add(seat.trim().toUpperCase());
      }
      const conflictingSeats = booking.selected_seats
        .map((s) => s.trim().toUpperCase())
        .filter((s) => claimedByOthers.has(s));

      if (conflictingSeats.length > 0) {
        booking.seat_conflict_notice = `Seat(s) ${conflictingSeats.join(", ")} were reassigned to another booking after this booking's hold expired, before this payment arrived. Needs manual reseating.`;
        db.alerts.unshift({
          id: `alt-seatconflict-${Date.now()}-${randomToken(3)}`,
          alert_type: "seat_conflict",
          severity: "critical",
          message: `Booking ${booking.reference} paid for seat(s) ${conflictingSeats.join(", ")}, but those were already reassigned to another booking after this booking's hold lapsed. Manual reseating required.`,
          is_acknowledged: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  const newPaid = prevPaid + credited;
  const remainingDue = Math.max(0, totalPrice - newPaid);

  booking.amount_paid = newPaid.toFixed(2);
  booking.amount_due = remainingDue.toFixed(2);
  booking.status = remainingDue <= 0 ? "confirmed_fully_paid" : "confirmed_advance_paid";
  if (prevPaid > 0 || payment.payment_type === "final") {
    booking.due_payment_method = payment.payment_method || "Bkash payment";
  } else {
    booking.payment_method = payment.payment_method || "Bkash payment";
    booking.advance_payment_method = payment.payment_method || "Bkash payment";
    if (remainingDue <= 0) {
      booking.due_payment_method = payment.payment_method || "Bkash payment";
    }
  }
  const actualTrxId = valId || payment.val_id || payment.tran_id;
  if (actualTrxId) {
    booking.transaction_id = actualTrxId;
    if (prevPaid > 0 || payment.payment_type === "final" || payment.payment_type === "due") {
      booking.due_transaction_id = actualTrxId;
      if (!booking.advance_transaction_id) {
        const priorAdv = db.payments.find((p) => p.booking_id === booking.id && p.id !== payment.id && p.status === "success");
        if (priorAdv) {
          booking.advance_transaction_id = priorAdv.val_id || priorAdv.tran_id;
        }
      }
    } else {
      booking.advance_transaction_id = actualTrxId;
      if (remainingDue <= 0) {
        booking.due_transaction_id = actualTrxId;
      }
    }
  }
  booking.updated_at = new Date().toISOString();

  // Ensure clearance ticket exists
  ticket = db.clearanceTickets.find((t) => t.booking_id === booking.id);
  if (!ticket) {
    const token = generateClearanceToken(booking.id);
    const validDays = 7;
    const depDate = booking.departure_date ? new Date(booking.departure_date) : new Date();
    const expiresAt = new Date(depDate.getTime() + validDays * 24 * 60 * 60 * 1000).toISOString();

    ticket = {
      id: `ticket-${booking.id}`,
      booking_id: booking.id,
      token,
      token_expires_at: expiresAt,
      is_cleared: remainingDue <= 0,
      created_at: new Date().toISOString(),
    };
    db.clearanceTickets.unshift(ticket);
  } else if (remainingDue <= 0) {
    ticket.is_cleared = true;
    ticket.cleared_at = new Date().toISOString();
  }

  const payAlert: DbAlert = {
    id: `alt-pay-${Date.now()}-${randomToken(3)}`,
    alert_type: "payment_confirmed",
    severity: "info",
    message: `Payment of ৳${Math.round(credited).toLocaleString()} received for booking ${booking.reference} (${booking.customer_full_name}).`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  };
  db.alerts.unshift(payAlert);

  // Log payment activity for customer
  const customer = getCustomerByPhone(booking.customer_phone_number);
  if (customer) {
    await addCustomerActivity(customer.id, {
      type: "payment_completed",
      title: remainingDue <= 0 ? "Full Payment Confirmed" : "Advance Payment Received",
      description: `Payment of ৳${Math.round(credited).toLocaleString()} received via ${payment.card_type || payment.payment_method} for booking ${booking.reference}${booking.selected_seats?.length ? ` (Seats: ${booking.selected_seats.join(", ")})` : ""}.`,
      metadata: {
        booking_id: booking.id,
        reference: booking.reference,
        tran_id: tranId,
        amount: payment.amount,
        remaining_due: booking.amount_due,
        selected_seats: booking.selected_seats || [],
      },
    });
  }

  // Server-side payment tracking
  try {
    recordAnalyticsEvent({
      event_name: "payment_success",
      path: `/tours/${booking.tour_slug || booking.tour_id}`,
      title: `Payment Confirmed: ${booking.reference}`,
      metadata: {
        booking_id: booking.id,
        reference: booking.reference,
        tran_id: tranId,
        amount: payment.amount,
        credited_amount: credited,
        payment_method: payment.card_type || payment.payment_method,
      },
    });
  } catch {}

  await saveDb(db);
  await syncPaymentToSupabase(payment);
  await syncBookingToSupabase(booking);
  if (ticket) {
    await syncClearanceTicketToSupabase(ticket);
  }
  await syncAlertToSupabase(payAlert);
  return { payment, booking, ticket };
}

// ---------------------------------------------------------------------------
// Clearance
// ---------------------------------------------------------------------------

export function getClearanceTicket(bookingId: string): DbClearanceTicket | null {
  const db = loadDb();
  let ticket = db.clearanceTickets.find((t) => t.booking_id === bookingId);
  if (!ticket) {
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    const token = generateClearanceToken(booking.id);
    const validDays = 14;
    const depDate = booking.departure_date ? new Date(booking.departure_date) : new Date();
    const expiresAt = new Date(depDate.getTime() + validDays * 24 * 60 * 60 * 1000).toISOString();
    const dueNum = parseFloat(booking.amount_due);

    ticket = {
      id: `ticket-${booking.id}`,
      booking_id: booking.id,
      token,
      token_expires_at: expiresAt,
      is_cleared: dueNum <= 0 && booking.status !== "pending_payment",
      created_at: new Date().toISOString(),
    };
    db.clearanceTickets.unshift(ticket);
    void saveDb(db);
  }
  return ticket;
}

export function getAllClearanceTicketsAdmin(): DbClearanceTicket[] {
  const db = loadDb();
  return db.clearanceTickets || [];
}


export async function clearTicketOnTourDay(
  bookingId: string,
  method: "host_verification" | "host_qr_scan" | "customer_self_pay" | "host_cash",
  staffId?: string
): Promise<{ ticket: DbClearanceTicket; booking: DbBooking }> {
  const db = loadDb();
  const ticket = db.clearanceTickets.find((t) => t.booking_id === bookingId);
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!ticket || !booking) {
    throw new Error("Ticket or booking not found");
  }

  ticket.is_cleared = true;
  ticket.cleared_at = new Date().toISOString();
  ticket.clearance_method = method;
  if (staffId) ticket.cleared_by_staff_id = staffId;

  booking.amount_paid = booking.total_price;
  booking.amount_due = "0.00";
  booking.status = "cleared_on_tour_day";

  // Log clearance activity for customer
  const customer = getCustomerByPhone(booking.customer_phone_number);
  if (customer) {
    await addCustomerActivity(customer.id, {
      type: "qr_cleared",
      title: "Tour Clearance Completed",
      description: `Booking pass verified and balance settled on tour day via ${method.replace(/_/g, " ")}.`,
      metadata: { booking_id: bookingId, clearance_method: method },
    });
  }

  await saveDb(db);
  await syncBookingToSupabase(booking);
  return { ticket, booking };
}

export async function completeDuePayment(
  bookingId: string,
  method: "Bkash payment" | "sslcommerz" | "host_cash" | "host_pos" | "customer_self_pay" | "cash_on_hand" | "cash" | "bkash" | "nagad" | "bank_transfer" | string = "cash_on_hand",
  amount?: string,
  staffUsername?: string
): Promise<{ payment: DbPayment; booking: DbBooking; ticket: DbClearanceTicket }> {
  const db = loadDb();
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const isCash = method === "host_cash" || method === "cash_on_hand" || method === "cash";
  const dueToPay = amount || booking.amount_due;
  const numDue = parseFloat(dueToPay);

  booking.due_payment_method = isCash ? "cash_on_hand" : method;
  if (isCash) {
    booking.due_cash_approved_by = staffUsername || "staff";
    booking.due_cash_approved_at = new Date().toISOString();
  }

  if (numDue <= 0) {
    let ticket = db.clearanceTickets.find((t) => t.booking_id === bookingId);
    if (!ticket) ticket = getClearanceTicket(bookingId)!;
    if (ticket) {
      ticket.is_cleared = true;
      ticket.cleared_at = ticket.cleared_at || new Date().toISOString();
      ticket.clearance_method = isCash ? "host_cash" : "customer_self_pay";
    }
    booking.status = "confirmed_fully_paid";
    booking.updated_at = new Date().toISOString();
    await saveDb(db);
    await syncBookingToSupabase(booking);
    if (ticket) await syncClearanceTicketToSupabase(ticket);

    const existingPayment = db.payments.find((p) => p.booking_id === bookingId && p.status === "success") || {
      id: `pay-${Date.now()}`,
      booking_id: booking.id,
      amount: booking.total_price,
      payment_type: "final" as const,
      payment_method: (isCash ? "cash_on_hand" : method) as any,
      status: "success" as const,
      tran_id: `TRAN-ALREADY-PAID-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    return {
      payment: existingPayment,
      booking,
      ticket: ticket || getClearanceTicket(bookingId)!,
    };
  }

  // Create payment record
  const payment = await createPayment({
    booking_id: booking.id,
    amount: dueToPay,
    payment_type: "final",
    payment_method: (isCash ? "cash_on_hand" : method === "host_pos" ? "host_pos" : "Bkash payment"),
  });

  // bKash / gateway payments MUST go through the actual gateway flow (redirect → callback → verify).
  // Only staff-verified methods (cash, POS, mobile wallet, bank) can be confirmed directly here.
  if (method === "Bkash payment" || method === "sslcommerz") {
    // Return the pending payment — the caller must initiate the gateway redirect flow
    return {
      payment,
      booking,
      ticket: getClearanceTicket(booking.id)!,
    };
  }

  // For staff-verified methods, confirm immediately
  const valId = isCash ? `DUE-CASH-SETTLE-${Date.now()}` : `DUE-SETTLE-${Date.now()}`;
  const cardType = isCash ? "CASH_ON_HAND" : method.toUpperCase();
  const result = await confirmPaymentSuccess(payment.tran_id, valId, cardType, { bookingId: booking.id });
  return result;
}

export async function requestDueCashPayment(
  bookingId: string
): Promise<{ booking: DbBooking; payment: DbPayment; ticket: DbClearanceTicket }> {
  const db = loadDb();
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  const numDue = parseFloat(booking.amount_due);
  if (numDue <= 0) {
    throw new Error("No balance due for this booking.");
  }

  booking.due_payment_method = "cash_on_hand";
  booking.updated_at = new Date().toISOString();

  let payment = db.payments.find(
    (p) =>
      p.booking_id === booking.id &&
      (p.payment_type === "final" || p.payment_type === "due") &&
      (p.status === "pending" || p.status === "pending_cash_approval")
  );

  if (payment) {
    payment.payment_method = "cash_on_hand";
    payment.status = "pending_cash_approval";
    payment.amount = booking.amount_due;
  } else {
    payment = {
      id: `pay-due-${Date.now()}-${randomToken(4)}`,
      booking_id: booking.id,
      amount: booking.amount_due,
      payment_type: "final",
      payment_method: "cash_on_hand",
      status: "pending_cash_approval",
      tran_id: `DUE-CASH-${Date.now().toString(36).toUpperCase()}${randomToken(5).toUpperCase()}`,
      created_at: new Date().toISOString(),
    };
    db.payments.unshift(payment);
  }

  let ticket = db.clearanceTickets.find((t) => t.booking_id === booking.id);
  if (!ticket) {
    ticket = getClearanceTicket(booking.id)!;
  }

  const alert: DbAlert = {
    id: `alt-due-cash-${Date.now()}-${randomToken(3)}`,
    alert_type: "due_cash_pending",
    severity: "warning",
    message: `Due balance of ৳${Math.round(numDue).toLocaleString()} for booking ${booking.reference} (${booking.customer_full_name}) requested to be paid by Hand Cash. Host collection required on tour day.`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  };
  db.alerts.unshift(alert);
  await syncAlertToSupabase(alert);

  const customer = getCustomerByPhone(booking.customer_phone_number);
  if (customer) {
    await addCustomerActivity(customer.id, {
      type: "payment_pending",
      title: "Due Payment by Hand Cash Requested",
      description: `Requested to pay remaining balance of ৳${Math.round(numDue).toLocaleString()} by Hand Cash to Tour Host on tour day.`,
      metadata: {
        booking_id: booking.id,
        reference: booking.reference,
        amount: booking.amount_due,
        payment_method: "cash_on_hand",
      },
    });
  }

  await saveDb(db);
  await syncBookingToSupabase(booking);
  await syncPaymentToSupabase(payment);

  return { booking, payment, ticket: ticket || getClearanceTicket(booking.id)! };
}

export async function approveCashPayment(
  bookingId: string,
  adminUsername: string,
  receivedType: "advance" | "full" | "due" = "advance"
): Promise<{ booking: DbBooking; payment: DbPayment; ticket: DbClearanceTicket }> {
  const db = loadDb();
  autoCancelExpiredCashBookings(db);

  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  if (booking.status === "cancelled") {
    throw new Error("Cannot approve payment for a cancelled booking. The approval window may have expired.");
  }

  // Strict 10-minute approval window enforcement ONLY for initial advance booking approvals
  if (receivedType !== "due" && booking.status === "pending_cash_approval" && booking.cash_approval_expires_at) {
    const exp = new Date(booking.cash_approval_expires_at).getTime();
    if (!isNaN(exp) && Date.now() > exp) {
      booking.status = "cancelled";
      booking.updated_at = new Date().toISOString();
      const cancelNote = "[Auto-cancelled: Physical cash was not approved within the 10-minute security window]";
      booking.special_requests = booking.special_requests ? `${booking.special_requests} ${cancelNote}` : cancelNote;
      await saveDb(db);
      await syncBookingToSupabase(booking);
      throw new Error("The 10-minute cash approval window has expired. This booking has been cancelled.");
    }
  }

  const totalPrice = parseFloat(booking.total_price);
  const advanceAmount = parseFloat(booking.advance_amount);
  const currentPaid = parseFloat(booking.amount_paid) || 0;

  let paymentAmount: number;
  let paymentType: "advance" | "full" | "final";

  if (receivedType === "due") {
    paymentAmount = Math.max(0, parseFloat(booking.amount_due) || (totalPrice - currentPaid));
    paymentType = "final";
    booking.due_payment_method = "cash_on_hand";
    booking.due_cash_approved_by = adminUsername;
    booking.due_cash_approved_at = new Date().toISOString();
  } else if (receivedType === "full") {
    paymentAmount = Math.max(0, totalPrice - currentPaid);
    paymentType = currentPaid > 0 ? "final" : "full";
    booking.advance_payment_method = "cash_on_hand";
    booking.due_payment_method = "cash_on_hand";
    booking.cash_approved_by = adminUsername;
    booking.cash_approved_at = new Date().toISOString();
    booking.due_cash_approved_by = adminUsername;
    booking.due_cash_approved_at = new Date().toISOString();
  } else {
    // Advance payment
    paymentAmount = Math.max(0, advanceAmount - currentPaid);
    paymentType = "advance";
    booking.advance_payment_method = "cash_on_hand";
    booking.cash_approved_by = adminUsername;
    booking.cash_approved_at = new Date().toISOString();
  }

  if (paymentAmount <= 0) {
    paymentAmount = Math.max(0, totalPrice - currentPaid);
  }

  const newPaid = currentPaid + paymentAmount;
  const remainingDue = Math.max(0, totalPrice - newPaid);

  booking.amount_paid = newPaid.toFixed(2);
  booking.amount_due = remainingDue.toFixed(2);
  booking.status = remainingDue <= 0 ? "confirmed_fully_paid" : "confirmed_advance_paid";
  booking.updated_at = new Date().toISOString();

  // Find or create payment record
  let payment = db.payments.find(
    (p) =>
      p.booking_id === booking.id &&
      (receivedType === "due" ? (p.payment_type === "final" || p.payment_type === "due") : true) &&
      (p.status === "pending_cash_approval" || p.status === "pending")
  );

  if (payment) {
    payment.status = "success";
    payment.amount = paymentAmount.toFixed(2);
    payment.payment_type = paymentType;
    payment.payment_method = "cash_on_hand";
    payment.paid_at = new Date().toISOString();
    payment.card_type = "CASH_BY_HAND";
    payment.val_id = `CASH-APPRV-${Date.now()}`;
    payment.trx_id = payment.val_id;
  } else {
    const cashValId = `CASH-APPRV-${Date.now()}`;
    payment = {
      id: `pay-${Date.now()}-${randomToken(4)}`,
      booking_id: booking.id,
      amount: paymentAmount.toFixed(2),
      payment_type: paymentType,
      payment_method: "cash_on_hand",
      status: "success",
      tran_id: `CASH-${Date.now().toString(36).toUpperCase()}${randomToken(5).toUpperCase()}`,
      val_id: cashValId,
      trx_id: cashValId,
      card_type: "CASH_BY_HAND",
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    db.payments.unshift(payment);
  }

  const cashTrx = payment.val_id || payment.tran_id;
  if (cashTrx) {
    booking.transaction_id = cashTrx;
    if (receivedType === "due") {
      booking.due_transaction_id = cashTrx;
    } else {
      booking.advance_transaction_id = cashTrx;
      if (remainingDue <= 0) {
        booking.due_transaction_id = cashTrx;
      }
    }
  }

  // Ensure clearance ticket exists and update clearance status if fully paid
  let ticket = db.clearanceTickets.find((t) => t.booking_id === booking.id);
  if (!ticket) {
    ticket = getClearanceTicket(booking.id)!;
  }
  if (ticket && remainingDue <= 0) {
    ticket.is_cleared = true;
    ticket.cleared_at = new Date().toISOString();
    ticket.clearance_method = "host_cash";
  }

  // Record admin alert
  const cashAlert: DbAlert = {
    id: `alt-cash-apprv-${Date.now()}-${randomToken(3)}`,
    alert_type: "cash_payment_approved",
    severity: "info",
    message: `Physical cash payment (${receivedType.toUpperCase()}) of ৳${Math.round(paymentAmount).toLocaleString()} for booking ${booking.reference} was approved by ${adminUsername}.`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  };
  db.alerts.unshift(cashAlert);
  await syncAlertToSupabase(cashAlert);

  // Customer activity
  const customer = getCustomerByPhone(booking.customer_phone_number);
  if (customer) {
    await addCustomerActivity(customer.id, {
      type: "payment_completed",
      title: remainingDue <= 0 ? "Cash Payment Approved (Full/Due)" : "Cash Payment Approved (Advance)",
      description: `Physical cash payment of ৳${Math.round(paymentAmount).toLocaleString()} approved by admin (${adminUsername}) for booking ${booking.reference}.`,
      metadata: {
        booking_id: booking.id,
        reference: booking.reference,
        amount: payment.amount,
        remaining_due: booking.amount_due,
        payment_method: "cash_on_hand",
        payment_type: paymentType,
        approved_by: adminUsername,
      },
    });
  }

  await saveDb(db);
  await syncPaymentToSupabase(payment);
  await syncBookingToSupabase(booking);
  if (ticket) await syncClearanceTicketToSupabase(ticket);

  return { booking, payment, ticket: ticket || getClearanceTicket(booking.id)! };
}

export async function rejectCashPayment(
  bookingId: string,
  adminUsername: string,
  reason?: string,
  rejectType?: "advance" | "due"
): Promise<DbBooking> {
  const db = loadDb();
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  // If this booking is already confirmed with advance paid, rejecting due cash only cancels the due cash request
  if (booking.status === "confirmed_advance_paid" || rejectType === "due") {
    booking.due_payment_method = undefined;
    booking.updated_at = new Date().toISOString();
    const rejectNote = `[Due cash payment rejected by ${adminUsername}${reason ? `: ${reason}` : ""}]`;
    booking.special_requests = booking.special_requests ? `${booking.special_requests} ${rejectNote}` : rejectNote;

    const pendingDuePay = db.payments.find(
      (p) =>
        p.booking_id === booking.id &&
        (p.payment_type === "final" || p.payment_type === "due") &&
        (p.status === "pending" || p.status === "pending_cash_approval")
    );
    if (pendingDuePay) {
      pendingDuePay.status = "cancelled";
      await syncPaymentToSupabase(pendingDuePay);
    }

    db.alerts.unshift({
      id: `alt-due-cash-rej-${Date.now()}`,
      alert_type: "due_cash_payment_rejected",
      severity: "warning",
      message: `Due cash payment for booking ${booking.reference} was rejected by ${adminUsername}.`,
      is_acknowledged: false,
      created_at: new Date().toISOString(),
    });

    await saveDb(db);
    await syncBookingToSupabase(booking);
    return booking;
  }

  if (booking.status === "pending_cash_approval" || parseFloat(booking.amount_paid || "0") === 0) {
    await deleteIncompleteBooking(bookingId, `Cash reservation rejected by ${adminUsername}${reason ? `: ${reason}` : ""}`);
    return booking;
  }

  booking.status = "cancelled";
  booking.updated_at = new Date().toISOString();
  const rejectNote = `[Cash payment rejected by ${adminUsername}${reason ? `: ${reason}` : ""}]`;
  booking.special_requests = booking.special_requests ? `${booking.special_requests} ${rejectNote}` : rejectNote;

  const pendingPay = db.payments.find(
    (p) => p.booking_id === booking.id && (p.status === "pending" || p.status === "pending_cash_approval")
  );
  if (pendingPay) {
    pendingPay.status = "cancelled";
    await syncPaymentToSupabase(pendingPay);
  }

  db.alerts.unshift({
    id: `alt-cash-rej-${Date.now()}`,
    alert_type: "cash_payment_rejected",
    severity: "warning",
    message: `Physical cash reservation for booking ${booking.reference} was rejected by ${adminUsername}. Seats released.`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  });

  await saveDb(db);
  await syncBookingToSupabase(booking);
  return booking;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export function getAlerts(isAcknowledged?: boolean): DbAlert[] {
  const db = loadDb();
  if (typeof isAcknowledged === "boolean") {
    return db.alerts.filter((a) => a.is_acknowledged === isAcknowledged);
  }
  return db.alerts;
}

export async function acknowledgeAlert(id: string): Promise<boolean> {
  const db = loadDb();
  const alert = db.alerts.find((a) => a.id === id);
  if (!alert) return false;
  alert.is_acknowledged = true;
  await saveDb(db);
  return true;
}

export async function clearAllAlertsAdmin(): Promise<number> {
  const db = loadDb();
  const unacknowledged = db.alerts.filter((a) => !a.is_acknowledged);
  for (const a of unacknowledged) {
    a.is_acknowledged = true;
  }
  await saveDb(db);
  return unacknowledged.length;
}

// ---------------------------------------------------------------------------
// Finance Overview
// ---------------------------------------------------------------------------

export function getFinanceOverview() {
  const db = loadDb();

  const totalRevenue = db.bookings
    .filter((b) => b.status !== "cancelled" && b.status !== "refunded")
    .reduce((sum, b) => sum + parseFloat(b.amount_paid), 0);

  const totalDirectCost = db.expenses
    .filter((e) => e.category === "hotel" || e.category === "transport" || e.category === "guide")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const totalOperationalExpense = db.expenses
    .filter((e) => e.category !== "hotel" && e.category !== "transport" && e.category !== "guide")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const grossProfit = totalRevenue - totalDirectCost;
  const netProfit = grossProfit - totalOperationalExpense;

  const pendingAdvances = db.bookings
    .filter((b) => b.status === "pending_payment")
    .reduce((sum, b) => sum + parseFloat(b.advance_amount), 0);

  const dueOnTourDay = db.bookings
    .filter((b) => b.status === "confirmed_advance_paid")
    .reduce((sum, b) => sum + parseFloat(b.amount_due), 0);

  const supplierPayables = db.suppliers
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + parseFloat(s.outstanding_balance), 0);

  return {
    total_revenue: totalRevenue.toFixed(2),
    total_direct_cost: totalDirectCost.toFixed(2),
    total_operational_expense: totalOperationalExpense.toFixed(2),
    gross_profit: grossProfit.toFixed(2),
    net_profit: netProfit.toFixed(2),
    bookings_count: db.bookings.length,
    active_tours_count: db.tours.filter((t) => t.status === "published").length,
    pending_advances: pendingAdvances.toFixed(2),
    due_on_tour_day: dueOnTourDay.toFixed(2),
    supplier_payables: supplierPayables.toFixed(2),
  };
}

// ---------------------------------------------------------------------------
// Expenses Management
// ---------------------------------------------------------------------------

export function getAllExpensesAdmin(): DbExpense[] {
  const db = loadDb();
  return db.expenses;
}

export function getExpenseById(id: string): DbExpense | null {
  const db = loadDb();
  return db.expenses.find((e) => e.id === id) || null;
}

export async function saveExpense(expenseData: Partial<DbExpense>): Promise<DbExpense> {
  const db = loadDb();
  const id = expenseData.id || `exp-${Date.now()}-${randomToken(3)}`;
  const index = db.expenses.findIndex((e) => e.id === id);

  const now = new Date().toISOString();
  const expense: DbExpense = {
    id,
    category: expenseData.category || "other",
    amount: String(Number(expenseData.amount || 0).toFixed(2)),
    date: expenseData.date || now.slice(0, 10),
    description: expenseData.description || "",
    created_at: index !== -1 ? db.expenses[index].created_at || now : now,
    updated_at: now,
  };

  if (index !== -1) {
    db.expenses[index] = expense;
  } else {
    db.expenses.unshift(expense);
  }

  await saveDb(db, true);
  return expense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.expenses.findIndex((e) => e.id === id);
  if (index === -1) return false;
  db.expenses.splice(index, 1);
  await saveDb(db, true);
  return true;
}

// ---------------------------------------------------------------------------
// Suppliers Management
// ---------------------------------------------------------------------------

export function getAllSuppliersAdmin(): DbSupplier[] {
  const db = loadDb();
  return db.suppliers;
}

export function getSupplierById(id: string): DbSupplier | null {
  const db = loadDb();
  return db.suppliers.find((s) => s.id === id) || null;
}

export async function saveSupplier(supplierData: Partial<DbSupplier>): Promise<DbSupplier> {
  const db = loadDb();
  const id = supplierData.id || `sup-${Date.now()}-${randomToken(3)}`;
  const index = db.suppliers.findIndex((s) => s.id === id);

  const now = new Date().toISOString();
  const supplier: DbSupplier = {
    id,
    name: supplierData.name || "Untitled Supplier",
    category: supplierData.category || "other",
    contact_person: supplierData.contact_person || undefined,
    phone: supplierData.phone || undefined,
    email: supplierData.email || undefined,
    outstanding_balance: String(Number(supplierData.outstanding_balance || 0).toFixed(2)),
    is_active: supplierData.is_active !== false,
    notes: supplierData.notes || undefined,
    created_at: index !== -1 ? db.suppliers[index].created_at || now : now,
    updated_at: now,
  };

  if (index !== -1) {
    db.suppliers[index] = supplier;
  } else {
    db.suppliers.unshift(supplier);
  }

  await saveDb(db, true);
  return supplier;
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.suppliers.findIndex((s) => s.id === id);
  if (index === -1) return false;
  db.suppliers.splice(index, 1);
  await saveDb(db, true);
  return true;
}

// ---------------------------------------------------------------------------
// Inquiries (Contact)
// ---------------------------------------------------------------------------

export async function createInquiry(input: {
  name: string;
  email: string;
  phone: string;
  destination: string;
  dates: string;
  trip_type: string;
  travelers: number;
  message: string;
}): Promise<DbContactInquiry> {
  const db = loadDb();
  const inquiry: DbContactInquiry = {
    id: `inq-${Date.now()}`,
    ...input,
    status: "new",
    created_at: new Date().toISOString(),
  };
  db.contactInquiries.unshift(inquiry);

  const alert: DbAlert = {
    id: `alt-inq-${Date.now()}`,
    alert_type: "new_inquiry",
    severity: "info",
    message: `Trip inquiry from ${input.name} for ${input.destination || "custom destination"}.`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  };
  db.alerts.unshift(alert);

  await saveDb(db);
  await syncContactInquiryToSupabase(inquiry);
  await syncAlertToSupabase(alert);
  return inquiry;
}

// ---------------------------------------------------------------------------
// Admin Management (Tours, Destinations, CMS, Blogs, Offers, Reviews)
// ---------------------------------------------------------------------------

export function getAllToursAdmin(): DbTour[] {
  const db = loadDb();
  return db.tours;
}

export async function saveTour(tourData: Partial<DbTour>): Promise<DbTour> {
  const db = loadDb();
  const id = tourData.id || `tour-${Date.now()}`;
  const index = db.tours.findIndex((t) => t.id === id);
  const existingTour = index !== -1 ? db.tours[index] : null;

  const basePriceNum = parseFloat(tourData.base_price || "0");
  const discountValNum = parseFloat(tourData.discount_value || "0");
  const finalPriceNum = Math.max(0, basePriceNum - discountValNum);
  const advancePercent = tourData.advance_payment_percent || "40";
  const advanceAmountNum = Math.round((finalPriceNum * parseFloat(advancePercent)) / 100);

  const totalSeatsNum = Math.max(1, Number(tourData.total_seats) || (existingTour ? existingTour.total_seats : 40));

  let resolvedDepartures: DbDeparture[];
  if (Array.isArray(tourData.departures)) {
    resolvedDepartures = tourData.departures.map((d, dIdx) => {
      const depTotalSeats = Math.max(1, Number(d.total_seats) || totalSeatsNum);
      const booked = d.id ? getBookedSeatsForDeparture(id, d.id, d.departure_date) : (Array.isArray(d.booked_seats) ? d.booked_seats : []);
      const occupied = d.id ? getOccupiedSeatCount(id, d.id, d.departure_date) : booked.length;
      return {
        id: d.id || `dep-${d.departure_date || Date.now()}-${dIdx + 1}`,
        departure_date: d.departure_date,
        total_seats: depTotalSeats,
        seats_remaining: Math.max(0, depTotalSeats - Math.max(occupied, booked.length)),
        booked_seats: booked,
        is_active: d.is_active !== false,
      };
    });
  } else if (existingTour && Array.isArray(existingTour.departures) && existingTour.departures.length > 0) {
    resolvedDepartures = existingTour.departures.map((d) => {
      const depTotalSeats = Math.max(1, Number(d.total_seats) || totalSeatsNum);
      const booked = getBookedSeatsForDeparture(id, d.id, d.departure_date);
      const occupied = getOccupiedSeatCount(id, d.id, d.departure_date);
      return {
        ...d,
        total_seats: depTotalSeats,
        seats_remaining: Math.max(0, depTotalSeats - Math.max(occupied, booked.length)),
        booked_seats: booked,
        is_active: d.is_active !== false,
      };
    });
  } else {
    resolvedDepartures = generateInitialDepartures(totalSeatsNum);
  }

  const destInput = tourData.destination_slug || tourData.destination_id || existingTour?.destination_slug || "coxs-bazar";
  const matchedDest = db.destinations.find((d) => d.slug === destInput || d.id === destInput);

  const defaultTour: DbTour = {
    id,
    title: tourData.title || "Untitled Tour",
    slug: tourData.slug || `tour-${Date.now()}`,
    destination_id: matchedDest?.id || tourData.destination_id || existingTour?.destination_id,
    destination_slug: matchedDest?.slug || destInput,
    destination_name: matchedDest?.name || tourData.destination_name || existingTour?.destination_name || "Cox's Bazar",
    category: tourData.category || "group_tour",
    short_description: tourData.short_description || "",
    full_description: tourData.full_description || "",
    hero_image: tourData.hero_image ? normalizeImageUrl(tourData.hero_image) : null,
    duration_days: tourData.duration_days || 3,
    duration_nights: tourData.duration_nights || 2,
    base_price: basePriceNum.toFixed(2),
    discount_type: tourData.discount_type || "flat",
    discount_value: discountValNum.toFixed(2),
    final_price: finalPriceNum.toFixed(2),
    allow_partial_payment: tourData.allow_partial_payment !== false,
    advance_payment_percent: advancePercent,
    advance_amount: advanceAmountNum.toFixed(2),
    inclusions: tourData.inclusions || [],
    exclusions: tourData.exclusions || [],
    accommodation_notes: tourData.accommodation_notes !== undefined && tourData.accommodation_notes !== ""
      ? tourData.accommodation_notes
      : (existingTour?.accommodation_notes || "Standard hotel / resort"),
    transportation_notes: tourData.transportation_notes !== undefined && tourData.transportation_notes !== ""
      ? tourData.transportation_notes
      : (existingTour?.transportation_notes || "AC Bus / Private Jeep"),
    meals_notes: tourData.meals_notes !== undefined && tourData.meals_notes !== ""
      ? tourData.meals_notes
      : (existingTour?.meals_notes || "Breakfast included"),
    meeting_point: tourData.meeting_point || "Dhaka Sayedabad / Fakirapool",
    pickup_points: Array.isArray(tourData.pickup_points)
      ? tourData.pickup_points
      : typeof (tourData as any).pickup_points === "string"
      ? String((tourData as any).pickup_points)
          .split("\n")
          .flatMap((s) => s.split(","))
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    departure_schedule: tourData.departure_schedule || "Every Friday",
    total_seats: totalSeatsNum,
    departures: resolvedDepartures,
    itinerary: tourData.itinerary || [],
    gallery: Array.isArray(tourData.gallery)
      ? tourData.gallery.map((g: any, idx: number) => ({
          id: String(g.id || `g-${Date.now()}-${idx}`),
          image: normalizeImageUrl(g.image || g.imageUrl || ""),
          caption: String(g.caption || g.title || ""),
          title: String(g.title || g.caption || ""),
          location: String(g.location || ""),
          price: g.price !== undefined && g.price !== null ? String(g.price) : "",
          badge: String(g.badge || ""),
          watermarkText: String(g.watermarkText || g.watermark_text || ""),
          slot: String(g.slot || ""),
        }))
      : index !== -1 && db.tours[index]?.gallery
      ? db.tours[index].gallery
      : [],
    faqs: tourData.faqs || [],
    places_to_visit: Array.isArray(tourData.places_to_visit)
      ? tourData.places_to_visit
      : typeof (tourData as any).places_to_visit === "string"
      ? String((tourData as any).places_to_visit)
          .split("\n")
          .flatMap((s) => s.split(","))
          .map((s) => s.trim())
          .filter(Boolean)
      : (existingTour?.places_to_visit || []),
    is_featured: Boolean(tourData.is_featured),
    status: tourData.status || "published",
  };

  // Un-tombstone if re-created or edited
  if (db.deletedEntities?.tours) {
    db.deletedEntities.tours = db.deletedEntities.tours.filter(
      (delId) => delId !== defaultTour.id && delId !== defaultTour.slug
    );
  }

  if (index !== -1) {
    db.tours[index] = { ...db.tours[index], ...defaultTour };
  } else {
    db.tours.unshift(defaultTour);
  }

  await saveDb(db);
  await syncTourToSupabase(defaultTour);
  return defaultTour;
}

export async function deleteTour(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.tours.findIndex((t) => t.id === id || t.slug === id);
  if (index === -1) return false;
  const [removed] = db.tours.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
    };
  }
  if (!db.deletedEntities.tours) db.deletedEntities.tours = [];
  if (removed.id && !db.deletedEntities.tours.includes(removed.id)) {
    db.deletedEntities.tours.push(removed.id);
  }
  if (removed.slug && !db.deletedEntities.tours.includes(removed.slug)) {
    db.deletedEntities.tours.push(removed.slug);
  }

  await saveDb(db);
  await deleteTourFromSupabase(removed.id, removed.slug);
  return true;
}

export function getTourCategories(): DbTourCategory[] {
  const db = loadDb();
  if (!db.tourCategories || db.tourCategories.length === 0) {
    db.tourCategories = [...DEFAULT_TOUR_CATEGORIES];
    void saveDb(db);
  }
  return [...db.tourCategories].sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
}

export function getTourCategoryById(id: string): DbTourCategory | null {
  const categories = getTourCategories();
  return categories.find((c) => c.id === id || c.slug === id) || null;
}

export async function saveTourCategory(categoryData: Partial<DbTourCategory>): Promise<DbTourCategory> {
  const db = loadDb();
  if (!db.tourCategories || db.tourCategories.length === 0) {
    db.tourCategories = [...DEFAULT_TOUR_CATEGORIES];
  }

  const name = (categoryData.name || "").trim();
  if (!name) {
    throw new Error("Category name is required.");
  }

  const rawSlug = categoryData.slug
    ? categoryData.slug.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "_")
    : name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const slug = rawSlug || `cat_${Date.now()}`;
  const id = categoryData.id || `cat-${slug.replace(/_/g, "-")}-${Date.now().toString().slice(-4)}`;

  const index = db.tourCategories.findIndex((c) => c.id === id || c.slug === slug);
  const now = new Date().toISOString();

  const categoryToSave: DbTourCategory = {
    id,
    name,
    slug,
    description: (categoryData.description || "").trim(),
    badge: (categoryData.badge || "").trim(),
    icon: (categoryData.icon || "🏷️").trim(),
    is_active: categoryData.is_active !== false,
    display_order: Number(categoryData.display_order || (index !== -1 ? db.tourCategories[index].display_order : db.tourCategories.length + 1)),
    created_at: index !== -1 ? db.tourCategories[index].created_at || now : now,
    updated_at: now,
  };

  // Un-tombstone if re-created
  if (db.deletedEntities?.tourCategories) {
    db.deletedEntities.tourCategories = db.deletedEntities.tourCategories.filter(
      (delId) => delId !== categoryToSave.id && delId !== categoryToSave.slug
    );
  }

  if (index !== -1) {
    db.tourCategories[index] = categoryToSave;
  } else {
    db.tourCategories.push(categoryToSave);
  }

  // Also sync to homepageBlocks with block-tour-categories
  const blockIdx = db.homepageBlocks.findIndex((b) => b.id === "block-tour-categories");
  const blockPayload: DbHomepageBlock = {
    id: "block-tour-categories",
    block_type: "service_list",
    display_order: 99,
    content: { categories: db.tourCategories, updated_at: now },
  };
  if (blockIdx !== -1) {
    db.homepageBlocks[blockIdx] = blockPayload;
  } else {
    db.homepageBlocks.push(blockPayload);
  }

  await saveDb(db);
  await syncTourCategoriesToSupabase(db.tourCategories);

  return categoryToSave;
}

export async function deleteTourCategory(id: string): Promise<boolean> {
  const db = loadDb();
  if (!db.tourCategories) return false;

  const cat = db.tourCategories.find((c) => c.id === id || c.slug === id);
  if (!cat) return false;

  // Check if tours are using this category
  const tourUsingCat = db.tours.some((t) => t.category === cat.slug || t.category === cat.name);
  if (tourUsingCat) {
    throw new Error(`Cannot delete category "${cat.name}" because it is currently assigned to one or more tours. Please reassign the tours first.`);
  }

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
    };
  }
  if (!db.deletedEntities.tourCategories) db.deletedEntities.tourCategories = [];
  if (cat.id && !db.deletedEntities.tourCategories.includes(cat.id)) db.deletedEntities.tourCategories.push(cat.id);
  if (cat.slug && !db.deletedEntities.tourCategories.includes(cat.slug)) db.deletedEntities.tourCategories.push(cat.slug);

  db.tourCategories = db.tourCategories.filter((c) => c.id !== cat.id && c.slug !== cat.slug);

  // Also sync to homepageBlocks
  const blockIdx = db.homepageBlocks.findIndex((b) => b.id === "block-tour-categories");
  if (blockIdx !== -1) {
    db.homepageBlocks[blockIdx].content = { categories: db.tourCategories, updated_at: new Date().toISOString() };
  }

  await saveDb(db);
  await syncTourCategoriesToSupabase(db.tourCategories);

  return true;
}

export function getAllDestinationsAdmin(): DbDestination[] {
  const db = loadDb();
  return db.destinations;
}

export async function saveDestination(destData: Partial<DbDestination>): Promise<DbDestination> {
  const db = loadDb();
  const id = destData.id || `dest-${Date.now()}`;
  const index = db.destinations.findIndex(
    (d) => (destData.id && d.id === destData.id) || (destData.slug && d.slug === destData.slug)
  );
  const existing = index !== -1 ? db.destinations[index] : null;

  const resolvedId = existing?.id || id;
  const resolvedSlug = destData.slug?.trim() || existing?.slug || `destination-${Date.now()}`;
  const resolvedName = destData.name?.trim() || existing?.name || "New Destination";

  const targetDest: DbDestination = {
    id: resolvedId,
    name: resolvedName,
    slug: resolvedSlug,
    division: destData.division || existing?.division || "Chattogram",
    tagline: destData.tagline !== undefined ? destData.tagline : (existing?.tagline || ""),
    description: destData.description !== undefined ? destData.description : (existing?.description || ""),
    best_time_to_visit: destData.best_time_to_visit || existing?.best_time_to_visit || "October to March",
    weather_notes: destData.weather_notes || existing?.weather_notes || "Pleasant and breezy",
    popular_attractions:
      destData.popular_attractions !== undefined
        ? destData.popular_attractions
        : (existing?.popular_attractions || []),
    recommended_accommodation:
      destData.recommended_accommodation || existing?.recommended_accommodation || "Local boutique resorts",
    travel_tips: destData.travel_tips || existing?.travel_tips || "",
    permits_required: destData.permits_required || existing?.permits_required || "None",
    cover_image:
      destData.cover_image !== undefined
        ? (destData.cover_image ? normalizeImageUrl(destData.cover_image) : null)
        : (existing?.cover_image || null),
    cover_video_url:
      destData.cover_video_url !== undefined
        ? destData.cover_video_url
        : (existing?.cover_video_url || ""),
    seo_title: destData.seo_title || existing?.seo_title || `${resolvedName} Travel Guide | Savar Tour Lover`,
    seo_description: destData.seo_description || existing?.seo_description || "",
    gallery: Array.isArray(destData.gallery)
      ? destData.gallery.map((g) => ({ ...g, image: normalizeImageUrl(g.image) }))
      : (existing?.gallery || []),
    is_featured: destData.is_featured !== undefined ? Boolean(destData.is_featured) : Boolean(existing?.is_featured),
    status: destData.status || existing?.status || "published",
  };

  // Clear tombstones if re-created or updated
  if (db.deletedEntities?.destinations) {
    db.deletedEntities.destinations = db.deletedEntities.destinations.filter(
      (delId) => delId !== targetDest.id && delId !== targetDest.slug
    );
  }

  if (index !== -1) {
    db.destinations[index] = targetDest;
  } else {
    db.destinations.unshift(targetDest);
  }

  // Cross-link: update any tours pointing to this destination if slug or name changed
  if (existing && (existing.slug !== targetDest.slug || existing.name !== targetDest.name)) {
    for (const t of db.tours) {
      if (t.destination_slug === existing.slug) {
        t.destination_slug = targetDest.slug;
        t.destination_name = targetDest.name;
        t.destination_id = targetDest.id;
      }
    }
  }

  await saveDb(db);
  await syncDestinationToSupabase(targetDest);
  return targetDest;
}

export async function deleteDestination(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.destinations.findIndex((d) => d.id === id || d.slug === id);
  if (index === -1) return false;
  const [removed] = db.destinations.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
    };
  }
  if (!db.deletedEntities.destinations) db.deletedEntities.destinations = [];
  if (removed.id && !db.deletedEntities.destinations.includes(removed.id)) {
    db.deletedEntities.destinations.push(removed.id);
  }
  if (removed.slug && !db.deletedEntities.destinations.includes(removed.slug)) {
    db.deletedEntities.destinations.push(removed.slug);
  }

  await saveDb(db);
  await deleteDestinationFromSupabase(removed.id, removed.slug);
  return true;
}

export function getAllBlogPostsAdmin(): DbBlogPost[] {
  const db = loadDb();
  return db.blogPosts;
}

export async function saveBlogPost(postData: Partial<DbBlogPost>): Promise<DbBlogPost> {
  const db = loadDb();
  const id = postData.id || `post-${Date.now()}`;
  const index = db.blogPosts.findIndex((p) => p.id === id);

  const rawBody = postData.body || postData.content || "";
  const defaultPost: DbBlogPost = {
    id,
    title: postData.title || "Untitled Post",
    slug: postData.slug || `post-${Date.now()}`,
    category: postData.category || { name: "Travel Tips" },
    author_name: postData.author_name || postData.author || "Savar Tour Lover Editorial",
    author: postData.author || postData.author_name || "Savar Tour Lover Editorial",
    cover_image: postData.cover_image
      ? normalizeImageUrl(postData.cover_image)
      : postData.hero_image
      ? normalizeImageUrl(postData.hero_image)
      : null,
    hero_image: postData.hero_image
      ? normalizeImageUrl(postData.hero_image)
      : postData.cover_image
      ? normalizeImageUrl(postData.cover_image)
      : null,
    excerpt: postData.excerpt || rawBody.slice(0, 160),
    body: rawBody,
    content: rawBody,
    read_time_minutes: Number(postData.read_time_minutes || 5),
    tags: postData.tags || [],
    published_at: postData.published_at || new Date().toISOString(),
    status: postData.status || (postData.is_published === false ? "draft" : "published"),
    is_published: postData.status ? postData.status === "published" : postData.is_published !== false,
    is_featured: Boolean(postData.is_featured),
  };

  // Un-tombstone if re-created
  if (db.deletedEntities?.blogPosts) {
    db.deletedEntities.blogPosts = db.deletedEntities.blogPosts.filter(
      (delId) => delId !== defaultPost.id && delId !== defaultPost.slug
    );
  }

  if (index !== -1) {
    db.blogPosts[index] = { ...db.blogPosts[index], ...defaultPost };
  } else {
    db.blogPosts.unshift(defaultPost);
  }

  await saveDb(db);
  await syncBlogPostToSupabase(defaultPost);
  return defaultPost;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.blogPosts.findIndex((p) => p.id === id || p.slug === id);
  if (index === -1) return false;
  const [removed] = db.blogPosts.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
    };
  }
  if (!db.deletedEntities.blogPosts) db.deletedEntities.blogPosts = [];
  if (removed.id && !db.deletedEntities.blogPosts.includes(removed.id)) {
    db.deletedEntities.blogPosts.push(removed.id);
  }
  if (removed.slug && !db.deletedEntities.blogPosts.includes(removed.slug)) {
    db.deletedEntities.blogPosts.push(removed.slug);
  }

  await saveDb(db);
  await deleteBlogPostFromSupabase(removed.id, removed.slug);
  return true;
}

export function getAllOffersAdmin(): DbOffer[] {
  const db = loadDb();
  return db.offers;
}

export async function saveOffer(offerData: Partial<DbOffer>): Promise<DbOffer> {
  const db = loadDb();
  const id = offerData.id || `offer-${Date.now()}`;
  const index = db.offers.findIndex((o) => o.id === id);

  const defaultOffer: DbOffer = {
    id,
    title: offerData.title || "Special Offer",
    description: offerData.description || "",
    slug: (offerData.slug || offerData.code || "PROMO").toUpperCase(),
    code: (offerData.code || offerData.slug || "PROMO").toUpperCase(),
    discount_type: offerData.discount_type || "percent",
    discount_value: offerData.discount_value || "10",
    minimum_spend: offerData.minimum_spend || "0",
    valid_from: offerData.valid_from || new Date().toISOString().slice(0, 10),
    tour_id: offerData.tour_id || null,
    tour_slug: offerData.tour_slug || null,
    tour_title: offerData.tour_title || null,
    valid_until: offerData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    banner_image: offerData.banner_image ? normalizeImageUrl(offerData.banner_image) : null,
    is_active: offerData.is_active !== false,
  };

  // Un-tombstone if re-created
  if (db.deletedEntities?.offers) {
    db.deletedEntities.offers = db.deletedEntities.offers.filter(
      (delId) => delId !== defaultOffer.id && delId !== defaultOffer.code && delId !== defaultOffer.slug
    );
  }

  if (index !== -1) {
    db.offers[index] = { ...db.offers[index], ...defaultOffer };
  } else {
    db.offers.unshift(defaultOffer);
  }

  await saveDb(db);
  await syncOfferToSupabase(defaultOffer);
  return defaultOffer;
}

export async function deleteOffer(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.offers.findIndex((o) => o.id === id || o.code === id || o.slug === id);
  if (index === -1) return false;
  const [removed] = db.offers.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
    };
  }
  if (!db.deletedEntities.offers) db.deletedEntities.offers = [];
  if (removed.id && !db.deletedEntities.offers.includes(removed.id)) {
    db.deletedEntities.offers.push(removed.id);
  }
  if (removed.code && !db.deletedEntities.offers.includes(removed.code)) {
    db.deletedEntities.offers.push(removed.code);
  }
  if (removed.slug && !db.deletedEntities.offers.includes(removed.slug)) {
    db.deletedEntities.offers.push(removed.slug);
  }

  await saveDb(db);
  await deleteOfferFromSupabase(removed.id, removed.code, removed.slug);
  return true;
}

export function getAllTestimonialsAdmin(): DbTestimonial[] {
  const db = loadDb();
  return db.testimonials;
}

export async function saveTestimonial(testData: Partial<DbTestimonial>): Promise<DbTestimonial> {
  const db = loadDb();
  const id = testData.id || `rev-${Date.now()}`;
  const index = db.testimonials.findIndex((t) => t.id === id);

  const authorPhoto = testData.author_avatar || testData.customer_photo;
  const normalizedPhoto = authorPhoto ? normalizeImageUrl(authorPhoto) : null;

  const defaultTest: DbTestimonial = {
    id,
    customer_name: testData.customer_name || testData.author_name || "Valued Guest",
    author_name: testData.author_name || testData.customer_name || "Valued Guest",
    tour_title: testData.tour_title || testData.trip_name || "Bangladesh Tour",
    trip_name: testData.trip_name || testData.tour_title || "Bangladesh Tour",
    author_location: testData.author_location || "Bangladesh",
    rating: typeof testData.rating === "number" ? testData.rating : 5,
    quote: testData.quote || "",
    customer_photo: normalizedPhoto,
    author_avatar: normalizedPhoto,
    is_featured: testData.is_featured !== false,
  };

  // Un-tombstone if re-created
  if (db.deletedEntities?.testimonials) {
    db.deletedEntities.testimonials = db.deletedEntities.testimonials.filter(
      (delId) => delId !== defaultTest.id
    );
  }

  if (index !== -1) {
    db.testimonials[index] = { ...db.testimonials[index], ...defaultTest };
  } else {
    db.testimonials.unshift(defaultTest);
  }

  await saveDb(db);
  await syncTestimonialToSupabase(defaultTest);
  return defaultTest;
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.testimonials.findIndex((t) => t.id === id);
  if (index === -1) return false;
  const [removed] = db.testimonials.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
    };
  }
  if (!db.deletedEntities.testimonials) db.deletedEntities.testimonials = [];
  if (removed.id && !db.deletedEntities.testimonials.includes(removed.id)) {
    db.deletedEntities.testimonials.push(removed.id);
  }

  await saveDb(db);
  await deleteTestimonialFromSupabase(removed.id);
  return true;
}

export async function saveHomepageBlock(id: string, blockType: DbHomepageBlock["block_type"], content: Record<string, unknown>): Promise<DbHomepageBlock> {
  const db = loadDb();
  const index = db.homepageBlocks.findIndex((b) => b.id === id);

  // Clear tombstone if previously deleted
  if (db.deletedEntities?.homepageBlocks) {
    db.deletedEntities.homepageBlocks = db.deletedEntities.homepageBlocks.filter((tid) => tid !== id);
  }

  let targetBlock: DbHomepageBlock;
  if (index !== -1) {
    db.homepageBlocks[index].content = { ...db.homepageBlocks[index].content, ...content };
    targetBlock = db.homepageBlocks[index];
  } else {
    const newBlock: DbHomepageBlock = {
      id,
      block_type: blockType,
      display_order: db.homepageBlocks.length + 1,
      content,
    };
    db.homepageBlocks.push(newBlock);
    targetBlock = newBlock;
  }

  // Cross-link: Keep block-home-page and block-hero-1 in lockstep for hero settings
  if (id === "block-home-page") {
    const heroIdx = db.homepageBlocks.findIndex((b) => b.id === "block-hero-1");
    if (heroIdx !== -1) {
      db.homepageBlocks[heroIdx].content = {
        ...db.homepageBlocks[heroIdx].content,
        hero_media_type: content.hero_media_type,
        hero_video_url: content.hero_video_url,
        hero_slides: content.hero_slides,
        eyebrow: content.hero_eyebrow,
        headline: content.hero_headline,
        highlight: content.hero_highlight,
        subheadline: content.hero_subheadline,
        primary_cta_label: content.hero_primary_cta_label,
        primary_cta_href: content.hero_primary_cta_href,
        secondary_cta_label: content.hero_secondary_cta_label,
        secondary_cta_href: content.hero_secondary_cta_href,
      };
    }
  }

  memoryDb = db;
  await saveDb(db);
  await syncHomepageBlockToSupabase(targetBlock);
  return targetBlock;
}

export function getAllBookingsAdmin(): DbBooking[] {
  const db = loadDb();
  let changed = false;
  if (autoCancelExpiredCashBookings(db)) {
    changed = true;
  }

  // Ensure transaction numbers from payments are attached to bookings
  for (const b of db.bookings) {
    const pays = db.payments.filter((p) => p.booking_id === b.id && p.status === "success");
    for (const p of pays) {
      const trx = p.val_id || (p as any).trx_id || p.tran_id;
      if (trx) {
        if (!b.transaction_id) {
          b.transaction_id = trx;
          changed = true;
        }
        if (p.payment_type === "advance" && !b.advance_transaction_id) {
          b.advance_transaction_id = trx;
          changed = true;
        } else if ((p.payment_type === "final" || p.payment_type === "due") && !b.due_transaction_id) {
          b.due_transaction_id = trx;
          changed = true;
        } else if (p.payment_type === "full") {
          if (!b.advance_transaction_id) {
            b.advance_transaction_id = trx;
            changed = true;
          }
          if (!b.due_transaction_id) {
            b.due_transaction_id = trx;
            changed = true;
          }
        }
      }
    }
  }

  if (changed) {
    void saveDb(db);
  }
  return db.bookings;
}

export async function updateBookingStatus(id: string, status: DbBooking["status"]): Promise<DbBooking | null> {
  const db = loadDb();
  const booking = db.bookings.find((b) => b.id === id);
  if (!booking) return null;
  booking.status = status;

  if (status === "confirmed_fully_paid" || status === "cleared_on_tour_day") {
    booking.amount_paid = booking.total_price;
    booking.amount_due = "0.00";
    let ticket = db.clearanceTickets.find((t) => t.booking_id === id);
    if (!ticket) {
      ticket = getClearanceTicket(id) || undefined;
    }
    if (ticket) {
      ticket.is_cleared = true;
      ticket.cleared_at = new Date().toISOString();
      ticket.clearance_method = status === "cleared_on_tour_day" ? "host_verification" : "verification_only";
    }
  }

  booking.updated_at = new Date().toISOString();
  await saveDb(db);
  await syncBookingToSupabase(booking);
  return booking;
}

export function getAllInquiriesAdmin(): DbContactInquiry[] {
  const db = loadDb();
  return db.contactInquiries;
}

export async function updateInquiryStatus(
  id: string,
  status: DbContactInquiry["status"],
  adminNotes?: string
): Promise<DbContactInquiry | null> {
  const db = loadDb();
  const inquiry = db.contactInquiries.find((i) => i.id === id);
  if (!inquiry) return null;
  inquiry.status = status;
  if (adminNotes !== undefined) inquiry.admin_notes = adminNotes;
  await saveDb(db, true);
  await syncContactInquiryToSupabase(inquiry);
  return inquiry;
}

export function getInquiryById(id: string): DbContactInquiry | null {
  const db = loadDb();
  return db.contactInquiries.find((i) => i.id === id) || null;
}

export async function deleteInquiry(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.contactInquiries.findIndex((i) => i.id === id);
  if (index === -1) return false;
  const [removed] = db.contactInquiries.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
      bookings: [],
      customers: [],
      contactInquiries: [],
    };
  }
  if (!db.deletedEntities.contactInquiries) db.deletedEntities.contactInquiries = [];
  if (removed.id && !db.deletedEntities.contactInquiries.includes(removed.id)) {
    db.deletedEntities.contactInquiries.push(removed.id);
  }

  await saveDb(db, true);
  await deleteInquiryFromSupabase(removed.id);
  return true;
}

export async function deleteHomepageBlock(id: string): Promise<boolean> {
  const db = loadDb();
  const index = db.homepageBlocks.findIndex((b) => b.id === id);
  if (index === -1) return false;
  const [removed] = db.homepageBlocks.splice(index, 1);

  if (!db.deletedEntities) {
    db.deletedEntities = {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
    };
  }
  if (!db.deletedEntities.homepageBlocks) db.deletedEntities.homepageBlocks = [];
  if (removed.id && !db.deletedEntities.homepageBlocks.includes(removed.id)) {
    db.deletedEntities.homepageBlocks.push(removed.id);
  }

  await saveDb(db, true);
  await deleteHomepageBlockFromSupabase(removed.id);
  return true;
}

/**
 * Trigger cloud rebuild of the storage snapshot mirror
 */
export async function rebuildSnapshotMirror() {
  return await invokeCloudSnapshotSync();
}

// ---------------------------------------------------------------------------
// Server-Side Analytics & Tracking
// ---------------------------------------------------------------------------

export function recordAnalyticsEvent(
  eventInput: Omit<DbAnalyticsEvent, "id" | "created_at">
): DbAnalyticsEvent {
  const db = loadDb();
  if (!Array.isArray(db.analyticsEvents)) {
    db.analyticsEvents = [];
  }
  const event: DbAnalyticsEvent = {
    ...eventInput,
    id: `evt-${Date.now()}-${randomToken(4)}`,
    created_at: new Date().toISOString(),
  };

  db.analyticsEvents.unshift(event);

  // Keep bounded to last 5,000 events to maintain low memory usage and small snapshot size
  if (db.analyticsEvents.length > 5000) {
    db.analyticsEvents.length = 5000;
  }

  void saveDb(db);
  return event;
}

export function getRecentAnalyticsEvents(limit = 100): DbAnalyticsEvent[] {
  const db = loadDb();
  return (db.analyticsEvents || []).slice(0, limit);
}

export function getAnalyticsStats() {
  const db = loadDb();
  const events = db.analyticsEvents || [];
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let totalPageViews = 0;
  let pageViews24h = 0;
  const uniqueSessions = new Set<string>();
  const uniqueVisitors = new Set<string>();
  const topPagesMap = new Map<string, number>();
  const topSourcesMap = new Map<string, number>();
  const eventCounts: Record<string, number> = {};

  for (const e of events) {
    eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    if (e.session_id) uniqueSessions.add(e.session_id);
    if (e.visitor_id || e.ip_hash) uniqueVisitors.add(e.visitor_id || e.ip_hash!);

    const time = new Date(e.created_at).getTime();
    if (e.event_name === "page_view") {
      totalPageViews++;
      if (time >= oneDayAgo) pageViews24h++;
      if (e.path) {
        topPagesMap.set(e.path, (topPagesMap.get(e.path) || 0) + 1);
      }
    }
    const source = e.utm_source || (e.referrer ? new URL(e.referrer, "https://savartourlover.com").hostname : "direct");
    topSourcesMap.set(source, (topSourcesMap.get(source) || 0) + 1);
  }

  const topPages = Array.from(topPagesMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topSources = Array.from(topSourcesMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    totalEvents: events.length,
    totalPageViews,
    pageViews24h,
    uniqueSessions: uniqueSessions.size,
    uniqueVisitors: uniqueVisitors.size,
    eventCounts,
    topPages,
    topSources,
  };
}

// ---------------------------------------------------------------------------
// HYBRID SMART MATCHER: Dutch-Bangla Bank (DBBL) Rocket SMS Verification
// ---------------------------------------------------------------------------

export async function recordIncomingRocketSms(input: {
  raw_message: string;
  sender?: string;
}): Promise<{
  success: boolean;
  parsed: ParsedRocketSms;
  smsRecord?: DbRocketIncomingSms;
  autoMatchedBooking?: DbBooking;
  error?: string;
}> {
  const parsed = parseRocketSms(input.raw_message);
  if (!parsed.isRocket || !parsed.trxId || !parsed.amount) {
    return {
      success: false,
      parsed,
      error: "Could not parse valid Rocket transaction ID and amount from SMS.",
    };
  }

  const db = loadDb();
  if (!Array.isArray(db.rocketIncomingSms)) {
    db.rocketIncomingSms = [];
  }

  // Deduplicate: If this TrxID is already recorded, return existing record
  let smsRecord = db.rocketIncomingSms.find(
    (s) => s.trx_id.toUpperCase() === parsed.trxId!.toUpperCase()
  );

  if (!smsRecord) {
    smsRecord = {
      id: `sms-rkt-${Date.now()}-${randomToken(4)}`,
      trx_id: parsed.trxId,
      amount: parsed.amount.toFixed(2),
      sender_phone: parsed.senderPhone || undefined,
      balance: parsed.balance !== null ? parsed.balance.toFixed(2) : undefined,
      raw_message: input.raw_message,
      received_at: new Date().toISOString(),
      is_used: false,
    };
    db.rocketIncomingSms.unshift(smsRecord);
  }

  let autoMatchedBooking: DbBooking | undefined;

  // Check if there is an active booking waiting in pending_verification for this TrxID
  if (!smsRecord.is_used) {
    const pendingBooking = db.bookings.find(
      (b) =>
        (b.status === "pending_verification" || b.status === "pending_payment") &&
        b.submitted_trx_id &&
        b.submitted_trx_id.toUpperCase() === parsed.trxId!.toUpperCase()
    );

    if (pendingBooking) {
      const payment = db.payments.find((p) => p.booking_id === pendingBooking.id);
      const tranId = payment?.tran_id || `TRAN-${Date.now()}`;

      await confirmPaymentSuccess(
        tranId,
        parsed.trxId,
        "Rocket payment",
        {
          bookingId: pendingBooking.id,
          bookingRef: pendingBooking.reference,
          verifiedAmount: parsed.amount.toFixed(2),
        }
      );

      smsRecord.is_used = true;
      smsRecord.matched_booking_id = pendingBooking.id;
      smsRecord.matched_at = new Date().toISOString();

      pendingBooking.status = "confirmed_advance_paid";
      pendingBooking.verified_by_sms_id = smsRecord.id;
      pendingBooking.updated_at = new Date().toISOString();
      autoMatchedBooking = pendingBooking;

      db.alerts.unshift({
        id: `alt-rkt-${Date.now()}-${randomToken(3)}`,
        alert_type: "rocket_auto_verified",
        severity: "info",
        message: `✓ Rocket Payment Auto-Verified by DBBL SMS: Booking ${pendingBooking.reference} (${pendingBooking.tour_title}) confirmed for ৳${smsRecord.amount} with TrxID ${parsed.trxId}.`,
        is_acknowledged: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  await saveDb(db);
  return {
    success: true,
    parsed,
    smsRecord,
    autoMatchedBooking,
  };
}

export async function verifyRocketTrxHybrid(input: {
  tran_id: string;
  payment_id?: string;
  trx_id: string;
  sender_phone: string;
  amount?: string;
}): Promise<{
  success: boolean;
  status: "matched_instant" | "pending_verification";
  message: string;
  booking?: DbBooking;
  redirect_url?: string;
  hold_expires_at?: string;
  error?: string;
}> {
  const db = loadDb();
  const cleanTrx = input.trx_id.trim().toUpperCase();
  const cleanPhone = input.sender_phone.replace(/^\+88/, "").trim();

  // Locate the payment & booking
  let payment = db.payments.find((p) => p.tran_id === input.tran_id);
  if (!payment && input.payment_id) {
    payment = db.payments.find((p) => p.id === input.payment_id || p.val_id === input.payment_id);
  }
  if (!payment) {
    return {
      success: false,
      status: "pending_verification",
      message: "Payment session not found.",
      error: "Payment record not found.",
    };
  }

  const booking = db.bookings.find((b) => b.id === payment.booking_id);
  if (!booking) {
    return {
      success: false,
      status: "pending_verification",
      message: "Booking not found.",
      error: "Booking record not found.",
    };
  }

  // Anti-replay: has this TrxID already been used for another confirmed booking?
  const existingUsed = db.payments.find(
    (p) =>
      p.status === "success" &&
      p.trx_id &&
      p.trx_id.toUpperCase() === cleanTrx &&
      p.tran_id !== payment.tran_id
  );
  if (existingUsed) {
    return {
      success: false,
      status: "pending_verification",
      message: "This Rocket Transaction ID was already used for another confirmed booking.",
      error: "Duplicate Transaction ID (Already Used).",
    };
  }

  // Check if an SMS with this TrxID has already arrived in db.rocketIncomingSms
  if (!Array.isArray(db.rocketIncomingSms)) {
    db.rocketIncomingSms = [];
  }

  const matchingSms = db.rocketIncomingSms.find(
    (s) => s.trx_id.toUpperCase() === cleanTrx && (!s.is_used || s.matched_booking_id === booking.id)
  );

  if (matchingSms) {
    // CASE A: INSTANT MATCH! Bank SMS already received
    const verifiedAmount = matchingSms.amount || payment.amount;
    await confirmPaymentSuccess(
      payment.tran_id,
      cleanTrx,
      "Rocket payment",
      {
        bookingId: booking.id,
        bookingRef: booking.reference,
        verifiedAmount,
      }
    );

    matchingSms.is_used = true;
    matchingSms.matched_booking_id = booking.id;
    matchingSms.matched_at = new Date().toISOString();

    booking.status = "confirmed_advance_paid";
    booking.submitted_trx_id = cleanTrx;
    booking.submitted_sender_phone = cleanPhone;
    booking.verified_by_sms_id = matchingSms.id;
    booking.updated_at = new Date().toISOString();

    await saveDb(db);

    return {
      success: true,
      status: "matched_instant",
      message: "Payment 100% verified by Dutch-Bangla Bank SMS!",
      booking,
      redirect_url: `/payment-result?status=success&reference=${encodeURIComponent(booking.reference)}`,
    };
  }

  // CASE B: SMS NOT YET IN DATABASE (Delayed / Phone briefly offline)
  // Move to pending_verification with 15-minute hold timer
  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  booking.status = "pending_verification";
  booking.verification_expires_at = holdExpiresAt;
  booking.submitted_trx_id = cleanTrx;
  booking.submitted_sender_phone = cleanPhone;
  booking.payment_method = "Rocket payment";
  booking.advance_payment_method = "Rocket payment";
  booking.updated_at = new Date().toISOString();

  payment.trx_id = cleanTrx;
  payment.val_id = cleanTrx;

  db.alerts.unshift({
    id: `alt-hold-${Date.now()}-${randomToken(3)}`,
    alert_type: "rocket_hold_pending",
    severity: "warning",
    message: `⏳ Rocket TrxID [${cleanTrx}] submitted for ${booking.reference} (${booking.tour_title}). SMS not yet received. 15-minute verification hold active.`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  });

  await saveDb(db);

  return {
    success: true,
    status: "pending_verification",
    message: "TrxID recorded. Awaiting SMS verification from Dutch-Bangla Bank...",
    booking,
    hold_expires_at: holdExpiresAt,
  };
}

export async function approveRocketVerification(
  bookingId: string,
  adminName: string = "Staff Admin"
): Promise<{ success: boolean; booking: DbBooking; ticket?: any }> {
  const db = loadDb();
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  if (booking.status === "confirmed_advance_paid" || booking.status === "confirmed_fully_paid") {
    return { success: true, booking };
  }

  if (booking.status === "cancelled") {
    throw new Error("Cannot approve a cancelled booking. The hold window may have expired.");
  }

  const payment = db.payments.find((p) => p.booking_id === booking.id);
  const tranId = payment?.tran_id || `TRAN-${Date.now()}`;
  const trxId = booking.submitted_trx_id || payment?.trx_id || `RKT-MANUAL-${Date.now()}`;

  const result = await confirmPaymentSuccess(
    tranId,
    trxId,
    "Rocket payment",
    {
      bookingId: booking.id,
      bookingRef: booking.reference,
      verifiedAmount: booking.advance_amount,
    }
  );

  booking.status = "confirmed_advance_paid";
  booking.cash_approved_by = adminName;
  booking.cash_approved_at = new Date().toISOString();
  booking.updated_at = new Date().toISOString();

  db.alerts.unshift({
    id: `alt-appr-${Date.now()}-${randomToken(3)}`,
    alert_type: "rocket_manual_approved",
    severity: "info",
    message: `✓ Rocket payment for ${booking.reference} was manually approved by ${adminName} (TrxID: ${trxId}).`,
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  });

  await saveDb(db);
  return { success: true, booking, ticket: result.ticket };
}

export async function rejectRocketVerification(
  bookingId: string,
  reason: string = "Fake or unverified Rocket TrxID"
): Promise<{ success: boolean; seatsReleased: string[] }> {
  const result = await deleteIncompleteBooking(bookingId, reason);
  return { success: true, seatsReleased: result.seatsReleased };
}

export function getRocketIncomingSmsList(): DbRocketIncomingSms[] {
  const db = loadDb();
  return Array.isArray(db.rocketIncomingSms) ? db.rocketIncomingSms : [];
}


