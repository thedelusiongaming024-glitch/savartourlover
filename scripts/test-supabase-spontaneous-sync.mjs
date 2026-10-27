import { createClient } from "@supabase/supabase-js";

const BASE = "http://127.0.0.1:3000";
const SUPABASE_URL = "https://tuvgeaflyxbldpmpafdk.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dmdlYWZseXhibGRwbXBhZmRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDMwOTkxNSwiZXhwIjoyMTA1ODg1OTE1fQ.Jf-pfS0HB3ggws08_xUrJ5l53QAT8OayrCYJUrt5rxM";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let PASS = 0, FAIL = 0;
const ERRORS = [];

function ok(label, condition, detail = "") {
  if (condition) { console.log(`  ✅ ${label}`); PASS++; }
  else { console.error(`  ❌ ${label}${detail ? " — " + detail : ""}`); FAIL++; ERRORS.push(label + (detail ? ": " + detail : "")); }
}

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function main() {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Testing Spontaneous Database & Supabase Sync");
  console.log("══════════════════════════════════════════════════════════");

  // Admin login
  const login = await api("POST", "/api/v1/auth/staff/login", { username: "admin", password: "adminpassword123" });
  const TOKEN = login.data.access;
  ok("Admin Login", !!TOKEN);

  const testSuffix = Date.now();
  const testDestSlug = `spontaneous-dest-${testSuffix}`;
  const testTourSlug = `spontaneous-tour-${testSuffix}`;

  // 1. POST Destination via Admin API -> verify in Supabase Postgres
  console.log("\n── 1. POST Destination -> Supabase Sync ──");
  const createDest = await api("POST", "/api/v1/admin/destinations", {
    name: "Spontaneous Sylhet",
    slug: testDestSlug,
    division: "Sylhet",
    tagline: "Land of Two Leaves and a Bud",
    description: "Live sync verification test destination",
    status: "published",
    is_featured: true,
  }, TOKEN);
  ok("Admin POST Destination → 201", createDest.status === 201);
  const destId = createDest.data?.id;

  // Check directly in Supabase
  await new Promise(r => setTimeout(r, 1000));
  const { data: supaDest } = await supabase.from("destinations").select("*").eq("id", destId).single();
  ok("Destination SPONTANEOUSLY in Supabase", !!supaDest && supaDest.slug === testDestSlug, `got: ${JSON.stringify(supaDest)}`);

  // 2. PUT Destination -> verify update in Supabase
  console.log("\n── 2. PUT Destination -> Supabase Sync ──");
  const updateDest = await api("PUT", `/api/v1/admin/destinations/${destId}`, {
    name: "Spontaneous Sylhet (Updated)",
    tagline: "Updated Tagline Live",
  }, TOKEN);
  ok("Admin PUT Destination → 200", updateDest.status === 200);

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaUpdatedDest } = await supabase.from("destinations").select("*").eq("id", destId).single();
  ok("Destination Update SPONTANEOUSLY in Supabase", supaUpdatedDest?.name === "Spontaneous Sylhet (Updated)");

  // 3. POST Tour under destination -> verify in Supabase
  console.log("\n── 3. POST Tour -> Supabase Sync ──");
  const createTour = await api("POST", "/api/v1/admin/tours", {
    title: "Spontaneous Tea Garden Tour",
    slug: testTourSlug,
    destination_id: destId,
    destination_slug: testDestSlug,
    base_price: "4500",
    advance_payment_percent: "30",
    total_seats: 12,
    status: "published",
    departures: [{
      departure_date: "2027-03-20",
      total_seats: 12,
      seats_remaining: 12,
      booked_seats: [],
      is_active: true,
    }],
  }, TOKEN);
  ok("Admin POST Tour → 201", createTour.status === 201);
  const tourId = createTour.data?.id;
  const depId = createTour.data?.departures?.[0]?.id;

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaTour } = await supabase.from("tours").select("*").eq("id", tourId).single();
  ok("Tour SPONTANEOUSLY in Supabase", !!supaTour && supaTour.slug === testTourSlug);

  // 4. Public Booking -> Customer & Booking in Supabase
  console.log("\n── 4. Public Booking -> Customer & Booking in Supabase ──");
  const testPhone = `+8801700${String(testSuffix).slice(-6)}`;
  const bookRes = await api("POST", "/api/v1/bookings", {
    tour_id: tourId,
    departure_id: depId,
    traveler_count: 2,
    payment_plan: "partial",
    payment_method: "Bkash payment",
    customer_full_name: "Spontaneous Traveler",
    customer_phone_number: testPhone,
    customer_email: "spontaneous@example.com",
    pickup_point: "Savar Bus Stand",
  });
  ok("Public Booking POST → 201", bookRes.status === 201);
  const bookingId = bookRes.data?.booking?.id || bookRes.data?.id;

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaBooking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  ok("Booking SPONTANEOUSLY in Supabase", !!supaBooking);

  const { data: supaCust } = await supabase.from("customers").select("*").eq("phone_number", testPhone).single();
  ok("Customer SPONTANEOUSLY in Supabase", !!supaCust && supaCust.full_name === "Spontaneous Traveler");

  // 5. Contact Inquiry -> Supabase Sync
  console.log("\n── 5. Contact Inquiry -> Supabase Sync ──");
  const inqRes = await api("POST", "/api/v1/contact", {
    name: "Spontaneous Inquirer",
    phone: testPhone,
    email: "inquiry@test.com",
    destination: "Sylhet",
    travelers: 4,
    message: "Live sync verification test inquiry.",
  });
  ok("Public Contact Inquiry POST → 201", inqRes.status === 201);
  const inqId = inqRes.data?.inquiry_id;

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaInq } = await supabase.from("contact_inquiries").select("*").eq("id", inqId).single();
  ok("Inquiry SPONTANEOUSLY in Supabase", !!supaInq);

  // 6. DELETE Inquiry -> Disappears from Supabase
  console.log("\n── 6. DELETE Inquiry -> Supabase Deletion ──");
  const delInqRes = await api("DELETE", `/api/v1/admin/inquiries?id=${inqId}`, null, TOKEN);
  ok("Admin DELETE Inquiry → 200", delInqRes.status === 200);

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaInqAfter } = await supabase.from("contact_inquiries").select("*").eq("id", inqId);
  ok("Inquiry SPONTANEOUSLY removed from Supabase", (!supaInqAfter || supaInqAfter.length === 0));

  // 7. DELETE Customer -> Disappears from Supabase
  console.log("\n── 7. DELETE Customer -> Supabase Deletion ──");
  const delCustRes = await api("DELETE", `/api/v1/admin/customers`, { id: supaCust?.id }, TOKEN);
  ok("Admin DELETE Customer → 200", delCustRes.status === 200);

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaCustAfter } = await supabase.from("customers").select("*").eq("id", supaCust?.id);
  ok("Customer SPONTANEOUSLY removed from Supabase", (!supaCustAfter || supaCustAfter.length === 0));

  // 8. DELETE Tour -> Disappears from Supabase
  console.log("\n── 8. DELETE Tour -> Supabase Deletion ──");
  const delTourRes = await api("DELETE", `/api/v1/admin/tours/${tourId}`, null, TOKEN);
  ok("Admin DELETE Tour → 200", delTourRes.status === 200);

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaTourAfter } = await supabase.from("tours").select("*").eq("id", tourId);
  ok("Tour SPONTANEOUSLY removed from Supabase", (!supaTourAfter || supaTourAfter.length === 0));

  // 9. DELETE Destination -> Disappears from Supabase
  console.log("\n── 9. DELETE Destination -> Supabase Deletion ──");
  const delDestRes = await api("DELETE", `/api/v1/admin/destinations/${destId}`, null, TOKEN);
  ok("Admin DELETE Destination → 200", delDestRes.status === 200);

  await new Promise(r => setTimeout(r, 1000));
  const { data: supaDestAfter } = await supabase.from("destinations").select("*").eq("id", destId);
  ok("Destination SPONTANEOUSLY removed from Supabase", (!supaDestAfter || supaDestAfter.length === 0));

  // 10. Clean up test booking
  if (bookingId) {
    await supabase.from("bookings").delete().eq("id", bookingId);
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  Total: ${PASS + FAIL} | ✅ Passed: ${PASS} | ❌ Failed: ${FAIL}`);
  if (FAIL === 0) {
    console.log("🎉 ALL TESTS PASSED: SPONTANEOUS SUPABASE SYNC IS 100% OPERATIONAL!");
  } else {
    console.log("🚨 Some tests failed:", ERRORS);
    process.exit(1);
  }
}

main().catch(console.error);
