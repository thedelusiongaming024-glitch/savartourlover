import { NextResponse } from "next/server";
import { getOffers, ensureDbHydrated } from "@/server/db";

export async function GET() {
  await ensureDbHydrated();
  const offers = getOffers();
  const results = offers.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    code: o.code || o.slug,
    slug: o.slug,
    discount_type: o.discount_type,
    discount_value: o.discount_value,
    minimum_spend: o.minimum_spend,
    tour_id: o.tour_id || null,
    tour_slug: o.tour_slug || null,
    tour_title: o.tour_title || null,
    valid_from: o.valid_from,
    valid_until: o.valid_until,
    banner_image: o.banner_image,
  }));

  return NextResponse.json({ results });
}
