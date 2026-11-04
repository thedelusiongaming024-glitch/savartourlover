/**
 * Full End-to-End System Simulation Test Suite for Savar Tour Lover
 * Tests all user flows, booking & payments, admin CRUD, finance, and cloud sync.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let adminToken = "";
let customerToken = "";
let testTourId = "";
let testTourSlug = "";
let testDepartureId = "";
let testBookingId = "";
let testBookingRef = "";
let testExpenseId = "";
let testSupplierId = "";
let testOfferId = "";
let testBlogId = "";
let testTestimonialId = "";
let testDestId = "";
let testDestSlug = "";

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, passed, details = "") {
  results.total++;
  if (passed) {
    results.passed++;
    results.tests.push({ name, status: "PASSED", details });
    console.log(`  [PASS] ${name} ${details ? `(${details})` : ""}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: "FAILED", details });
    console.error(`  [FAIL] ${name} -> ${details}`);
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runSimulation() {
  console.log("===============================================================");
  console.log("🚀 STARTING COMPREHENSIVE SAVAR TOUR LOVER SYSTEM SIMULATION");
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log(`⏱️ Time: ${new Date().toISOString()}`);
  console.log("===============================================================\n");

  // -------------------------------------------------------------------------
  // 1. PUBLIC USER EXPERIENCE & WEBSITE BROWSING
  // -------------------------------------------------------------------------
  console.log("📌 SECTION 1: PUBLIC USER EXPERIENCE & DISCOVERY");
  try {
    const home = await api("/");
    logTest("Load Homepage (HTTP 200)", home.ok, `Status: ${home.status}`);

    const dests = await api("/api/v1/destinations");
    logTest("Fetch Destinations Catalog", dests.ok && Array.isArray(dests.data?.results || dests.data), `Found ${dests.data?.results?.length ?? dests.data?.length ?? 0} destinations`);

    const tours = await api("/api/v1/tours");
    const toursList = tours.data?.results || tours.data || [];
    logTest("Fetch Published Tours Catalog", tours.ok && Array.isArray(toursList), `Found ${toursList.length} tours`);

    if (toursList.length > 0) {
      const firstTour = toursList[0];
      const singleTour = await api(`/api/v1/tours/${firstTour.slug || firstTour.id}`);
      logTest("Fetch Single Tour Detail Page", singleTour.ok && singleTour.data?.title, `Tour: "${singleTour.data?.title}"`);
    }

    const blog = await api("/api/v1/blog-posts");
    logTest("Fetch Travel Journal Articles", blog.ok, `Articles: ${blog.data?.results?.length ?? 0}`);

    const reviews = await api("/api/v1/testimonials");
    logTest("Fetch Customer Reviews / Testimonials", reviews.ok, `Reviews: ${reviews.data?.results?.length ?? 0}`);

    const offers = await api("/api/v1/offers");
    logTest("Fetch Active Special Offers", offers.ok, `Offers: ${offers.data?.results?.length ?? 0}`);

    const inquiryRes = await api("/api/v1/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Simulation Visitor",
        phone: "01799887766",
        email: "sim.visitor@example.com",
        message: "Can I book a private group tour to Sajek Valley?",
        destination: "sajek-valley",
        travelers: 4,
      }),
    });
    logTest("Submit Public Contact Inquiry", inquiryRes.ok, `Status: ${inquiryRes.status}`);

    const trackRes = await api("/api/v1/track", {
      method: "POST",
      body: JSON.stringify({
        event_name: "tour_view",
        path: "/tours/sajek-valley",
        source: "direct",
      }),
    });
    logTest("Server-Side First-Party Analytics Event Ingestion", trackRes.ok, `Event: tour_view`);
  } catch (err) {
    logTest("Public Experience Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 2. CUSTOMER AUTHENTICATION & USER PROFILE
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 2: CUSTOMER AUTHENTICATION & PROFILE");
  try {
    const custAuth = await api("/api/v1/auth/customer", {
      method: "POST",
      body: JSON.stringify({
        phone_number: "01811223344",
        full_name: "Rahim Ahmed Simulation",
        email: "rahim.sim@example.com",
      }),
    });
    customerToken = custAuth.data?.token || "";
    logTest("Customer Phone-Based Registration/Login", custAuth.ok && !!customerToken, `Customer ID: ${custAuth.data?.customer?.id}`);

    const profileRes = await api("/api/v1/customer/profile", {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const phoneMatches = profileRes.data?.customer?.phone_number?.includes("01811223344");
    logTest("Fetch Authenticated Customer Profile", profileRes.ok && phoneMatches, `Name: ${profileRes.data?.customer?.full_name}`);
  } catch (err) {
    logTest("Customer Authentication Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 3. ADMIN AUTHENTICATION & RBAC
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 3: STAFF & SUPER ADMIN AUTHENTICATION");
  try {
    const adminLogin = await api("/api/v1/auth/staff/login", {
      method: "POST",
      body: JSON.stringify({
        username: "admin",
        password: "adminpassword123",
      }),
    });
    adminToken = adminLogin.data?.access || "";
    const refreshToken = adminLogin.data?.refresh || "";

    // Decode role from JWT access token
    let role = "";
    if (adminToken) {
      try {
        const payload = JSON.parse(Buffer.from(adminToken.split(".")[1], "base64").toString());
        role = payload.role || "";
      } catch {}
    }

    logTest("Admin Login Credentials", adminLogin.ok && !!adminToken, `Role: ${role}`);

    const refreshRes = await api("/api/v1/auth/token/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
    logTest("Admin Token Refresh Cycle", refreshRes.ok && !!refreshRes.data?.access, `Refreshed Token Issued`);
  } catch (err) {
    logTest("Admin Authentication Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 4. ADMIN CRUD: TOURS & DEPARTURES
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 4: ADMIN CRUD — TOURS & DEPARTURES");
  try {
    const newTour = await api("/api/v1/admin/tours", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: "Simulation Cox's Bazar Eco Retreat",
        destination_slug: "coxs-bazar",
        duration_days: 3,
        duration_nights: 2,
        base_price: "6500",
        advance_percentage: "30",
        total_seats: 30,
        available_seats: 30,
        status: "published",
        overview: "A simulated test tour for end-to-end booking verification.",
        inclusions: ["AC Bus", "Resort Stay", "Breakfast", "Guide"],
        departures: [
          {
            id: `dep-${Date.now()}`,
            departure_date: "2026-12-15T06:00:00.000Z",
            return_date: "2026-12-18T20:00:00.000Z",
            seats_total: 30,
            seats_available: 30,
            seats_booked: 0,
            status: "active",
          },
        ],
      }),
    });
    testTourId = newTour.data?.id || "";
    testTourSlug = newTour.data?.slug || "";
    testDepartureId = newTour.data?.departures?.[0]?.id || "";
    logTest("CREATE Tour Package", newTour.ok && !!testTourId, `ID: ${testTourId}, Slug: ${testTourSlug}`);

    const updateTour = await api(`/api/v1/admin/tours/${testTourId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: "Simulation Cox's Bazar Eco Retreat (Updated)",
        base_price: "7000",
      }),
    });
    logTest("UPDATE Tour Package", updateTour.ok, `New Price: 7000`);

    const readTour = await api(`/api/v1/admin/tours`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const exists = readTour.data?.results?.some((t) => t.id === testTourId);
    logTest("READ Tour Catalog (Admin List)", exists, `Verified tour present in database`);

    // Fetch the updated tour to get its current departure ID
    const fetchedTour = readTour.data?.results?.find((t) => t.id === testTourId);
    if (fetchedTour?.departures?.length > 0) {
      testDepartureId = fetchedTour.departures[0].id;
    }
  } catch (err) {
    logTest("Tour CRUD Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 5. USER BOOKING CREATION & SEAT RESERVATION
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 5: USER BOOKING & SEAT RESERVATION");
  try {
    const bookingPayload = {
      tour_id: testTourId,
      departure_id: testDepartureId,
      traveler_count: 2,
      payment_plan: "partial",
      customer_full_name: "Rahim Ahmed Simulation",
      customer_phone_number: "01811223344",
      customer_email: "rahim.sim@example.com",
      pickup_point: "Savar Bus Stand",
      selected_seats: ["A1", "A2"],
      special_requests: "Window seat preferred",
    };
    const bookingRes = await api("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify(bookingPayload),
    });
    if (!bookingRes.ok) {
      console.error("Booking creation error details:", bookingRes.data);
    }
    testBookingId = bookingRes.data?.id || bookingRes.data?.booking?.id || "";
    testBookingRef = bookingRes.data?.reference || bookingRes.data?.booking?.reference || "";
    const tokenToUse = bookingRes.data?.customer_token || customerToken;
    const advAmount = bookingRes.data?.advance_amount ?? bookingRes.data?.booking?.advance_amount;
    const dueAmount = bookingRes.data?.amount_due ?? bookingRes.data?.booking?.amount_due;
    logTest("CREATE Booking with Seat Reservation", bookingRes.ok && !!testBookingId, `Ref: ${testBookingRef}, Advance: ৳${advAmount}, Due: ৳${dueAmount}`);

    const ticketRes = await api(`/api/v1/tickets/${testBookingId}`, {
      headers: { Authorization: `Bearer ${tokenToUse}` },
    });
    logTest("Generate Clearance Ticket & Boarding Pass", ticketRes.ok && !!ticketRes.data?.booking?.id, `Clearance Token: ${ticketRes.data?.clearance_token ? ticketRes.data.clearance_token.slice(0, 24) + '...' : 'none'}`);

    const clearanceCheck = await api(`/api/v1/clearance/${testBookingId}`, {
      headers: { Authorization: `Bearer ${tokenToUse}` },
    });
    logTest("Check Booking Clearance Status", clearanceCheck.ok, `Customer: ${clearanceCheck.data?.customer_name}, Is Cleared: ${clearanceCheck.data?.is_cleared}`);
  } catch (err) {
    logTest("Booking Creation Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 6. PAYMENT PROCESSING & LEDGER RECORDING
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 6: PAYMENT FLOWS & REVENUE LEDGER");
  try {
    // Test Payment Initiation
    const payInit = await api("/api/v1/payments/initiate", {
      method: "POST",
      body: JSON.stringify({
        booking_id: testBookingId,
        payment_type: "advance",
        payment_method: "Bkash payment",
      }),
    });
    logTest("Initiate Gateway Payment Session", payInit.ok || payInit.status === 200 || payInit.status === 302, `Status: ${payInit.status}`);

    // Admin Cash Approval Simulation
    const cashApproval = await api("/api/v1/admin/bookings", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: testBookingId,
        action: "approve_cash_payment",
        received_type: "advance",
      }),
    });
    logTest("Admin Approve Cash Advance Payment", cashApproval.ok, `Booking Status: ${cashApproval.data?.status}`);

    // Tour Day Settlement: Settle Remaining Balance
    const settleDue = await api("/api/v1/admin/bookings", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: testBookingId,
        action: "settle_due",
        method: "host_cash",
      }),
    });
    logTest("Tour Day Full Due Settlement", settleDue.ok && parseFloat(settleDue.data?.amount_due || "0") === 0, `Amount Due: ৳${settleDue.data?.amount_due}`);

    // Check Payments Ledger
    const paymentsList = await api("/api/v1/admin/payments", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foundPayment = paymentsList.data?.results?.some((p) => p.booking_id === testBookingId);
    logTest("Audit Payments Ledger Recording", paymentsList.ok && foundPayment, `Ledger has verified payment records for ${testBookingRef}`);
  } catch (err) {
    logTest("Payment Processing Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 7. ADMIN CRUD: EXPENSES, SUPPLIERS & OVERHEADS
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 7: EXPENSES, SUPPLIERS & FINANCIAL COSTING");
  try {
    // 1. Direct Cost
    const expDirect = await api("/api/v1/admin/expenses", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: "hotel",
        amount: "15000",
        description: "Cox's Bazar Hotel Seagull 5 Rooms Advance Booking",
        date: new Date().toISOString().slice(0, 10),
      }),
    });
    testExpenseId = expDirect.data?.id || "";
    logTest("RECORD Direct Tour Cost (COGS)", expDirect.ok && !!testExpenseId, `Amount: ৳15,000, Cat: hotel`);

    // 2. Operating Overhead
    const expOverhead = await api("/api/v1/admin/expenses", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: "software",
        amount: "2500",
        description: "Cloud Server Hosting & Domain Maintenance",
        date: new Date().toISOString().slice(0, 10),
      }),
    });
    const overheadId = expOverhead.data?.id || "";
    logTest("RECORD Operational Overhead Expense", expOverhead.ok && !!overheadId, `Amount: ৳2,500, Cat: software`);

    // 3. Register Supplier
    const supRes = await api("/api/v1/admin/suppliers", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Green Line Paribahan (Savar Hub)",
        category: "transport",
        contact_person: "Mr. Monir Hossain",
        phone: "01712334455",
        email: "greenline.savar@example.com",
        outstanding_balance: "35000",
        notes: "Monthly bus charter partner",
      }),
    });
    testSupplierId = supRes.data?.id || "";
    logTest("REGISTER Supplier / Vendor Ledger", supRes.ok && !!testSupplierId, `Supplier: ${supRes.data?.name}`);

    // Read Expenses & Suppliers
    const allExpenses = await api("/api/v1/admin/expenses", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest("READ All Expenses Admin", allExpenses.ok && allExpenses.data?.results?.length > 0, `Total Expenses Count: ${allExpenses.data?.results?.length}`);

    const allSuppliers = await api("/api/v1/admin/suppliers", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest("READ All Suppliers Admin", allSuppliers.ok && allSuppliers.data?.results?.length > 0, `Total Suppliers Count: ${allSuppliers.data?.results?.length}`);

    // Cleanup overhead expense
    if (overheadId) {
      const delExp = await api(`/api/v1/admin/expenses/${overheadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      logTest("DELETE Expense Record", delExp.ok, `Overhead expense cleaned up`);
    }
  } catch (err) {
    logTest("Expenses & Suppliers Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 8. FINANCIAL SUMMARY & P&L INTEGRITY VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 8: FINANCIAL SUMMARY & P&L MATHEMATICAL INTEGRITY");
  try {
    const fin = await api("/api/v1/finance/overview", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rev = parseFloat(fin.data?.total_revenue || "0");
    const direct = parseFloat(fin.data?.total_direct_cost || "0");
    const op = parseFloat(fin.data?.total_operational_expense || "0");
    const gross = parseFloat(fin.data?.gross_profit || "0");
    const net = parseFloat(fin.data?.net_profit || "0");

    const grossMatches = Math.abs(gross - (rev - direct)) < 0.01;
    const netMatches = Math.abs(net - (gross - op)) < 0.01;

    logTest("Financial Overview Endpoint (200 OK)", fin.ok, `Revenue: ৳${rev}, Direct: ৳${direct}, Op: ৳${op}`);
    logTest("P&L Formula: Gross Profit = Revenue - Direct Costs", grossMatches, `Computed: ৳${gross}`);
    logTest("P&L Formula: Net Profit = Gross Profit - Operating Expenses", netMatches, `Computed: ৳${net}`);
  } catch (err) {
    logTest("Financial Integrity Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 9. ADMIN CRUD: DESTINATIONS, CATEGORIES, OFFERS, BLOG, REVIEWS, CMS
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 9: OTHER ADMIN CRUD ENTITIES");
  try {
    // Destination CRUD
    const destPost = await api("/api/v1/admin/destinations", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Test Bandarban Peaks",
        slug: "test-bandarban-peaks",
        division: "chattogram",
        description: "Simulation destination for hill tracts hiking.",
        is_featured: false,
      }),
    });
    testDestId = destPost.data?.id || "";
    logTest("CREATE Destination", destPost.ok && !!testDestId, `ID: ${testDestId}`);

    if (testDestId) {
      const delDest = await api(`/api/v1/admin/destinations/${testDestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      logTest("DELETE Destination", delDest.ok, `Destination deleted cleanly`);
    }

    // Special Offer CRUD
    const offerPost = await api("/api/v1/admin/offers", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: "Simulation Eid Promo 2026",
        code: "SIMEID26",
        discount_type: "percent",
        discount_value: "10",
        valid_until: "2026-12-31T23:59:59.000Z",
        is_active: true,
      }),
    });
    testOfferId = offerPost.data?.id || "";
    logTest("CREATE Special Offer / Promo", offerPost.ok && !!testOfferId, `Code: SIMEID26`);

    const validateOffer = await api("/api/v1/offers/validate", {
      method: "POST",
      body: JSON.stringify({ code: "SIMEID26", total_amount: 10000 }),
    });
    logTest("VALIDATE Promo Code Engine", validateOffer.ok && validateOffer.data?.discount_amount === 1000, `Discount: ৳${validateOffer.data?.discount_amount}`);

    if (testOfferId) {
      const delOffer = await api(`/api/v1/admin/offers/${testOfferId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      logTest("DELETE Special Offer", delOffer.ok, `Offer deleted`);
    }

    // Testimonial CRUD
    const revPost = await api("/api/v1/admin/testimonials", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customer_name: "Farhana Sultana",
        customer_location: "Dhaka",
        rating: 5,
        review_text: "Amazing experience with Savar Tour Lover team! Very well organized.",
        is_featured: true,
      }),
    });
    testTestimonialId = revPost.data?.id || "";
    logTest("CREATE Customer Review", revPost.ok && !!testTestimonialId, `ID: ${testTestimonialId}`);

    if (testTestimonialId) {
      const delRev = await api(`/api/v1/admin/testimonials/${testTestimonialId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      logTest("DELETE Customer Review", delRev.ok, `Review deleted`);
    }

    // CMS Blocks
    const cmsList = await api("/api/v1/admin/cms", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest("READ Homepage & About CMS Blocks", cmsList.ok && Array.isArray(cmsList.data?.results || cmsList.data), `Blocks Count: ${cmsList.data?.results?.length ?? cmsList.data?.length}`);
  } catch (err) {
    logTest("Admin Other Entities Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 10. OPERATIONAL ALERTS PERMANENT DELETION
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 10: SYSTEM & OPERATIONAL ALERTS PERMANENT DELETION");
  try {
    const alertsGet = await api("/api/v1/alerts", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alertList = alertsGet.data?.results || alertsGet.data || [];
    logTest("READ Operational Alerts", alertsGet.ok, `Alerts Count: ${alertList.length}`);

    if (alertList.length > 0) {
      const firstAlert = alertList[0];
      const ackRes = await api(`/api/v1/alerts/${firstAlert.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ is_acknowledged: true }),
      });
      logTest("Permanently Delete Acknowledged Alert", ackRes.ok && ackRes.data?.deleted === true, `Alert ID: ${firstAlert.id}`);
    }
  } catch (err) {
    logTest("Alerts Management Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 11. SUPABASE CLOUD DATABASE SYNC & PERSISTENCE CHECK
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 11: DATABASE PERSISTENCE & SUPABASE CLOUD SYNC");
  try {
    const sbStatus = await api("/api/v1/admin/supabase/status", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest("Check Supabase Cloud Sync Status", sbStatus.ok, `Postgres State: ${sbStatus.data?.supabase_configured ? "Configured" : "Local-only"}`);

    const syncTrigger = await api("/api/v1/admin/supabase/trigger-sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest("Trigger Full Dual-Layer Cloud Sync", syncTrigger.ok, `Synced across all Tier 1-4 tables`);
  } catch (err) {
    logTest("Cloud Sync Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // CLEANUP TEST TOUR & BOOKING
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 12: TEST FIXTURE CLEANUP");
  try {
    if (testExpenseId) {
      await api(`/api/v1/admin/expenses/${testExpenseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    if (testSupplierId) {
      await api(`/api/v1/admin/suppliers/${testSupplierId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    if (testBookingId) {
      await api(`/api/v1/admin/bookings`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ id: testBookingId, status: "cancelled" }),
      });
    }
    if (testTourId) {
      const delTour = await api(`/api/v1/admin/tours/${testTourId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      logTest("CLEANUP Simulation Tour Fixture", delTour.ok, `Tour: ${testTourId}`);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n===============================================================");
  console.log("🏁 SIMULATION SUITE COMPLETED");
  console.log(`📊 Total Test Operations: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log("===============================================================\n");

  return results;
}

runSimulation()
  .then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error("Fatal simulation failure:", err);
    process.exit(1);
  });
