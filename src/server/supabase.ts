import { getSupabaseAdminClient, getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  DatabaseSchema,
  DbAlert,
  DbBlogPost,
  DbBooking,
  DbClearanceTicket,
  DbCustomerActivity,
  DbCustomerUser,
  DbDestination,
  DbHomepageBlock,
  DbOffer,
  DbPayment,
  DbTestimonial,
  DbTour,
  DbTourCategory,
  DbContactInquiry,
} from "./types";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "tourlover-data";
const DB_OBJECT_PATH = "db.json";

let lastSyncTimestamp: string | null = null;
let lastSyncStatus: "idle" | "syncing" | "success" | "error" = "idle";
let lastSyncError: string | null = null;

export const DEFAULT_TOUR_CATEGORIES: DbTourCategory[] = [
  { id: "cat-group-tour", name: "Group Tour", slug: "group_tour", description: "Scheduled small group journeys with like-minded travelers", icon: "👥", badge: "Popular", is_active: true, display_order: 1 },
  { id: "cat-private-tour", name: "Private Tour", slug: "private_tour", description: "Customized private itineraries for personal dates and groups", icon: "🚙", badge: "Flexible", is_active: true, display_order: 2 },
  { id: "cat-weekend-getaway", name: "Weekend Getaway", slug: "weekend_getaway", description: "Quick short escapes designed for Friday-Saturday weekends", icon: "⛺", badge: "Quick Trip", is_active: true, display_order: 3 },
  { id: "cat-adventure-tour", name: "Adventure Tour", slug: "adventure_tour", description: "Trekking, hills, caves, and outdoor exploration", icon: "🧗", badge: "Thrilling", is_active: true, display_order: 4 },
  { id: "cat-honeymoon-package", name: "Honeymoon Package", slug: "honeymoon_package", description: "Romantic getaways with candlelit dinners and private resort stays", icon: "💍", badge: "Romantic", is_active: true, display_order: 5 },
  { id: "cat-family-tour", name: "Family Tour", slug: "family_tour", description: "Comfortable, relaxed journeys suitable for children and elders", icon: "👨‍👩‍👧‍👦", badge: "Family Friendly", is_active: true, display_order: 6 },
  { id: "cat-day-trip", name: "Day Trip", slug: "day_trip", description: "Single-day sightseeing and activities without overnight stay", icon: "☀️", badge: "1 Day", is_active: true, display_order: 7 },
  { id: "cat-heritage-tour", name: "Heritage Tour", slug: "heritage_tour", description: "Historical monuments, cultural roots, and archaeological wonders", icon: "🏛️", badge: "Cultural", is_active: true, display_order: 8 },
];

export async function syncTourCategoriesToSupabase(categories: DbTourCategory[]): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: "block-tour-categories",
      block_type: "service_list",
      display_order: 99,
      content: { categories, updated_at: new Date().toISOString() },
    };
    const { error } = await supabase.from("homepage_blocks").upsert(payload);
    if (error) {
      console.warn("[Supabase Postgres] Categories block upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Exception syncing tour categories:", err?.message || err);
    return false;
  }
}

// =============================================================================
// PostgreSQL Direct Entity Sync
// =============================================================================

