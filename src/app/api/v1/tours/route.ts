import { NextResponse } from "next/server";
import { getTours, ensureDbHydrated } from "@/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination__slug") || undefined;
  const category = searchParams.get("category") || undefined;

  await ensureDbHydrated();
  const tours = getTours(destinationSlug, category);
  const results = tours.map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    destination: t.destination_slug,
    destination_slug: t.destination_slug,
    destination_id: t.destination_id || null,
    destination_name: t.destination_name,
    category: t.category,
    short_description: t.short_description,
    hero_image: t.hero_image,
    duration_days: t.duration_days,
    duration_nights: t.duration_nights,
    base_price: t.base_price,
    discount_value: t.discount_value,
    final_price: t.final_price,
    advance_payment_percent: t.advance_payment_percent,
    advance_amount: t.advance_amount,
    meeting_point: t.meeting_point,
    departure_schedule: t.departure_schedule,
    pickup_points: t.pickup_points,
    total_seats: t.total_seats,
    capacity: t.total_seats,
    departures: t.departures,
    is_featured: t.is_featured,
    status: t.status,
  }));

  return NextResponse.json({ results });
}
