import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import {
  ensureDbHydrated,
  getAllToursAdmin,
  getTourCategories,
  getAllDestinationsAdmin,
  getAllBlogPostsAdmin,
  getAllOffersAdmin,
  getAllTestimonialsAdmin,
  getHomepageBlocks,
  getAllBookingsAdmin,
  getAllInquiriesAdmin,
  getAllCustomers,
  getAllExpensesAdmin,
  getAllSuppliersAdmin,
  getAllPaymentsAdmin,
} from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  await ensureDbHydrated();

  return NextResponse.json({
    tours: getAllToursAdmin(),
    tourCategories: getTourCategories(),
    destinations: getAllDestinationsAdmin(),
    blogPosts: getAllBlogPostsAdmin(),
    offers: getAllOffersAdmin(),
    testimonials: getAllTestimonialsAdmin(),
    cms: getHomepageBlocks(),
    bookings: getAllBookingsAdmin(),
    inquiries: getAllInquiriesAdmin(),
    customers: getAllCustomers(),
    expenses: getAllExpensesAdmin(),
    suppliers: getAllSuppliersAdmin(),
    payments: getAllPaymentsAdmin(),
  });
}