export async function syncDestinationToSupabase(dest: DbDestination): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: dest.id,
      name: dest.name,
      slug: dest.slug,
      division: dest.division,
      tagline: dest.tagline || null,
      description: dest.description || null,
      best_time_to_visit: dest.best_time_to_visit || null,
      weather_notes: dest.weather_notes || null,
      popular_attractions: dest.popular_attractions || [],
      recommended_accommodation: dest.recommended_accommodation || null,
      travel_tips: dest.travel_tips || null,
      permits_required: dest.permits_required || null,
      cover_image: dest.cover_image || null,
      cover_video_url: dest.cover_video_url || null,
      seo_title: dest.seo_title || null,
      seo_description: dest.seo_description || null,
      gallery: dest.gallery || [],
      is_featured: Boolean(dest.is_featured),
      status: dest.status || "published",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("destinations").upsert(payload);
    if (error) {
      console.warn("[Supabase Postgres] Destination upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Destination upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteDestinationFromSupabase(id: string, slug?: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    await supabase.from("tours").update({ destination_id: null }).eq("destination_id", id);
    if (slug) {
      await supabase.from("tours").update({ destination_id: null }).eq("destination_slug", slug);
    }
    let query = supabase.from("destinations").delete();
    if (slug && slug !== id) {
      query = query.or(`id.eq.${id},slug.eq.${id},id.eq.${slug},slug.eq.${slug}`);
    } else {
      query = query.or(`id.eq.${id},slug.eq.${id}`);
    }
    const { error } = await query;
    if (error) {
      console.warn("[Supabase Postgres] Destination delete warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Destination delete exception:", err?.message || err);
    return false;
  }
}

export async function syncTourToSupabase(tour: DbTour): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const totalSeats = Math.max(1, Number(tour.total_seats) || 40);
    const departures = (tour.departures || []).map((d) => ({
      ...d,
      total_seats: Number(d.total_seats || totalSeats),
      seats_remaining: Number(d.seats_remaining ?? d.total_seats ?? totalSeats),
      booked_seats: Array.isArray(d.booked_seats) ? d.booked_seats : [],
      is_active: d.is_active !== false,
    }));

    const basePayload: Record<string, any> = {
      id: tour.id,
      title: tour.title,
      slug: tour.slug,
      destination_id: tour.destination_id || null,
      destination_slug: tour.destination_slug,
      category: tour.category || "package_tour",
      duration_days: Number(tour.duration_days || 1),
      duration_nights: Number(tour.duration_nights || 0),
      starting_price: Number(tour.base_price || 0),
      discount: Number(tour.discount_value || 0),
      advance_percent: Number(tour.advance_payment_percent || 40),
      advance_amount: Number(tour.advance_amount || 0),
      hero_image: tour.hero_image || null,
      overview: tour.full_description || tour.short_description || "",
      itinerary: tour.itinerary || [],
      inclusions: tour.inclusions || [],
      exclusions: tour.exclusions || [],
      departures: departures,
      meeting_point: tour.meeting_point || "Dhaka Sayedabad / Fakirapool",
      pickup_points: Array.isArray(tour.pickup_points) ? tour.pickup_points : [],
      departure_schedule: tour.departure_schedule || "Every Friday 7:00 AM",
      faqs: tour.faqs || [],
      status: tour.status || "published",
      is_featured: Boolean(tour.is_featured),
      updated_at: new Date().toISOString(),
    };

    // Attempt upsert with total_seats column
    const payloadWithSeats = {
      ...basePayload,
      total_seats: totalSeats,
    };

    let { error } = await supabase.from("tours").upsert(payloadWithSeats);

    // If PostgreSQL tours table doesn't have total_seats column yet, fallback to basePayload
    // (total_seats is still securely saved per departure in the departures JSONB column)
    if (error && error.message && error.message.includes("total_seats")) {
      const retry = await supabase.from("tours").upsert(basePayload);
      error = retry.error;
    }

    if (error) {
      console.warn("[Supabase Postgres] Tour upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Tour upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteTourFromSupabase(id: string, slug?: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    await supabase.from("bookings").update({ tour_id: null }).eq("tour_id", id);
    await supabase.from("offers").update({ tour_id: null }).eq("tour_id", id);
    if (slug) {
      await supabase.from("bookings").update({ tour_id: null }).eq("tour_slug", slug);
      await supabase.from("offers").update({ tour_id: null }).eq("tour_slug", slug);
    }
    let query = supabase.from("tours").delete();
    if (slug && slug !== id) {
      query = query.or(`id.eq.${id},slug.eq.${id},id.eq.${slug},slug.eq.${slug}`);
    } else {
      query = query.or(`id.eq.${id},slug.eq.${id}`);
    }
    const { error } = await query;
    if (error) {
      console.warn("[Supabase Postgres] Tour delete warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Tour delete exception:", err?.message || err);
    return false;
  }
}

export async function syncOfferToSupabase(offer: DbOffer): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const fullPayload: Record<string, any> = {
      id: offer.id,
      title: offer.title,
      code: offer.code || offer.slug || "PROMO",
      tagline: offer.description || null,
      discount_badge: offer.discount_type === "percent" ? `${offer.discount_value}% OFF` : `BDT ${offer.discount_value} OFF`,
      discount_type: offer.discount_type === "percent" ? "percentage" : "flat",
      discount_value: Number(offer.discount_value || 0),
      valid_from: offer.valid_from ? offer.valid_from.slice(0, 10) : new Date().toISOString().slice(0, 10),
      valid_until: offer.valid_until ? offer.valid_until.slice(0, 10) : null,
      minimum_spend: Number(offer.minimum_spend || 0),
      image_url: offer.banner_image || null,
      tour_id: offer.tour_id || null,
      tour_slug: offer.tour_slug || null,
      tour_title: offer.tour_title || null,
      is_active: offer.is_active !== undefined ? Boolean(offer.is_active) : true,
    };

    let { error } = await supabase.from("offers").upsert(fullPayload);
    if (error && (error.code === "PGRST204" || error.message?.includes("column"))) {
      const basePayload = {
        id: offer.id,
        title: offer.title,
        code: offer.code || offer.slug || "PROMO",
        tagline: offer.description || null,
        discount_badge: offer.discount_type === "percent" ? `${offer.discount_value}% OFF` : `BDT ${offer.discount_value} OFF`,
        discount_type: offer.discount_type === "percent" ? "percentage" : "flat",
        discount_value: Number(offer.discount_value || 0),
        valid_from: offer.valid_from ? offer.valid_from.slice(0, 10) : new Date().toISOString().slice(0, 10),
        valid_until: offer.valid_until ? offer.valid_until.slice(0, 10) : null,
        minimum_spend: Number(offer.minimum_spend || 0),
        image_url: offer.banner_image || null,
      };
      const retry = await supabase.from("offers").upsert(basePayload);
      error = retry.error;
    }

    if (error) {
      console.warn("[Supabase Postgres] Offer upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Offer upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteOfferFromSupabase(id: string, code?: string, slug?: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const conditions = new Set<string>();
    conditions.add(`id.eq.${id}`);
    conditions.add(`slug.eq.${id}`);
    conditions.add(`code.eq.${id}`);
    if (code) {
      conditions.add(`id.eq.${code}`);
      conditions.add(`code.eq.${code}`);
    }
    if (slug) {
      conditions.add(`id.eq.${slug}`);
      conditions.add(`slug.eq.${slug}`);
    }
    const { error } = await supabase.from("offers").delete().or(Array.from(conditions).join(","));
    if (error) {
      console.warn("[Supabase Postgres] Offer delete warning:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function syncTestimonialToSupabase(test: DbTestimonial): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: test.id,
      author_name: test.author_name || test.customer_name,
      trip_name: test.trip_name || test.tour_title,
      author_location: test.author_location || "Bangladesh",
      author_avatar: test.author_avatar || test.customer_photo || null,
      rating: Number(test.rating || 5),
      quote: test.quote,
      is_featured: Boolean(test.is_featured),
    };
    const { error } = await supabase.from("testimonials").upsert(payload);
    if (error) {
      console.warn("[Supabase Postgres] Testimonial upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Testimonial upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteTestimonialFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function syncBlogPostToSupabase(post: DbBlogPost): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || null,
      content: post.body || post.content || null,
      author: post.author_name || post.author || "Savar Tour Lover Editorial",
      hero_image: post.cover_image || post.hero_image || null,
      read_time_minutes: Number(post.read_time_minutes || 5),
      tags: post.tags || [],
      is_published: post.status === "published" || post.is_published !== false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("blog_posts").upsert(payload);
    if (error) {
      console.warn("[Supabase Postgres] Blog post upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Blog post upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteBlogPostFromSupabase(id: string, slug?: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    let query = supabase.from("blog_posts").delete();
    if (slug && slug !== id) {
      query = query.or(`id.eq.${id},slug.eq.${id},id.eq.${slug},slug.eq.${slug}`);
    } else {
      query = query.or(`id.eq.${id},slug.eq.${id}`);
    }
    const { error } = await query;
    if (error) {
      console.warn("[Supabase Postgres] Blog post delete warning:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function syncHomepageBlockToSupabase(block: DbHomepageBlock): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: block.id,
      block_type: block.block_type,
      display_order: Number(block.display_order || 0),
      content: block.content || {},
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("homepage_blocks").upsert(payload);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function deleteHomepageBlockFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const { error } = await supabase.from("homepage_blocks").delete().eq("id", id);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function syncCustomerToSupabase(customer: DbCustomerUser): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const basePayload = {
      id: customer.id,
      phone_number: customer.phone_number,
      full_name: customer.full_name,
      email: customer.email || null,
      created_at: customer.created_at || new Date().toISOString(),
      updated_at: customer.updated_at || new Date().toISOString(),
      last_login_at: customer.last_login_at || null,
    };
    const fullPayload = {
      ...basePayload,
      preferred_pickup_point: customer.preferred_pickup_point || null,
    };
    const { error } = await supabase.from("customers").upsert(fullPayload);
    if (error) {
      if (error.code === "PGRST204" || error.message?.includes("preferred_pickup_point") || error.message?.includes("column")) {
        const fallbackRes = await supabase.from("customers").upsert(basePayload);
        if (fallbackRes.error) {
          console.warn("[Supabase Postgres] Customer upsert fallback warning:", fallbackRes.error.message);
          return false;
        }
        return true;
      }
      console.warn("[Supabase Postgres] Customer upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Customer upsert exception:", err?.message || err);
    return false;
  }
}

export async function syncCustomerActivityToSupabase(activity: DbCustomerActivity): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: activity.id,
      customer_id: activity.customer_id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      metadata: activity.metadata || {},
      created_at: activity.created_at || new Date().toISOString(),
    };
    const { error } = await supabase.from("customer_activities").upsert(payload);
    if (error) {
      console.warn("[Supabase Postgres] Customer activity upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Customer activity upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteCustomerFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    await supabase.from("bookings").update({ customer_id: null }).eq("customer_id", id);
    await supabase.from("customer_activities").delete().eq("customer_id", id);
    const { error } = await supabase.from("customers").delete().or(`id.eq.${id},phone_number.eq.${id}`);
    if (error) {
      console.warn("[Supabase Postgres] Customer delete warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Customer delete exception:", err?.message || err);
    return false;
  }
}

export async function syncBookingToSupabase(booking: DbBooking): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const b = booking as any;
    const selected_seats = Array.isArray(booking.selected_seats)
      ? booking.selected_seats.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean)
      : [];

    const travelers = Array.isArray(booking.travelers) && booking.travelers.length > 0
      ? booking.travelers
      : (selected_seats.length > 0
        ? selected_seats.map((seat, idx) => ({
            id: `trav-${booking.id}-${idx + 1}`,
            full_name: idx === 0 ? booking.customer_full_name : `Traveler ${idx + 1}`,
            seat_number: seat,
            is_lead_traveler: idx === 0,
          }))
        : [{ id: `trav-${booking.id}-1`, full_name: booking.customer_full_name, is_lead_traveler: true }]);

    // Keep special_requests clean - NEVER inject [Seats: ...] strings!
    const cleanSpecialRequests = (booking.special_requests || "")
      .replace(/\[\s*Seats\s*:[^\]]*\]?/gi, "")
      .trim();

    const payload = {
      id: booking.id,
      reference: booking.reference || null,
      tour_id: booking.tour_id,
      tour_title: booking.tour_title,
      tour_slug: booking.tour_slug,
      departure_date: booking.departure_date ? booking.departure_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      traveler_count: Number(booking.traveler_count || (selected_seats.length > 0 ? selected_seats.length : 1)),
      selected_seats: selected_seats,
      travelers: travelers,
      customer_name: booking.customer_full_name,
      customer_email: booking.customer_email || "guest@example.com",
      customer_phone: booking.customer_phone_number || "+8801700000000",
      customer_id: booking.customer_id || b.customer_id || null,
      pickup_point: booking.pickup_point || b.pickup_point || null,
      special_requests: cleanSpecialRequests || null,
      promo_code: booking.promo_code || null,
      discount_amount: booking.discount_amount ? Number(booking.discount_amount) : 0,
      total_price: Number(booking.total_price || 0),
      advance_amount: Number(booking.advance_amount || 0),
      amount_paid: Number(booking.amount_paid || 0),
      due_on_tour_day: Number(booking.amount_due || 0),
      status: booking.status || "pending_payment",
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from("bookings").upsert(payload, { onConflict: "id" });
    if (error && (error.code === "23503" || error.message?.includes("customer_id") || error.message?.includes("foreign key"))) {
      const retry = await supabase.from("bookings").upsert({ ...payload, customer_id: null }, { onConflict: "id" });
      if (!retry.error) return true;
      error = retry.error;
    }

    if (error) {
      console.warn("[Supabase Postgres] Booking upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Booking upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteBookingFromSupabase(bookingId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    await supabase.from("payments").delete().eq("booking_id", bookingId);
    await supabase.from("clearance_tickets").delete().eq("booking_id", bookingId);
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (error) {
      console.warn("[Supabase Postgres] Booking delete warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Booking delete exception:", err?.message || err);
    return false;
  }
}

export async function deletePaymentFromSupabase(paymentId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const { error } = await supabase.from("payments").delete().eq("id", paymentId);
    if (error) {
      console.warn("[Supabase Postgres] Payment delete warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Payment delete exception:", err?.message || err);
    return false;
  }
}

export async function syncPaymentToSupabase(payment: DbPayment): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const p = payment as any;
    const payload = {
      id: payment.id,
      booking_id: payment.booking_id,
      transaction_id: payment.tran_id || p.transaction_id || `TRAN-${payment.id}`,
      payment_method: payment.payment_method || "Bkash payment",
      payment_type: payment.payment_type || "advance",
      amount: Number(payment.amount || 0),
      status: payment.status || "initiated",
      raw_payload: p.gateway_response || (p.val_id ? { val_id: p.val_id } : null) || {},
    };
    const { error } = await supabase.from("payments").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("[Supabase Postgres] Payment upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Payment upsert exception:", err?.message || err);
    return false;
  }
}

export async function syncClearanceTicketToSupabase(ticket: DbClearanceTicket): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const t = ticket as any;
    const payload = {
      id: ticket.id,
      booking_id: ticket.booking_id,
      signed_token: ticket.token || t.signed_token || "",
      is_verified: Boolean(ticket.is_cleared || t.is_verified),
      verified_at: t.cleared_at || t.verified_at || null,
      verified_by: t.cleared_by || t.verified_by || null,
      cleared_by_host: t.cleared_by_host || null,
      created_at: ticket.created_at || new Date().toISOString(),
    };
    const { error } = await supabase.from("clearance_tickets").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("[Supabase Postgres] Clearance ticket upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Clearance ticket upsert exception:", err?.message || err);
    return false;
  }
}

export async function syncAlertToSupabase(alert: DbAlert): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: alert.id,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      is_acknowledged: Boolean(alert.is_acknowledged),
      created_at: alert.created_at || new Date().toISOString(),
    };
    const { error } = await supabase.from("operational_alerts").upsert(payload, { onConflict: "id" });
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function syncContactInquiryToSupabase(inquiry: DbContactInquiry): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const payload = {
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone || null,
      subject: inquiry.destination ? `Inquiry for ${inquiry.destination}` : "General Inquiry",
      message: inquiry.message,
      status: inquiry.status || "new",
      admin_notes: inquiry.admin_notes || null,
      created_at: inquiry.created_at || new Date().toISOString(),
    };
    const { error } = await supabase.from("contact_inquiries").upsert(payload, { onConflict: "id" });
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function deleteInquiryFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  try {
    const { error } = await supabase.from("contact_inquiries").delete().eq("id", id);
    if (error) {
      console.warn("[Supabase Postgres] Contact inquiry delete warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Postgres] Contact inquiry delete exception:", err?.message || err);
    return false;
  }
}

/**
 * Reads EVERY row of a table. PostgREST silently caps a single request at 1,000 rows, so a plain
 * `.select("*")` quietly truncated bookings / customers / activities once they grew past that, and
 * the truncated copy then replaced the in-memory database.
 */
async function selectAllRows(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  table: string,
  orderColumn?: string,
  ascending: boolean = true
): Promise<{ data: any[] | null; error: { message: string } | null }> {
  const pageSize = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select("*");
    if (orderColumn) query = query.order(orderColumn, { ascending });
    // Stable tiebreaker so rows are never skipped or duplicated between pages.
    query = query.order("id", { ascending: true });
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return { data: rows, error: null };
}

// =============================================================================
// Full PostgreSQL Hydration from Supabase
// =============================================================================

export async function fetchDatabaseFromSupabase(): Promise<DatabaseSchema | null> {
  const supabase = getSupabaseAdminClient();
  try {
    const [
      destsRes,
      toursRes,
      offersRes,
      testsRes,
      blogsRes,
      blocksRes,
      staffRes,
      custsRes,
      bookingsRes,
      actsRes,
      paymentsRes,
      inqsRes,
      ticketsRes,
      alertsRes,
    ] = await Promise.all([
      selectAllRows(supabase, "destinations", "name"),
      selectAllRows(supabase, "tours", "title"),
      selectAllRows(supabase, "offers"),
      selectAllRows(supabase, "testimonials"),
      selectAllRows(supabase, "blog_posts"),
      selectAllRows(supabase, "homepage_blocks", "display_order"),
      selectAllRows(supabase, "staff_users"),
      selectAllRows(supabase, "customers"),
      selectAllRows(supabase, "bookings", "created_at", false),
      selectAllRows(supabase, "customer_activities", "created_at", false),
      selectAllRows(supabase, "payments", "created_at", false),
      selectAllRows(supabase, "contact_inquiries", "created_at", false),
      selectAllRows(supabase, "clearance_tickets", "created_at", false),
      selectAllRows(supabase, "operational_alerts", "created_at", false),
    ]);

    let destsData = destsRes.data;
    let toursData = toursRes.data;
    let offersData = offersRes.data;
    let blocksData = blocksRes.data;

    if (destsRes.error && toursRes.error) {
      // Fallback: try reading catalog tables via browser/publishable client before giving up
      try {
        const fallbackClient = getSupabaseBrowserClient();
        const [fDests, fTours, fOffers, fBlocks] = await Promise.all([
          selectAllRows(fallbackClient, "destinations", "name"),
          selectAllRows(fallbackClient, "tours", "title"),
          selectAllRows(fallbackClient, "offers"),
          selectAllRows(fallbackClient, "homepage_blocks", "display_order"),
        ]);
        if (!fDests.error || !fTours.error) {
          destsData = fDests.data ?? destsData;
          toursData = fTours.data ?? toursData;
          offersData = fOffers.data ?? offersData;
          blocksData = fBlocks.data ?? blocksData;
        }
      } catch {}
    }

    if (!destsData?.length && !toursData?.length) {
      // Fallback to storage bucket snapshot if tables are inaccessible
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(DB_OBJECT_PATH);
      if (error || !data) return null;
      const text = await data.text();
      return JSON.parse(text) as DatabaseSchema;
    }

    const mappedDestinations: DbDestination[] = (destsData || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      division: d.division,
      tagline: d.tagline || "",
      description: d.description || "",
      best_time_to_visit: d.best_time_to_visit || "October to March",
      weather_notes: d.weather_notes || "",
      popular_attractions: Array.isArray(d.popular_attractions) ? d.popular_attractions : [],
      recommended_accommodation: d.recommended_accommodation || "",
      travel_tips: d.travel_tips || "",
      permits_required: d.permits_required || "None",
      cover_image: d.cover_image,
      cover_video_url: d.cover_video_url,
      seo_title: d.seo_title,
      seo_description: d.seo_description,
      gallery: Array.isArray(d.gallery) ? d.gallery : [],
      is_featured: Boolean(d.is_featured),
      status: d.status || "published",
    }));

    const mappedTours: DbTour[] = (toursData || []).map((t: any) => {
      const tourTotalSeats = Number(t.total_seats) || (Array.isArray(t.departures) && Number(t.departures[0]?.total_seats)) || 40;
      const departures = Array.isArray(t.departures)
        ? t.departures.map((d: any) => {
            const depTotalSeats = Number(t.total_seats || d.total_seats || tourTotalSeats);
            const booked = Array.isArray(d.booked_seats) ? d.booked_seats : [];
            const remaining = d.seats_remaining !== undefined && d.seats_remaining !== null
              ? Math.min(depTotalSeats, Number(d.seats_remaining))
              : Math.max(0, depTotalSeats - booked.length);
            return {
              id: d.id || `dep-${d.departure_date}`,
              departure_date: d.departure_date,
              total_seats: depTotalSeats,
              seats_remaining: remaining,
              booked_seats: booked,
              is_active: d.is_active !== false,
            };
          })
        : [];
      const totalSeats = tourTotalSeats;

      return {
        id: t.id,
        title: t.title,
        slug: t.slug,
        destination_slug: t.destination_slug,
        destination_name: t.destination_slug ? t.destination_slug.charAt(0).toUpperCase() + t.destination_slug.slice(1) : "Bangladesh",
        category: t.category,
        short_description: t.overview || "",
        full_description: t.overview || "",
        hero_image: t.hero_image,
        duration_days: Number(t.duration_days || 1),
        duration_nights: Number(t.duration_nights || 0),
        base_price: String(t.starting_price || 0),
        discount_type: Number(t.discount) > 0 ? "flat" : "none",
        discount_value: String(t.discount || 0),
        final_price: String(Math.max(0, Number(t.starting_price || 0) - Number(t.discount || 0))),
        allow_partial_payment: true,
        advance_payment_percent: String(t.advance_percent || 40),
        advance_amount: String(t.advance_amount || Math.round((Number(t.starting_price || 0) * 40) / 100)),
        inclusions: Array.isArray(t.inclusions) ? t.inclusions : [],
        exclusions: Array.isArray(t.exclusions) ? t.exclusions : [],
        accommodation_notes: "Standard hotel / resort",
        transportation_notes: "AC Bus / Private Jeep",
        meals_notes: "Breakfast included",
        meeting_point: t.meeting_point || "Dhaka Sayedabad / Fakirapool",
        pickup_points: Array.isArray(t.pickup_points) ? t.pickup_points : [],
        departure_schedule: t.departure_schedule || "Every Friday 7:00 AM",
        total_seats: totalSeats,
        itinerary: Array.isArray(t.itinerary) ? t.itinerary : [],
        departures,
        faqs: Array.isArray(t.faqs) ? t.faqs : [],
        gallery: Array.isArray(t.gallery) ? t.gallery : [],
        is_featured: Boolean(t.is_featured),
        status: t.status || "published",
      };
    });

    const mappedOffers: DbOffer[] = (offersData || []).map((o: any) => ({
      id: o.id,
      title: o.title,
      code: o.code || "PROMO",
      slug: (o.code || o.title).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: o.tagline || "",
      discount_type: o.discount_type === "percentage" ? "percent" : "flat",
      discount_value: String(o.discount_value || 0),
      minimum_spend: String(o.minimum_spend || 0),
      valid_from: o.valid_from || new Date().toISOString().slice(0, 10),
      valid_until: o.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      banner_image: o.image_url || null,
      tour_id: o.tour_id || null,
      tour_title: o.tour_title || null,
      tour_slug: o.tour_slug || null,
      is_active: o.is_active !== undefined ? Boolean(o.is_active) : true,
    }));

    const mappedTestimonials: DbTestimonial[] = (testsRes.data || []).map((t: any) => ({
      id: t.id,
      author_name: t.author_name,
      customer_name: t.author_name,
      trip_name: t.trip_name,
      tour_title: t.trip_name,
      author_location: t.author_location || "Bangladesh",
      rating: Number(t.rating || 5),
      quote: t.quote,
      author_avatar: t.author_avatar || null,
      customer_photo: t.author_avatar || null,
      is_featured: Boolean(t.is_featured),
    }));

    const mappedBlogs: DbBlogPost[] = (blogsRes.data || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt || "",
      body: b.content || "",
      content: b.content || "",
      author_name: b.author || "Savar Tour Lover Editorial",
      author: b.author || "Savar Tour Lover Editorial",
      cover_image: b.hero_image || null,
      hero_image: b.hero_image || null,
      read_time_minutes: Number(b.read_time_minutes || 5),
      tags: Array.isArray(b.tags) ? b.tags : [],
      published_at: b.created_at || new Date().toISOString(),
      created_at: b.created_at,
      status: b.is_published ? "published" : "draft",
      is_published: Boolean(b.is_published),
      category: { name: "Travel Guide" },
    }));

    // Ensure super_admin password hash is valid
    const adminSalt = "8e4c1ce665ceb8419ff57a1aefb13252";
    const adminHash = "8e5067117177fb5bc6056d3d76ea336f31779c1d21e6aa416cc7b1b0a8e0b4eb7a67a80908c62751951736809a3d2f81f7762e9e6fc203d7715fe126786193d2";
    const mappedStaff = (staffRes.data && staffRes.data.length > 0)
      ? staffRes.data.map((s: any) => ({
          id: s.id,
          username: s.username,
          password_hash: s.password_hash === "REPLACE_WITH_REAL_HASH" ? adminHash : s.password_hash,
          salt: s.salt === "REPLACE_WITH_REAL_SALT" ? adminSalt : s.salt,
          role: s.role === "admin" ? "super_admin" : (s.role || "super_admin"),
          phone_number: s.phone_number || "+8801929582426",
          email: s.email || "savartourlover@gmail.com",
          first_name: s.first_name || "Savar",
          last_name: s.last_name || "Admin",
        }))
      : [
          {
            id: "staff_admin_01",
            username: "admin",
            password_hash: adminHash,
            salt: adminSalt,
            role: "super_admin" as const,
            phone_number: "+8801929582426",
            email: "savartourlover@gmail.com",
            first_name: "Savar",
            last_name: "Admin",
          },
        ];

    const activitiesByCustomer = new Map<string, DbCustomerActivity[]>();
    for (const act of (actsRes.data || [])) {
      if (!act.customer_id) continue;
      const list = activitiesByCustomer.get(act.customer_id) || [];
      list.push({
        id: act.id,
        customer_id: act.customer_id,
        type: act.type,
        title: act.title,
        description: act.description,
        metadata: typeof act.metadata === "object" && act.metadata !== null ? act.metadata : {},
        created_at: act.created_at || new Date().toISOString(),
      });
      activitiesByCustomer.set(act.customer_id, list);
    }

    const mappedCustomers: DbCustomerUser[] = (custsRes.data || []).map((c: any) => ({
      id: c.id,
      phone_number: c.phone_number,
      full_name: c.full_name,
      email: c.email || undefined,
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString(),
      last_login_at: c.last_login_at || undefined,
      activities: activitiesByCustomer.get(c.id) || [],
    }));

    // Map payments from Postgres table first so bookings can link to them
    const mappedPayments: DbPayment[] = (paymentsRes.data || []).map((p: any) => ({
      id: p.id,
      booking_id: p.booking_id,
      amount: String(p.amount || "0"),
      payment_type: p.payment_type || "advance",
      payment_method: p.payment_method || "Bkash payment",
      status: p.status || "pending",
      tran_id: p.transaction_id || p.tran_id || `TRAN-${p.id}`,
      val_id: p.raw_payload?.val_id || p.val_id || undefined,
      card_type: p.card_type || undefined,
      created_at: p.created_at || new Date().toISOString(),
      paid_at: p.paid_at || undefined,
    }));

    const mappedBookings: DbBooking[] = (bookingsRes.data || []).map((b: any) => {
      let selected_seats: string[] = [];
      if (Array.isArray(b.selected_seats) && b.selected_seats.length > 0) {
        selected_seats = b.selected_seats.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean);
      } else if (typeof b.selected_seats === "string" && b.selected_seats.trim()) {
        try {
          const parsed = JSON.parse(b.selected_seats);
          if (Array.isArray(parsed)) {
            selected_seats = parsed.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean);
          }
        } catch {
          const cleaned = b.selected_seats.replace(/^\{|\}$/g, "");
          selected_seats = cleaned.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        }
      } else if (b.pickup_point && typeof b.pickup_point === "string" && b.pickup_point.includes("Seats: ")) {
        const match = b.pickup_point.match(/Seats:\s*([A-Za-z0-9,\s]+)/);
        if (match) {
          selected_seats = match[1].split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        }
      } else if (b.special_requests && typeof b.special_requests === "string" && b.special_requests.includes("[Seats: ")) {
        const match = b.special_requests.match(/\[Seats:\s*([A-Za-z0-9,\s]+)\]/);
        if (match) {
          selected_seats = match[1].split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        }
      }

      const travelers = (Array.isArray(b.travelers) && b.travelers.length > 0)
        ? b.travelers
        : (selected_seats.length > 0
          ? selected_seats.map((seat, idx) => ({
              id: `trav-${b.id}-${idx + 1}`,
              full_name: idx === 0 ? b.customer_name : `Traveler ${idx + 1}`,
              seat_number: seat,
              is_lead_traveler: idx === 0,
            }))
          : [{ id: `trav-${b.id}-1`, full_name: b.customer_name, is_lead_traveler: true }]);

      // Promo code extraction from direct columns or special_requests fallback
      let promo_code = b.promo_code || undefined;
      let discount_amount = b.discount_amount !== undefined && b.discount_amount !== null ? String(b.discount_amount) : undefined;
      if (!promo_code && b.special_requests && typeof b.special_requests === "string" && b.special_requests.includes("[Promo: ")) {
        const promoMatch = b.special_requests.match(/\[Promo:\s*([A-Za-z0-9_\-]+)\s*\(-৳?([0-9,.]+)\)\]/);
        if (promoMatch) {
          promo_code = promoMatch[1].trim();
          discount_amount = discount_amount || promoMatch[2].trim().replace(/,/g, "");
        }
      }

      // Link payment methods from mapped payments
      const bookingPayments = mappedPayments.filter((p) => p.booking_id === b.id);
      const advancePayment = bookingPayments.find((p) => p.payment_type === "advance" || p.payment_type === "full");
      const duePayment = bookingPayments.find((p) => p.payment_type === "final" || p.payment_type === "due");

      const advance_payment_method = advancePayment?.payment_method ||
        (b.advance_payment_method ? b.advance_payment_method : undefined) ||
        (b.payment_method === "cash_on_hand" || b.payment_method === "cash" ? "cash_on_hand" : undefined) ||
        (b.special_requests?.includes("Pay Cash by Hand") || b.special_requests?.includes("Cash on Hand") ? "cash_on_hand" : "Bkash payment");

      const due_payment_method = duePayment?.payment_method ||
        (b.due_payment_method ? b.due_payment_method : undefined) ||
        (b.special_requests?.includes("Due Cash") || b.special_requests?.includes("Due: Cash") ? "cash_on_hand" : undefined);

      return {
        id: b.id,
        reference: b.reference || (b.id ? `STL-${b.id.slice(-6).toUpperCase()}` : `STL-${Date.now().toString().slice(-6)}`),
        tour_id: b.tour_id,
        tour_title: b.tour_title,
        tour_slug: b.tour_slug,
        destination_slug: b.destination_slug || b.tour_slug || "bangladesh",
        departure_date: b.departure_date,
        traveler_count: Number(b.traveler_count || (selected_seats.length > 0 ? selected_seats.length : 1)),
        selected_seats,
        unit_price: String(b.unit_price || Math.round(Number(b.total_price || 0) / Math.max(1, Number(b.traveler_count || 1)))),
        total_price: String(b.total_price || 0),
        final_price: String(b.total_price || 0),
        promo_code,
        discount_amount,
        payment_plan: Number(b.due_on_tour_day || 0) > 0 ? "partial" : "full",
        advance_required_percent: "40",
        advance_amount: String(b.advance_amount || 0),
        amount_paid: String(b.amount_paid || 0),
        amount_due: String(b.due_on_tour_day || 0),
        due_date: b.departure_date || new Date().toISOString().slice(0, 10),
        status: b.status || "pending_payment",
        payment_method: advance_payment_method || b.payment_method || "Bkash payment",
        advance_payment_method,
        due_payment_method,
        cash_approval_expires_at: b.cash_approval_expires_at || undefined,
        cash_approved_by: b.cash_approved_by || undefined,
        cash_approved_at: b.cash_approved_at || undefined,
        due_cash_approval_expires_at: b.due_cash_approval_expires_at || undefined,
        due_cash_approved_by: b.due_cash_approved_by || undefined,
        due_cash_approved_at: b.due_cash_approved_at || undefined,
        customer_id: b.customer_id || undefined,
        customer_full_name: b.customer_name,
        customer_phone_number: b.customer_phone,
        customer_email: b.customer_email || "",
        pickup_point: b.pickup_point || undefined,
        special_requests: (b.special_requests || "").replace(/\[\s*Seats\s*:[^\]]*\]?/gi, "").trim(),
        travelers,
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      };
    });

    // Map contact inquiries from Postgres table if present
    const mappedInquiries: DbContactInquiry[] = (inqsRes.data || []).map((i: any) => ({
      id: i.id,
      name: i.name || "Traveler",
      email: i.email || "",
      phone: i.phone || "",
      destination: i.destination || "",
      dates: i.dates || "",
      trip_type: i.trip_type || "",
      travelers: Number(i.travelers || 1),
      message: i.message || "",
      status: i.status || "new",
      admin_notes: i.admin_notes || undefined,
      created_at: i.created_at || new Date().toISOString(),
    }));

    // Map clearance tickets from Postgres table
    const mappedClearanceTickets: DbClearanceTicket[] = (ticketsRes.data || []).map((t: any) => ({
      id: t.id,
      booking_id: t.booking_id,
      token: t.signed_token || t.token || "",
      token_expires_at: t.token_expires_at || new Date(Date.now() + 30 * 86400000).toISOString(),
      is_cleared: Boolean(t.is_verified || t.is_cleared),
      cleared_at: t.verified_at || t.cleared_at || undefined,
      cleared_by_staff_id: t.cleared_by_host || t.verified_by || t.cleared_by_staff_id || undefined,
      clearance_method: t.clearance_method || (t.is_verified ? "host_verification" : undefined),
      created_at: t.created_at || new Date().toISOString(),
    }));

    // Map operational alerts from Postgres table
    const mappedAlerts: DbAlert[] = (alertsRes.data || []).map((a: any) => ({
      id: a.id,
      alert_type: a.alert_type || "general",
      severity: (a.severity === "warning" || a.severity === "critical") ? a.severity : "info",
      message: a.message || "",
      is_acknowledged: Boolean(a.is_acknowledged),
      created_at: a.created_at || new Date().toISOString(),
    }));

    // Hydrate collections from the storage snapshot mirror
    let snapshotData: Partial<DatabaseSchema> = {};
    try {
      const { data: storageData, error: storageErr } = await supabase.storage.from(BUCKET_NAME).download(DB_OBJECT_PATH);
      if (!storageErr && storageData) {
        const text = await storageData.text();
        snapshotData = JSON.parse(text) as Partial<DatabaseSchema>;
      }
    } catch {}

    const tableBlocks: DbHomepageBlock[] = blocksData || [];
    const tableBlockIds = new Set(tableBlocks.map((b) => b.id));
    const mergedHomepageBlocks = [...tableBlocks];
    for (const sb of snapshotData.homepageBlocks || []) {
      if (!tableBlockIds.has(sb.id)) {
        mergedHomepageBlocks.push(sb);
      }
    }

    // Merge payments: table rows take precedence, supplemented by snapshot payments
    const paymentIds = new Set(mappedPayments.map((p) => p.id));
    const mergedPayments = [...mappedPayments];
    for (const sp of snapshotData.payments || []) {
      if (!paymentIds.has(sp.id)) {
        mergedPayments.push(sp);
      }
    }

    // Merge clearance tickets: table rows take precedence, supplemented by snapshot tickets
    const ticketIds = new Set(mappedClearanceTickets.map((t) => t.id));
    const mergedTickets = [...mappedClearanceTickets];
    for (const st of snapshotData.clearanceTickets || []) {
      if (!ticketIds.has(st.id)) {
        mergedTickets.push(st);
      }
    }

    // Merge alerts: table rows take precedence, supplemented by snapshot alerts
    const alertIds = new Set(mappedAlerts.map((a) => a.id));
    const mergedAlerts = [...mappedAlerts];
    for (const sa of snapshotData.alerts || []) {
      if (!alertIds.has(sa.id)) {
        mergedAlerts.push(sa);
      }
    }

    // Inquiries: table rows if available, otherwise snapshot
    const inquiryIds = new Set(mappedInquiries.map((i) => i.id));
    const mergedInquiries = [...mappedInquiries];
    for (const si of snapshotData.contactInquiries || []) {
      if (!inquiryIds.has(si.id)) {
        mergedInquiries.push(si);
      }
    }

    // Tour categories: extract from homepage_blocks block-tour-categories or snapshotData
    const categoriesBlock = (blocksData || []).find((b: any) => b.id === "block-tour-categories");
    let mappedTourCategories: DbTourCategory[] = [];
    if (categoriesBlock && categoriesBlock.content && Array.isArray((categoriesBlock.content as any).categories)) {
      mappedTourCategories = (categoriesBlock.content as any).categories;
    } else if (Array.isArray(snapshotData.tourCategories) && snapshotData.tourCategories.length > 0) {
      mappedTourCategories = snapshotData.tourCategories;
    } else {
      mappedTourCategories = DEFAULT_TOUR_CATEGORIES;
    }

    const result: DatabaseSchema = {
      destinations: mappedDestinations,
      tours: mappedTours,
      tourCategories: mappedTourCategories,
      offers: mappedOffers,
      testimonials: mappedTestimonials,
      blogPosts: mappedBlogs,
      homepageBlocks: mergedHomepageBlocks,
      staffUsers: mappedStaff,
      customers: mappedCustomers,
      bookings: mappedBookings,
      payments: mergedPayments,
      clearanceTickets: mergedTickets,
      alerts: mergedAlerts,
      expenses: Array.isArray(snapshotData.expenses) ? snapshotData.expenses : [],
      suppliers: Array.isArray(snapshotData.suppliers) ? snapshotData.suppliers : [],
      contactInquiries: mergedInquiries,
      analyticsEvents: Array.isArray(snapshotData.analyticsEvents) ? snapshotData.analyticsEvents : [],
    };

    lastSyncTimestamp = new Date().toISOString();
    lastSyncStatus = "success";
    lastSyncError = null;
    return result;
  } catch (err: any) {
    console.warn("[Supabase Sync] Exception fetching database:", err?.message || err);
    return null;
  }
}

