import { NextResponse } from "next/server";
import { getTestimonials, ensureDbHydrated } from "@/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const onlyFeatured = searchParams.get("is_featured") === "true";

  await ensureDbHydrated();
  const testimonials = getTestimonials(onlyFeatured);
  const results = testimonials.map((t) => ({
    customer_name: t.customer_name,
    tour_title: t.tour_title,
    rating: t.rating,
    quote: t.quote,
    customer_photo: t.customer_photo,
  }));

  return NextResponse.json({ results });
}
