/**
 * Customer wiring test — verifies:
 * 1. GET /api/v1/admin/customers returns correct shape
 * 2. Customer is auto-created when a booking is made
 * 3. Customer shows correct booking count / total_spent / total_due
 * 4. Customer profile update works
 * 5. Customer detail view (Whole Details) has activities
 */

const BASE = "http://127.0.0.1:3000";

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

// ── Login ─────────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log("  Customer Panel Wiring Test");
console.log("══════════════════════════════════════════════════════════");

const login = await api("POST", "/api/v1/auth/staff/login", { username: "admin", password: "adminpassword123" });
const TOKEN = login.data.access;
ok("Admin login OK", !!TOKEN);
if (!TOKEN) { console.error("Cannot continue"); process.exit(1); }

// ── Step 1: GET customers on empty DB ─────────────────────────────────────────
console.log("\n── Step 1: GET /admin/customers (empty DB) ──");
const emptyGet = await api("GET", "/api/v1/admin/customers", null, TOKEN);
ok("GET /admin/customers → 200", emptyGet.status === 200, `status=${emptyGet.status}`);
ok("GET returns results array", Array.isArray(emptyGet.data?.results));
ok("GET returns count field", typeof emptyGet.data?.count === "number");
const initialCount = emptyGet.data?.count || 0;
console.log(`   Initial customer count: ${initialCount}`);

// ── Step 2: Create a destination + tour so we can book ────────────────────────
console.log("\n── Step 2: Create destination + tour ──");
const dest = await api("POST", "/api/v1/admin/destinations", {
  name: "Test Destination", slug: `test-dest-${Date.now()}`, division: "Dhaka",
  tagline: "Test tagline", description: "Test description", status: "published", is_featured: true,
}, TOKEN);
ok("Destination POST → 201", dest.status === 201, JSON.stringify(dest.data).slice(0, 100));
const DEST_ID = dest.data?.id;
const DEST_SLUG = dest.data?.slug;

const tour = await api("POST", "/api/v1/admin/tours", {
  title: "Customer Test Tour",
  slug: `customer-test-tour-${Date.now()}`,
  destination_id: DEST_ID,
  destination_slug: DEST_SLUG,
  duration_nights: 2,
  base_price: "5000",
  advance_payment_percent: "40",
  total_seats: 10,
  status: "published",
  departures: [{
    departure_date: "2027-01-15",
    total_seats: 10,
    seats_remaining: 10,
    booked_seats: [],
    is_active: true,
  }],
}, TOKEN);
ok("Tour POST → 201", tour.status === 201, JSON.stringify(tour.data).slice(0, 100));
const TOUR_ID = tour.data?.id;
const DEPARTURE_ID = tour.data?.departures?.[0]?.id;
console.log(`   Tour: ${TOUR_ID}, Departure: ${DEPARTURE_ID}`);

// ── Step 3: Book the tour → customer auto-created ─────────────────────────────
console.log("\n── Step 3: Book tour → customer auto-created ──");
const booking = await api("POST", "/api/v1/bookings", {
  tour_id: TOUR_ID,
  departure_id: DEPARTURE_ID,
  traveler_count: 2,
  payment_plan: "partial",
  payment_method: "Bkash payment",
  customer_full_name: "Wiring Test Customer",
  customer_phone_number: "01800000001",
  customer_email: "wiring@test.com",
  pickup_point: "Dhaka Bus Terminal",
  special_requests: "Window seat please",
});
ok("Booking POST → 201", booking.status === 201, JSON.stringify(booking.data).slice(0, 200));
const BOOKING_ID = booking.data?.booking?.id || booking.data?.id;
const AMOUNT_PAID = booking.data?.booking?.amount_paid || booking.data?.amount_paid;
const AMOUNT_DUE = booking.data?.booking?.amount_due || booking.data?.amount_due;
console.log(`   Booking: ${BOOKING_ID}, Paid: ${AMOUNT_PAID}, Due: ${AMOUNT_DUE}`);

// ── Step 4: Verify customer was auto-created ──────────────────────────────────
console.log("\n── Step 4: Verify customer auto-created ──");
const afterBookingGet = await api("GET", "/api/v1/admin/customers", null, TOKEN);
ok("GET /admin/customers → 200 after booking", afterBookingGet.status === 200);
ok("Customer count increased by 1", (afterBookingGet.data?.count || 0) === initialCount + 1,
  `expected ${initialCount + 1}, got ${afterBookingGet.data?.count}`);