/**
 * Backup the in-memory/local JSON database snapshot up to Supabase Cloud Storage
 */
export async function syncDatabaseToSupabase(data: DatabaseSchema): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  lastSyncStatus = "syncing";
  try {
    const raw = JSON.stringify(data, null, 2);
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(DB_OBJECT_PATH, raw, {
      contentType: "application/json",
      upsert: true,
      cacheControl: "300",
    });
    if (error) {
      console.error("[Supabase Storage] Upload error:", error.message);
      lastSyncStatus = "error";
      lastSyncError = error.message;
      return false;
    }
    lastSyncTimestamp = new Date().toISOString();
    lastSyncStatus = "success";
    lastSyncError = null;
    return true;
  } catch (err: any) {
    console.error("[Supabase Storage] Exception during cloud sync:", err?.message || err);
    lastSyncStatus = "error";
    lastSyncError = err?.message || "Sync exception";
    return false;
  }
}

/**
 * Fetch the complete database snapshot directly from Supabase Storage bucket mirror.
 * This reads from CDN/Storage, offloading PostgreSQL entirely for read-heavy operations.
 */
export async function fetchDatabaseFromStorageBucket(): Promise<DatabaseSchema | null> {
  const supabase = getSupabaseAdminClient();
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(DB_OBJECT_PATH);
    if (error || !data) {
      return null;
    }
    const text = await data.text();
    const parsed = JSON.parse(text) as DatabaseSchema;
    return parsed;
  } catch (err: any) {
    console.warn("[Supabase Storage Mirror] Exception downloading snapshot:", err?.message || err);
    return null;
  }
}

