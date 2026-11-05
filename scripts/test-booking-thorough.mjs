// scripts/test-booking-thorough.mjs
const BASE_URL = "http://127.0.0.1:3000";

async function run() {
  console.log("=====================================================================");
  console.log("🚀 STARTING THOROUGH END-TO-END BOOKING & BUG DETECTION TEST");
  console.log("Customer: Arko final | Phone: 01906557845");
  console.log("=====================================================================\n");

  // --- Step 0: Check Tour & Available Seats ---
  console.log("[Step 0] Fetching published tours and seat availability...");
  const toursRes = await fetch(`${BASE_URL}/api/v1/tours`);
  if (!toursRes.ok) throw new Error(`Failed to fetch tours: ${toursRes.status}`);
  const toursData = await toursRes.json();
  const tour = (toursData.results || []).find(t => t.id === "tour_bandarban_3d2n" || t.slug === "bandarban-cloud-trail") || toursData.results[0];
  if (!tour) throw new Error("No tours found!");

  console.log(`✓ Selected Tour: "${tour.title}" (ID: ${tour.id}, Price: ৳${tour.final_price})`);

  const departure = tour.departures?.[0];
  if (!departure) throw new Error("No departures available for selected tour!");
  console.log(`✓ Selected Departure: ${departure.departure_date} (ID: ${departure.id}, Remaining Seats: ${departure.seats_remaining})`);

  // Dynamically find 2 unoccupied seats
  const bookedSeats = departure.booked_seats || [];
  const candidateSeats = [];
  for (const row of ["A","B","C","D","E","F","G","H","I","J"]) {
    for (const col of [1, 2, 3, 4]) {
      candidateSeats.push(`${row}${col}`);
    }
  }
  const availableSeats = candidateSeats.filter(s => !bookedSeats.includes(s));
  if (availableSeats.length < 2) throw new Error("Not enough candidate seats free!");
  const selectedSeats = [availableSeats[0], availableSeats[1]];
  console.log(`✓ Selected Seats for booking: ${selectedSeats.join(", ")}`);

  // --- Step 1: Create Booking ---
  console.log("\n[Step 1] Creating booking for Arko final (phone: 01906557845)...");
  const createBookingRes = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tour_id: tour.id,
      departure_id: departure.id,
      customer_full_name: "Arko final",
      customer_phone_number: "01906557845",
      customer_email: "arkofinal@example.com",
      traveler_count: 2,
      selected_seats: selectedSeats,
      payment_plan: "partial",
      payment_method: "Bkash payment",
      pickup_point: "Savar Thana Stand",
      special_requests: "Thorough end-to-end booking verification test"
    })
  });

  if (!createBookingRes.ok) {
    const err = await createBookingRes.text();
    throw new Error(`Booking creation failed (${createBookingRes.status}): ${err}`);
  }

  const booking = await createBookingRes.json();
  const customerToken = booking.customer_token;
  console.log(`✓ Booking created successfully!`);
  console.log(`  - Booking ID: ${booking.id}`);
  console.log(`  - Reference: ${booking.reference}`);
  console.log(`  - Status: ${booking.status}`);
  console.log(`  - Customer: ${booking.customer_full_name} (${booking.customer_phone_number})`);
  console.log(`  - Total Price: ৳${booking.total_price} | Advance Required: ৳${booking.advance_amount}`);
  console.log(`  - Customer Auth Token: ${customerToken ? customerToken.slice(0, 20) + "..." : "MISSING"}`);

  if (!customerToken) throw new Error("Booking response missing customer_token!");
  if (booking.status !== "pending_payment") throw new Error(`Unexpected initial status: ${booking.status}`);

  // --- Step 2: Anti-Double-Booking Protection Check ---
  console.log("\n[Step 2] Testing anti-double-booking protection (trying to book already reserved seat)...");
  const duplicateRes = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tour_id: tour.id,
      departure_id: departure.id,
      customer_full_name: "Impostor Traveler",
      customer_phone_number: "01711999888",
      traveler_count: 1,
      selected_seats: [selectedSeats[0]], // same seat!
      payment_plan: "partial"
    })
  });

  if (duplicateRes.status === 400) {
    const dupErr = await duplicateRes.json();
    console.log(`✓ Confirmed: Seat-conflict rejected with HTTP 400: "${dupErr.detail || JSON.stringify(dupErr)}"`);
  } else {
    throw new Error(`Double booking was NOT blocked! Status: ${duplicateRes.status}`);
  }

  // --- Step 3: Customer Profile Check (Pre-Payment) ---
  console.log("\n[Step 3] Checking Customer Profile before payment...");
  const profileRes = await fetch(`${BASE_URL}/api/v1/customer/profile`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  if (!profileRes.ok) throw new Error(`Customer profile fetch failed: ${profileRes.status}`);
  const profileData = await profileRes.json();
  console.log(`✓ Customer Profile fetched: ${profileData.customer.full_name} (${profileData.customer.phone_number})`);
  const foundInProfile = (profileData.bookings || []).find(b => b.id === booking.id);
  if (!foundInProfile) throw new Error("Created booking not listed in customer profile!");
  console.log(`✓ Booking ${booking.reference} listed in customer profile (Status: ${foundInProfile.status})`);

  // --- Step 4: Initiate Advance Payment ---
  console.log("\n[Step 4] Initiating advance payment session via bKash gateway...");
  const initPayRes = await fetch(`${BASE_URL}/api/v1/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booking_id: booking.id,
      payment_type: "advance",
      gateway: "bkash",
      payment_method: "Bkash payment"
    })
  });

  if (!initPayRes.ok) {
    const err = await initPayRes.text();
    throw new Error(`Payment initiation failed (${initPayRes.status}): ${err}`);
  }
  const payInitData = await initPayRes.json();
  console.log(`✓ Payment initiated: Payment ID ${payInitData.payment_id}`);
  console.log(`  - Redirect URL: ${payInitData.redirect_url}`);

  let tranId = payInitData.tran_id;
  if (!tranId && payInitData.redirect_url) {
    const tranIdMatch = payInitData.redirect_url.match(/tran_id=([^&]+)/);
    if (tranIdMatch) tranId = decodeURIComponent(tranIdMatch[1]);
  }
  if (!tranId) {
    try {
      const fs = await import("node:fs");
      const db = JSON.parse(fs.readFileSync("data_storage/db.json", "utf8"));
      const p = db.payments.find(x => x.id === payInitData.payment_id);
      if (p) tranId = p.tran_id;
    } catch {}
  }
  if (!tranId) throw new Error("Could not extract tran_id from payment response or database!");
  console.log(`  - Resolved Transaction ID: ${tranId}`);

  // --- Step 5: Simulate Payment Confirmation Callback ---
  console.log("\n[Step 5] Processing payment confirmation callback/webhook...");
  const webhookRes = await fetch(`${BASE_URL}/api/v1/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tran_id: tranId,
      status: "VALID",
      card_type: "BKASH",
      val_id: `BKASH-TRX-${Date.now()}`
    })
  });

  if (!webhookRes.ok) {
    const err = await webhookRes.text();
    throw new Error(`Payment webhook failed (${webhookRes.status}): ${err}`);
  }
  const webhookData = await webhookRes.json();
  console.log(`✓ Payment confirmed: Status ${webhookData.status}, Paid: ৳${webhookData.amount_paid}, Due: ৳${webhookData.amount_due}`);

  // --- Step 6: Verify Clearance Ticket API & Token ---
  console.log("\n[Step 6] Testing Clearance Ticket API...");
  const ticketApiRes = await fetch(`${BASE_URL}/api/v1/tickets/${booking.id}`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  if (!ticketApiRes.ok) {
    const err = await ticketApiRes.text();
    throw new Error(`Ticket API failed (${ticketApiRes.status}): ${err}`);
  }
  const ticketData = await ticketApiRes.json();
  console.log(`✓ Clearance Ticket retrieved successfully!`);
  console.log(`  - Status: ${ticketData.visibility_status}, Visible: ${ticketData.is_visible}`);
  console.log(`  - Booking status: ${ticketData.booking.status}`);
  console.log(`  - Clearance Token: ${ticketData.clearance_token ? ticketData.clearance_token.slice(0, 20) + "..." : "NONE"}`);
  if (ticketData.booking.status !== "confirmed_advance_paid") {
    throw new Error(`Expected booking status 'confirmed_advance_paid', got: ${ticketData.booking.status}`);
  }
  const clearanceToken = ticketData.clearance_token;
  if (!clearanceToken) throw new Error("Missing clearance token on advance paid booking!");

  // --- Step 7: Test Clearance Page Endpoint ---
  console.log("\n[Step 7] Testing GET /api/v1/clearance/[bookingId] with clearance token...");
  const clearanceRes = await fetch(`${BASE_URL}/api/v1/clearance/${booking.id}?token=${encodeURIComponent(clearanceToken)}`);
  if (!clearanceRes.ok) {
    const err = await clearanceRes.text();
    throw new Error(`Clearance API failed (${clearanceRes.status}): ${err}`);
  }
  const clearanceData = await clearanceRes.json();
  console.log(`✓ Clearance API: Status "${clearanceData.status}" - ${clearanceData.message}`);
  console.log(`  - Amount Due: ৳${clearanceData.amount_due}`);
  if (clearanceData.status !== "due_pending") {
    throw new Error(`Expected clearance status 'due_pending', got: ${clearanceData.status}`);
  }

  // --- Step 8: Pay Remaining Due Balance (Host Cash Settle / Clearance Pay) ---
  console.log("\n[Step 8] Completing Due Balance Settlement (Tour Host Settle / Full Clearance)...");
  // Admin logs in to act as staff settling the tour day cash payment
  const staffLoginRes = await fetch(`${BASE_URL}/api/v1/auth/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "admin",
      password: "adminpassword123"
    })
  });
  if (!staffLoginRes.ok) throw new Error("Staff login failed for balance settlement!");
  const staffTokens = await staffLoginRes.json();
  const staffToken = staffTokens.access || staffTokens.access_token;

  const settleRes = await fetch(`${BASE_URL}/api/v1/clearance/${booking.id}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffToken}`
    },
    body: JSON.stringify({
      method: "host_cash",
      token: clearanceToken
    })
  });

  if (!settleRes.ok) {
    const err = await settleRes.text();
    throw new Error(`Due payment settlement failed (${settleRes.status}): ${err}`);
  }
  const settleData = await settleRes.json();
  console.log(`✓ Due balance settled successfully!`);
  console.log(`  - Result: ${settleData.status} - ${settleData.message}`);
  console.log(`  - Total Paid: ৳${settleData.booking.amount_paid}, Remaining Due: ৳${settleData.booking.amount_due}`);
  console.log(`  - Cleared: ${settleData.booking.is_cleared}`);

  // --- Step 9: Re-verify Clearance Status After Full Payment ---
  console.log("\n[Step 9] Re-checking Clearance API after full settlement...");
  const clearedCheckRes = await fetch(`${BASE_URL}/api/v1/clearance/${booking.id}?token=${encodeURIComponent(clearanceToken)}`);
  const clearedCheck = await clearedCheckRes.json();
  console.log(`✓ Clearance API: Status "${clearedCheck.status}" - ${clearedCheck.message}`);
  if (clearedCheck.status !== "verified") {
    throw new Error(`Expected clearance status 'verified', got: ${clearedCheck.status}`);
  }

  // --- Step 10: Verify Public HTML Pages (SSR) ---
  console.log("\n[Step 10] Testing Public HTML pages for Ticket & Clearance...");
  const ticketPageRes = await fetch(`${BASE_URL}/tickets/${booking.id}?token=${encodeURIComponent(clearanceToken)}`);
  console.log(`✓ /tickets/${booking.id} HTML page returned status ${ticketPageRes.status}`);
  if (!ticketPageRes.ok) throw new Error(`Ticket page returned ${ticketPageRes.status}`);

  const clearancePageRes = await fetch(`${BASE_URL}/clearance/${booking.id}?token=${encodeURIComponent(clearanceToken)}`);
  console.log(`✓ /clearance/${booking.id} HTML page returned status ${clearancePageRes.status}`);
  if (!clearancePageRes.ok) throw new Error(`Clearance page returned ${clearancePageRes.status}`);

  // --- Step 11: Verify Admin Dashboard Visibility ---
  console.log("\n[Step 11] Verifying Staff Admin Dashboard booking and customer lists...");
  const adminBookingsRes = await fetch(`${BASE_URL}/api/v1/admin/bookings`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  if (!adminBookingsRes.ok) throw new Error("Admin bookings fetch failed!");
  const adminBookingsData = await adminBookingsRes.json();
  const foundAdminBooking = (adminBookingsData.results || []).find(b => b.id === booking.id || b.reference === booking.reference);
  if (!foundAdminBooking) throw new Error("Booking not found in admin bookings list!");
  console.log(`✓ Booking found in Admin Dashboard:`);
  console.log(`  - Ref: ${foundAdminBooking.reference} | Customer: ${foundAdminBooking.customer_full_name} | Seats: ${foundAdminBooking.selected_seats?.join(", ")}`);
  console.log(`  - Status: ${foundAdminBooking.status} | Paid: ৳${foundAdminBooking.amount_paid} | Due: ৳${foundAdminBooking.amount_due}`);

  const adminCustomersRes = await fetch(`${BASE_URL}/api/v1/admin/customers`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  if (!adminCustomersRes.ok) throw new Error("Admin customers fetch failed!");
  const adminCustomersData = await adminCustomersRes.json();
  const foundCustomer = (adminCustomersData.results || []).find(c => c.phone_number?.includes("01906557845") || c.full_name === "Arko final");
  if (!foundCustomer) throw new Error("Customer 'Arko final' not found in admin customers list!");
  console.log(`✓ Customer found in Admin Customers CRM:`);
  console.log(`  - Name: ${foundCustomer.full_name} | Phone: ${foundCustomer.phone_number}`);
  console.log(`  - Bookings Count: ${foundCustomer.bookings_count} | Total Spent: ৳${foundCustomer.total_spent}`);

  console.log("\n=====================================================================");
  console.log("🎉 ALL THOROUGH BOOKING & LIFECYCLE TESTS COMPLETED SUCCESSFULLY! 🎉");
  console.log("Booking Reference: " + booking.reference);
  console.log("Customer: " + booking.customer_full_name + " (" + booking.customer_phone_number + ")");
  console.log("Tour: " + tour.title);
  console.log("Seats: " + selectedSeats.join(", "));
  console.log("=====================================================================");
}

run().catch((err) => {
  console.error("\n❌ THOROUGH BOOKING TEST FAILED:", err);
  process.exit(1);
});