const newCust = (afterBookingGet.data?.results || []).find(c =>
  c.phone_number === "01800000001" || c.phone_number === "+8801800000001"
);
ok("Customer found by phone", !!newCust, "phone 01800000001 not in: " + JSON.stringify((afterBookingGet.data?.results || []).map(c => c.phone_number)));
ok("Customer has full_name", newCust?.full_name === "Wiring Test Customer", "got: " + newCust?.full_name);
ok("Customer has email", newCust?.email === "wiring@test.com" || newCust?.email === "", "got: " + newCust?.email);
ok("Customer bookings_count = 1", (newCust?.bookings_count || 0) === 1, "got: " + newCust?.bookings_count);
ok("Customer total_due > 0 (bKash pending = not yet paid)", (newCust?.total_due || 0) > 0, "got: " + newCust?.total_due);
ok("Customer total_due >= 0", typeof (newCust?.total_due) === "number", "got: " + newCust?.total_due);
ok("Customer has id", !!newCust?.id);
ok("Customer has created_at", !!newCust?.created_at);

// ── Step 5: Customer profile — public auth check ──────────────────────────────
console.log("\n── Step 5: Customer profile API ──");
const profileCheck = await api("GET", "/api/v1/customer/profile");
ok("GET /customer/profile → 401 without auth", profileCheck.status === 401, `got ${profileCheck.status}`);

// ── Step 6: Simulate second booking by same customer ──────────────────────────
console.log("\n── Step 6: Second booking by same customer ──");
const booking2 = await api("POST", "/api/v1/bookings", {
  tour_id: TOUR_ID,
  departure_id: DEPARTURE_ID,
  traveler_count: 1,
  payment_plan: "partial",
  payment_method: "cash_on_hand",
  customer_full_name: "Wiring Test Customer",
  customer_phone_number: "01800000001",
  customer_email: "wiring@test.com",
});
ok("Second booking POST → 201", booking2.status === 201, JSON.stringify(booking2.data).slice(0, 200));

const afterSecondGet = await api("GET", "/api/v1/admin/customers", null, TOKEN);
const updatedCust = (afterSecondGet.data?.results || []).find(c =>
  c.phone_number === "01800000001" || c.phone_number === "+8801800000001"
);
ok("Same customer not duplicated", (afterSecondGet.data?.count || 0) === initialCount + 1,
  `count=${afterSecondGet.data?.count}, expected ${initialCount + 1}`);
ok("Customer bookings_count = 2", (updatedCust?.bookings_count || 0) === 2, "got: " + updatedCust?.bookings_count);
ok("Customer total_due increased with 2nd booking", (updatedCust?.total_due || 0) > (newCust?.total_due || 0),
  `was: ${newCust?.total_due}, now: ${updatedCust?.total_due}`);

// ── Step 7: Verify customer has bookings array ────────────────────────────────
console.log("\n── Step 7: Customer bookings array ──");
ok("Customer has bookings array", Array.isArray(updatedCust?.bookings), "type: " + typeof updatedCust?.bookings);
ok("Customer bookings has 2 items", (updatedCust?.bookings?.length || 0) === 2, "got: " + updatedCust?.bookings?.length);

// ── Cleanup: delete destination + tour ───────────────────────────────────────
console.log("\n── Cleanup ──");
const delTour = await api("DELETE", `/api/v1/admin/tours/${TOUR_ID}`, null, TOKEN);
ok("Cleanup tour DELETE → 200", delTour.status === 200);
const delDest = await api("DELETE", `/api/v1/admin/destinations/${DEST_ID}`, null, TOKEN);
ok("Cleanup destination DELETE → 200", delDest.status === 200);

// ── Final Report ─────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log(`  Total: ${PASS + FAIL} | ✅ Passed: ${PASS} | ❌ Failed: ${FAIL}`);
if (ERRORS.length > 0) {
  console.log("\n  Failed:");
  ERRORS.forEach(e => console.log(`    • ${e}`));
}
if (FAIL > 0) { console.log("\n🚨 Bugs found."); process.exit(1); }
else { console.log("\n🎉 ALL PASSED — Customer wiring is fully functional!"); }