/**
 * Remotely invoke the Supabase Edge Function 'sync-db-snapshot' to regenerate the bucket mirror,
 * or fallback to local snapshot generation if the edge function is unreachable.
 */
export async function invokeCloudSnapshotSync(): Promise<{
  success: boolean;
  source: "edge-function" | "app-fallback";
  details?: any;
  error?: string;
}> {
  const supabase = getSupabaseAdminClient();
  try {
    const { data, error } = await supabase.functions.invoke("sync-db-snapshot", {
      body: { trigger: "admin_manual_invocation", timestamp: new Date().toISOString() },
    });

    if (!error && data?.success) {
      lastSyncTimestamp = new Date().toISOString();
      lastSyncStatus = "success";
      return { success: true, source: "edge-function", details: data };
    }
  } catch (edgeErr: any) {
    console.warn("[Supabase Edge Function] Direct invocation unavailable, falling back:", edgeErr?.message || edgeErr);
  }

  // Fallback: compile from PostgreSQL via fetchDatabaseFromSupabase and upload to bucket
  try {
    const cloudDb = await fetchDatabaseFromSupabase();
    if (cloudDb) {
      const ok = await syncDatabaseToSupabase(cloudDb);
      return {
        success: ok,
        source: "app-fallback",
        details: { destinations: cloudDb.destinations.length, tours: cloudDb.tours.length },
      };
    }
    return { success: false, source: "app-fallback", error: "Failed to fetch PostgreSQL tables" };
  } catch (err: any) {
    return { success: false, source: "app-fallback", error: err?.message || "Sync failed" };
  }
}

