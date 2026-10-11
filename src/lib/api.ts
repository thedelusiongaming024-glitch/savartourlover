import type { Destination, Faq, HomepageBlock, HomepageBlockType, ItineraryDay, JournalPost, Offer, Review, Scene, Tour } from "@/lib/types";
import { scenes } from "@/lib/scenes";
import { normalizeImageUrl, normalizeVideoUrl } from "@/lib/media";
import * as db from "@/server/db";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(path: string, revalidateSeconds: number = 0): Promise<T | null> {
  try {
    if (!API_BASE.startsWith("http://") && !API_BASE.startsWith("https://")) {
      return null;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const SCENE_KEYS = Object.keys(scenes) as Array<keyof typeof scenes>;
function sceneForSlug(slug: string, label: string, imageUrl?: string | null, videoUrl?: string | null): Scene {
  const normalized = (slug || "").replace(/-/g, "");
  const match = SCENE_KEYS.find((key) => normalized.includes(key) || key.includes(normalized));
  const normImg = normalizeImageUrl(imageUrl);
  const normVid = normalizeVideoUrl(videoUrl);
  return {
    key: (match ?? "dhaka") as Scene["key"],
    label: label || "Destination",
    imageUrl: normImg || undefined,
    videoUrl: normVid.url || undefined,
  };
}

function divisionLabel(division?: string): string {
  if (!division) return "Bangladesh";
  return `${division.charAt(0).toUpperCase()}${division.slice(1)} Division`;
}

function adaptDestination(d: any, tourSlugs: string[] = []): Destination {
  const name = d.name || "Destination";
  const slug = d.slug || "destination";
  const desc = d.description || "";
  const coverImg = d.cover_image || null;
  const coverVideo = d.cover_video_url || null;

  return {
    slug,
    name,
    bn: d.bn || "",
    tagline: d.tagline || d.seo_description || (desc ? desc.slice(0, 90) : ""),
    region: divisionLabel(d.division),
    description: desc,
    cover: sceneForSlug(slug, name, coverImg, coverVideo),
    gallery: Array.isArray(d.gallery) && d.gallery.length > 0
      ? d.gallery.map((g: any) => sceneForSlug(slug, g.caption || name, g.image || g.imageUrl))
      : [sceneForSlug(slug, name, coverImg, coverVideo)],
    bestTime: d.best_time_to_visit || "All year round",
    weather: d.weather_notes || "Pleasant tropical climate",
    attractions: Array.isArray(d.popular_attractions)
      ? d.popular_attractions
      : typeof d.popular_attractions === "string"
      ? d.popular_attractions.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
    accommodation: d.recommended_accommodation || "Local boutique resorts and hotels",
    travelTips: Array.isArray(d.travel_tips)
      ? d.travel_tips
      : typeof d.travel_tips === "string"
      ? d.travel_tips.split("\n").map((s: string) => s.trim()).filter(Boolean)
      : [],
    tourSlugs,
  };
}

export async function fetchDestinations(): Promise<Destination[]> {
  try {
    await db.ensureDbHydrated();
    const list = db.getDestinations();
    return list.map((d) => {
      const tourSlugs = db.getTours(d.slug).map((t) => t.slug);
      return adaptDestination(d, tourSlugs);
    });
  } catch (err) {
    console.error("fetchDestinations error:", err);
    return [];
  }
}

export async function fetchDestination(slug: string): Promise<Destination | null> {
  try {
    await db.ensureDbHydrated();
    const d = db.getDestinationBySlug(slug);
    if (!d) return null;
    const tourSlugs = db.getTours(slug).map((t) => t.slug);
    return adaptDestination(d, tourSlugs);
  } catch (err) {
    console.error("fetchDestination error:", err);
    return null;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  group_tour: "Group Tour",
  "group-tour": "Group Tour",
  private: "Private Tour",
  private_tour: "Private Tour",
  family: "Family Tour",
  family_tour: "Family Tour",
  honeymoon: "Honeymoon Package",
  honeymoon_package: "Honeymoon Package",
  corporate: "Corporate Retreat",
  corporate_retreat: "Corporate Retreat",
  educational: "Educational Tour",
  educational_tour: "Educational Tour",
  adventure: "Adventure Tour",
  adventure_tour: "Adventure Tour",
  weekend: "Weekend Getaway",
  weekend_getaway: "Weekend Getaway",
  luxury: "Luxury Domestic Tour",
  luxury_domestic_tour: "Luxury Domestic Tour",
};

function slugifyFallback(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

import { DEFAULT_PICKUP_POINTS } from "@/lib/pickupPoints";
export { DEFAULT_PICKUP_POINTS };

function adaptTour(t: any): Tour {
  const slug = t.slug || `tour-${Date.now()}`;
  const title = t.title || "Untitled Tour";
  const basePrice = parseFloat(t.base_price || t.starting_price || "0") || 0;
  const finalPrice = parseFloat(t.final_price || t.base_price || t.starting_price || "0") || basePrice;
  const discount = Math.max(0, Math.round(basePrice - finalPrice));
  const durationDays = Number(t.duration_days) || 3;
  const durationNights = Number(t.duration_nights) || 2;
  const advancePercent = Number(t.advance_payment_percent || t.advance_percent) || 40;

  const itinerary: ItineraryDay[] = Array.isArray(t.itinerary)
    ? t.itinerary.map((d: any, i: number) => ({
        day: Number(d.day || d.day_number) || i + 1,
        title: d.title || `Day ${i + 1}`,
        description: d.description || "",
      }))
    : [];

  const faqs: Faq[] = Array.isArray(t.faqs)
    ? t.faqs.map((f: any) => ({ question: f.question || "", answer: f.answer || "" }))
    : [];

  const tourTotalSeats = Number(t.total_seats) || (Array.isArray(t.departures) && Number(t.departures[0]?.total_seats)) || 40;

  const departures = Array.isArray(t.departures)
    ? t.departures
        .filter((d: any) => d.is_active !== false)
        .map((d: any) => {
          const depTotalSeats = Number(t.total_seats || d.total_seats || tourTotalSeats);
          const booked = Array.isArray(d.booked_seats) ? d.booked_seats : [];
          const remaining = d.seats_remaining !== undefined && d.seats_remaining !== null
            ? Math.min(depTotalSeats, Number(d.seats_remaining))
            : Math.max(0, depTotalSeats - booked.length);
          return {
            id: d.id || `dep-${d.departure_date}`,
            date: d.departure_date || "",
            seatsRemaining: remaining,
            totalSeats: depTotalSeats,
            bookedSeats: booked,
          };
        })
    : [];

  const inclusions = Array.isArray(t.inclusions)
    ? t.inclusions
    : typeof t.inclusions === "string"
    ? t.inclusions.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const exclusions = Array.isArray(t.exclusions)
    ? t.exclusions
    : typeof t.exclusions === "string"
    ? t.exclusions.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const destSlug =
    t.destination_slug ||
    (typeof t.destination === "string" ? t.destination : t.destination?.slug) ||
    (t.destination_name ? slugifyFallback(t.destination_name) : "bangladesh");

  return {
    id: t.id || slug,
    slug,
    title,
    destinationSlug: destSlug,
    duration: `${durationDays} Day${durationDays === 1 ? "" : "s"} / ${durationNights} Night${durationNights === 1 ? "" : "s"}`,
    startingPrice: Math.round(basePrice),
    discount,
    advancePercent,
    allowPartialPayment: t.allow_partial_payment !== false,
    category: CATEGORY_LABELS[t.category] ?? t.category ?? "Group Tour",
    summary: t.short_description || t.overview || t.description || "",
    description: t.full_description || t.overview || t.short_description || "",
    cover: sceneForSlug(slug, title, t.hero_image),
    gallery: Array.isArray(t.gallery) && t.gallery.length > 0
      ? t.gallery.map((g: any) => sceneForSlug(slug, g.title || g.caption || title, g.image || g.imageUrl))
      : [sceneForSlug(slug, title, t.hero_image)],
    galleryItems: Array.isArray(t.gallery)
      ? t.gallery.map((g: any, idx: number) => {
          const img = normalizeImageUrl(g.image || g.imageUrl || "");
          const itemTitle = g.title || g.caption || `${title} - View ${idx + 1}`;
          return {
            id: g.id || `g-${idx}`,
            imageUrl: img,
            image: img,
            title: itemTitle,
            caption: g.caption || itemTitle,
            location: g.location || t.destination_name || "",
            price: g.price !== undefined && g.price !== "" ? String(g.price) : "",
            badge: g.badge || (idx === 0 ? "Featured" : idx === 5 ? "Outbound" : "Inbound"),
            watermarkText: g.watermarkText || g.watermark_text || "",
            slot: g.slot || "",
            isFeatured: Boolean(g.isFeatured || g.badge === "Featured" || idx === 0),
          };
        })
      : [],
    itinerary,
    inclusions,
    exclusions,
    accommodation: t.accommodation_notes || "Verified standard hotel/resort",
    transportation: t.transportation_notes || "AC highway transport",
    meals: t.meals_notes || "All meals during tour included",
    capacity: tourTotalSeats,
    total_seats: tourTotalSeats,
    totalSeats: tourTotalSeats,
    departure: t.departure_schedule || "Every Friday",
    departures,
    meetingPoint: t.meeting_point || "Dhaka Sayedabad / Fakirapool",
    pickupPoints: Array.isArray(t.pickup_points) && t.pickup_points.length > 0
      ? t.pickup_points
      : DEFAULT_PICKUP_POINTS,
    faqs,
    featured: Boolean(t.is_featured),
  };
}

export async function fetchTours(): Promise<Tour[]> {
  try {
    await db.ensureDbHydrated();
    const list = db.getTours();
    return list.map(adaptTour);
  } catch (err) {
    console.error("fetchTours error:", err);
    return [];
  }
}

export async function fetchTour(slug: string): Promise<Tour | null> {
  try {
    await db.ensureDbHydrated();
    const t = db.getTourBySlug(slug);
    if (!t) return null;
    return adaptTour(t);
  } catch (err) {
    console.error("fetchTour error:", err);
    return null;
  }
}

export async function fetchOffers(): Promise<Offer[]> {
  try {
    await db.ensureDbHydrated();
    const list = db.getOffers();
    return list.map((o: any) => ({
      title: o.title || "Special Offer",
      description: o.description || "",
      code: (o.code || o.slug || "OFFER").toUpperCase(),
      badge: o.discount_badge || (o.discount_value ? `Save ৳${o.discount_value}` : "Special Offer"),
      expiry: o.valid_until
        ? new Date(o.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : "Limited time",
      bannerUrl: normalizeImageUrl(o.banner_image || o.image_url) || undefined,
      tour_id: o.tour_id || null,
      tour_slug: o.tour_slug || null,
      tour_title: o.tour_title || null,
    }));
  } catch {
    return [];
  }
}

export async function fetchTestimonials(): Promise<Review[]> {
  try {
    await db.ensureDbHydrated();
    const list = db.getTestimonials(true);
    return list.map((r: any) => ({
      name: r.customer_name || r.author_name || "Verified Traveler",
      location: r.author_location || "Bangladesh",
      tour: r.tour_title || r.trip_name || "Domestic Tour",
      rating: Number(r.rating) || 5,
      text: r.quote || "",
      photoUrl: normalizeImageUrl(r.customer_photo || r.author_avatar) || undefined,
    }));
  } catch {
    return [];
  }
}

export async function fetchJournalPosts(): Promise<JournalPost[]> {
  try {
    await db.ensureDbHydrated();
    const list = db.getBlogPosts();
    return list.map((p: any) => ({
      slug: p.slug,
      title: p.title || "Untitled Article",
      category: typeof p.category === "string" ? p.category : p.category?.name || "Travel Tips",
      excerpt: p.excerpt || (p.content || p.body || "").slice(0, 150),
      date: p.published_at || p.created_at
        ? new Date(p.published_at || p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "Recent",
      author: p.author || p.author_name || "Savar Tour Lover Editorial",
      readTime: `${p.read_time_minutes || 4} min read`,
      cover: sceneForSlug(p.slug, p.title || "", p.cover_image || p.hero_image),
      body: p.body || p.content ? [{ paragraphs: (p.body || p.content || "").split("\n\n").filter(Boolean) }] : [],
      isFeatured: Boolean(p.is_featured),
    }));
  } catch {
    return [];
  }
}

export async function fetchJournalPost(slug: string): Promise<JournalPost | null> {
  try {
    await db.ensureDbHydrated();
    const p = db.getBlogPostBySlug(slug);
    if (!p) return null;
    const rawDate = p.published_at || p.created_at;
    return {
      slug: p.slug,
      title: p.title || "Untitled Article",
      category: typeof p.category === "string" ? p.category : p.category?.name || "Travel Tips",
      excerpt: p.excerpt || (p.content || p.body || "").slice(0, 150),
      date: rawDate
        ? new Date(rawDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "Recent",
      author: p.author || p.author_name || "Savar Tour Lover Editorial",
      readTime: `${p.read_time_minutes || 4} min read`,
      cover: sceneForSlug(p.slug, p.title || "", p.cover_image || p.hero_image),
      body: p.body || p.content ? [{ paragraphs: (p.body || p.content || "").split("\n\n").filter(Boolean) }] : [],
      isFeatured: Boolean(p.is_featured),
    };
  } catch {
    return null;
  }
}

export async function fetchHomepageBlocks(): Promise<HomepageBlock[]> {
  try {
    await db.ensureDbHydrated();
    const list = db.getHomepageBlocks();
    return list
      .map((b) => ({
        id: b.id,
        blockType: b.block_type as HomepageBlockType,
        displayOrder: b.display_order,
        content: b.content ?? {},
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  } catch {
    return [];
  }
}

export async function fetchAboutPageCms() {
  try {
    await db.ensureDbHydrated();
    return db.getAboutPageCms();
  } catch {
    return db.DEFAULT_ABOUT_CMS;
  }
}

export async function fetchJournalPageCms() {
  try {
    await db.ensureDbHydrated();
    return db.getJournalPageCms();
  } catch {
    return db.DEFAULT_JOURNAL_CMS;
  }
}

export async function fetchHomePageCms() {
  try {
    await db.ensureDbHydrated();
    return db.getHomePageCms();
  } catch {
    return db.DEFAULT_HOME_CMS;
  }
}
