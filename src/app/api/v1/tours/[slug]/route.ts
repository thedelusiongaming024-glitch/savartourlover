import { NextResponse } from "next/server";
import { getTourBySlug, ensureDbHydrated } from "@/server/db";

export async function GET(
  _req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  await ensureDbHydrated();
  const tour = getTourBySlug(slug);

  if (!tour) {
    return NextResponse.json({ detail: "Tour not found" }, { status: 404 });
  }

  const response = {
    id: tour.id,
    title: tour.title,
    slug: tour.slug,
    destination_id: tour.destination_id || null,
    destination_slug: tour.destination_slug,
    destination_name: tour.destination_name,
    destination: { id: tour.destination_id || null, slug: tour.destination_slug, name: tour.destination_name },
    category: tour.category,
    short_description: tour.short_description,
    full_description: tour.full_description,
    hero_image: tour.hero_image,
    duration_days: tour.duration_days,
    duration_nights: tour.duration_nights,
    base_price: tour.base_price,
    discount_type: tour.discount_type,
    discount_value: tour.discount_value,
    final_price: tour.final_price,
    allow_partial_payment: tour.allow_partial_payment,
    advance_payment_percent: tour.advance_payment_percent,
    advance_amount: tour.advance_amount,
    inclusions: tour.inclusions,
    exclusions: tour.exclusions,
    accommodation_notes: tour.accommodation_notes,
    transportation_notes: tour.transportation_notes,
    meals_notes: tour.meals_notes,
    meeting_point: tour.meeting_point,
    departure_schedule: tour.departure_schedule,
    total_seats: tour.total_seats,
    departures: tour.departures.map((d) => ({
      id: d.id,
      departure_date: d.departure_date,
      seats_remaining: d.seats_remaining,
      total_seats: d.total_seats || tour.total_seats || 40,
      booked_seats: d.booked_seats || [],
      is_active: d.is_active,
    })),
    itinerary: tour.itinerary,
    gallery: tour.gallery,
    faqs: tour.faqs,
    is_featured: tour.is_featured,
  };

  return NextResponse.json(response);
}