/**
 * Check Supabase connectivity, table availability, and sync status
 */
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  projectUrl: string;
  bucket: string;
  bucketMirrorAvailable: boolean;
  lastSync: string | null;
  status: "idle" | "syncing" | "success" | "error";
  error: string | null;
}> {
  const supabase = getSupabaseAdminClient();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tuvgeaflyxbldpmpafdk.supabase.co";
  try {
    const [tableRes, bucketRes] = await Promise.all([
      supabase.from("destinations").select("id").limit(1),
      supabase.storage.from(BUCKET_NAME).list("", { limit: 1, search: DB_OBJECT_PATH }),
    ]);

    const connected = !tableRes.error && !!tableRes.data;
    const bucketMirrorAvailable = !bucketRes.error && Array.isArray(bucketRes.data) && bucketRes.data.length > 0;

    return {
      connected,
      projectUrl: url,
      bucket: BUCKET_NAME,
      bucketMirrorAvailable,
      lastSync: lastSyncTimestamp,
      status: connected ? "success" : "error",
      error: tableRes.error ? tableRes.error.message : null,
    };
  } catch (err: any) {
    return {
      connected: false,
      projectUrl: url,
      bucket: BUCKET_NAME,
      bucketMirrorAvailable: false,
      lastSync: lastSyncTimestamp,
      status: "error",
      error: err?.message || "Connection failed",
    };
  }
}

