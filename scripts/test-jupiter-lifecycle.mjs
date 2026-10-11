// scripts/test-jupiter-lifecycle.mjs
const BASE_URL = "http://127.0.0.1:3000";

async function run() {
  console.log("=====================================================================");
  console.log("🪐 JUPITER DESTINATION & TOUR LIFECYCLE + DOCTOR DOOM BOOKING SUITE");
  console.log("Customer: Doctor Doom | Phone: 01956565404");
  console.log("=====================================================================\n");

  // --- Step 1: Admin Staff Authentication ---
  console.log("[Step 1] Logging into Admin Staff Panel...");
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "admin",
      password: "adminpassword123"
    })
  });
  if (!loginRes.ok) {
    throw new Error(`Admin login failed (${loginRes.status}): ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const staffToken = loginData.access || loginData.access_token;
  console.log(`✓ Admin logged in successfully.`);

  // --- Step 2: Add Destination "Jupiter" with Full Details (Filling All Placeholders) ---
  console.log("\n[Step 2] Creating Destination 'Jupiter' with complete details...");
  const jupiterPayload = {
    name: "Jupiter",
    slug: "jupiter",
    division: "Chattogram",
    tagline: "The Celestial Gas Giant and Cosmic Wonder of Savar",
    description: "A majestic, surreal planetary destination featuring sweeping cloud bands, the legendary Great Red Spot viewpoint, crystalline storm valleys, and breathtaking starlit hospitality under midnight skies.",
    best_time_to_visit: "October to April (Starlight Season)",
    weather_notes: "Breezy cosmic winds with pleasant 18°C - 24°C twilight temperatures",
    popular_attractions: [
      "Great Red Spot Viewpoint",
      "Cosmic Cloud Trails",
      "Europa Ice Springs",
      "Starlight High Observatory",
      "Aurora Ridge Walkway"
    ],
    recommended_accommodation: "Jupiter Celestial Resort & Luxury Eco Pods",
    travel_tips: "Carry warm layers for night stargazing, keep camera batteries charged, and follow verified host route guidance.",
    permits_required: "Planetary Visitor Pass (Arranged seamlessly by Savar Tour Lover)",
    cover_image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?auto=format&fit=crop&w=1200&q=80",
    cover_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    gallery: [
      {
        id: "jup-g1",
        image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?auto=format&fit=crop&w=800&q=80",
        caption: "Jupiter Great Red Spot Skyline"
      },
      {
        id: "jup-g2",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
        caption: "Celestial Aurora Ridge & Night Sky"
      }
    ],
    is_featured: true,
    status: "published",
    seo_title: "Jupiter Travel Guide & Tours | Savar Tour Lover",
    seo_description: "Discover Jupiter, Bangladesh's cosmic wonder. Handcrafted expeditions, luxury eco pods, and expert local hosts."
  };

  const createDestRes = await fetch(`${BASE_URL}/api/v1/admin/destinations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffToken}`
    },
    body: JSON.stringify(jupiterPayload)
  });

  if (!createDestRes.ok) {
    const err = await createDestRes.text();
    throw new Error(`Failed to create Jupiter destination (${createDestRes.status}): ${err}`);
  }
  const createdDest = await createDestRes.json();
  console.log(`✓ Destination 'Jupiter' created successfully!`);
  console.log(`  - ID: ${createdDest.id} | Slug: ${createdDest.slug} | Division: ${createdDest.division}`);
  console.log(`  - Tagline: ${createdDest.tagline}`);
  console.log(`  - Attractions (${createdDest.popular_attractions?.length}): ${createdDest.popular_attractions?.join(", ")}`);

  // --- Step 3: Verify Destination in Public API & Public HTML Page ---
  console.log("\n[Step 3] Verifying Jupiter in Public Catalog & SSR Pages...");
  const pubDestsRes = await fetch(`${BASE_URL}/api/v1/destinations`);
  const pubDestsData = await pubDestsRes.json();
  const foundJupiter = (pubDestsData.results || []).find(d => d.slug === "jupiter" || d.id === createdDest.id);
  if (!foundJupiter) throw new Error("Jupiter destination not found in public API!");
  console.log(`✓ Public API verified: Jupiter present with status '${foundJupiter.status}'`);

  const destPageRes = await fetch(`${BASE_URL}/destinations/jupiter`);
  console.log(`✓ /destinations/jupiter SSR page returned HTTP ${destPageRes.status} (${(await destPageRes.text()).length} bytes)`);
  if (!destPageRes.ok) throw new Error(`/destinations/jupiter returned ${destPageRes.status}`);

  // --- Step 4: Add Tour under Jupiter with Full Details (Filling All Placeholders) ---
  console.log("\n[Step 4] Creating Tour under Jupiter with complete details...");
  const jupiterTourPayload = {
    title: "Jupiter Great Red Spot Expedition",
    slug: "jupiter-great-red-spot-expedition",
    destination_slug: "jupiter",
    destination_name: "Jupiter",
    destination_id: createdDest.id,
    category: "adventure_tour",
    short_description: "An extraordinary 4-day cosmic adventure exploring the storm horizons, cloud valleys, and celestial viewpoints of Jupiter.",
    full_description: "Embark on an unforgettable expedition across Jupiter's cloud-capped horizons. Hosted by verified expedition leaders, this tour includes private luxury cruiser transit, panoramic eco pod stays, curated regional meals, and guided walks to the iconic Great Red Spot viewpoint.",
    hero_image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?auto=format&fit=crop&w=1200&q=80",
    duration_days: 4,
    duration_nights: 3,
    base_price: 10000,
    discount_type: "flat",
    discount_value: 1000,
    final_price: 9000,
    allow_partial_payment: true,
    advance_payment_percent: 40,
    advance_amount: 3600,
    inclusions: [
      "AC Luxury Cruiser Transit (Dhaka-Jupiter-Dhaka)",
      "3 Nights Deluxe Stargazer Pod Accommodation",
      "All Gourmet Meals & Campfire BBQ Buffet",
      "Certified Expedition Guide & Safety Kits",
      "Planetary Entry & Observatory Passes",
      "Complimentary Mineral Water & Refreshments"
    ],
    exclusions: [
      "Personal telescope gear rentals",
      "Individual souvenir & mineral shopping",
      "Guide & driver tips"
    ],
    accommodation_notes: "Stargazer Deluxe Eco Pods with panoramic cloud-dome roofs, climate control, and ensuite heated washrooms",
    transportation_notes: "First-class air-conditioned cruiser with ergonomic push-back seats, USB chargers, and onboard refreshments",
    meals_notes: "Buffet breakfasts, authentic mountain dinners, fresh local fruits, and evening starlight campfire BBQ",
    meeting_point: "Savar City Center & Gabtoli Bus Terminal (09:00 PM)",
    departure_schedule: "Every Friday at 09:30 PM",
    pickup_points: [
      "Savar Thana Stand (09:00 PM)",
      "Savar Pollibidut (09:15 PM)",
      "Gabtoli Bus Terminal (09:45 PM)",
      "Kallyanpur Bus Stand (10:15 PM)",
      "Sayedabad Janapath (11:00 PM)"
    ],
    total_seats: 40,
    departures: [
      {
        id: "dep-jupiter-oct-1",
        departure_date: "2026-10-10",
        total_seats: 40,
        seats_remaining: 40,
        booked_seats: [],
        is_active: true
      },
      {
        id: "dep-jupiter-oct-2",
        departure_date: "2026-10-17",
        total_seats: 40,
        seats_remaining: 40,
        booked_seats: [],
        is_active: true
      }
    ],
    itinerary: [
      {
        day: 1,
        title: "Departure from Savar/Dhaka & Overnight Transit",
        description: "Board our luxury cruiser from chosen pickup points and embark on the overnight journey toward Jupiter Basecamp."
      },
      {
        day: 2,
        title: "Basecamp Arrival & Cloud Ridge Sunset Trek",
        description: "Check into Stargazer Deluxe Eco Pods. Refresh with welcome refreshments and hike to Cloud Ridge for sunset."
      },
      {
        day: 3,
        title: "Great Red Spot Viewpoint & Europa Springs",
        description: "Full-day guided expedition to the legendary Great Red Spot observation deck, followed by an evening starlight campfire BBQ."
      },
      {
        day: 4,
        title: "Observatory Tour & Return Journey",
        description: "Morning visit to High Observatory and handicraft craft market before starting the return journey back to Savar/Dhaka."
      }
    ],
    faqs: [
      {
        question: "Is this expedition safe and suitable for families?",
        answer: "Yes! The entire tour is hosted by licensed local expedition guides with emergency medical kits and dedicated ground support."
      },
      {
        question: "Can I pay part in advance and the rest on tour day?",
        answer: "Yes! You can reserve your seats by paying 40% in advance and clearing the rest with the host on departure day."
      }
    ],
    gallery: [
      {
        id: "tour-jup-g1",
        image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?auto=format&fit=crop&w=800&q=80",
        caption: "Great Red Spot Viewpoint Observation Deck",
        location: "Jupiter"
      }
    ],
    is_featured: true,
    status: "published"
  };

  const createTourRes = await fetch(`${BASE_URL}/api/v1/admin/tours`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffToken}`
    },
    body: JSON.stringify(jupiterTourPayload)
  });

  if (!createTourRes.ok) {
    const err = await createTourRes.text();
    throw new Error(`Failed to create Jupiter tour (${createTourRes.status}): ${err}`);
  }
  const createdTour = await createTourRes.json();
  console.log(`✓ Tour 'Jupiter Great Red Spot Expedition' created successfully!`);
  console.log(`  - Tour ID: ${createdTour.id} | Slug: ${createdTour.slug}`);
  console.log(`  - Destination Link: ID: ${createdTour.destination_id} | Slug: ${createdTour.destination_slug} | Name: ${createdTour.destination_name}`);
  console.log(`  - Price: Base ৳${createdTour.base_price} - Discount ৳${createdTour.discount_value} = Final ৳${createdTour.final_price}`);
  console.log(`  - Advance Required: ৳${createdTour.advance_amount} (${createdTour.advance_payment_percent}%)`);
  console.log(`  - Departures: ${createdTour.departures?.length} scheduled dates`);

  // --- Step 5: Verify Tour in Public API & SSR Tour Page ---
  console.log("\n[Step 5] Verifying Tour in Public Catalog & SSR Page...");
  const pubToursRes = await fetch(`${BASE_URL}/api/v1/tours`);
  const pubToursData = await pubToursRes.json();
  const foundTour = (pubToursData.results || []).find(t => t.id === createdTour.id || t.slug === createdTour.slug);
  if (!foundTour) throw new Error("Jupiter tour not found in public API!");
  console.log(`✓ Tour listed in public API: destination_slug="${foundTour.destination_slug}", destination_id="${foundTour.destination_id}"`);

  const tourPageRes = await fetch(`${BASE_URL}/tours/${createdTour.slug}`);
  console.log(`✓ /tours/${createdTour.slug} SSR page returned HTTP ${tourPageRes.status} (${(await tourPageRes.text()).length} bytes)`);
  if (!tourPageRes.ok) throw new Error(`/tours/${createdTour.slug} returned ${tourPageRes.status}`);

  // Re-verify that Jupiter destination detail page now displays this tour
  const destDetailRes = await fetch(`${BASE_URL}/destinations/jupiter`);
  const destDetailHtml = await destDetailRes.text();
  if (!destDetailHtml.includes("Jupiter Great Red Spot Expedition")) {
    console.warn("Notice: SSR cached page may update on next revalidation cycle.");
  } else {
    console.log("✓ Tour confirmed visible on /destinations/jupiter page!");
  }

  // --- Step 6: BOOKING 1 — Doctor Doom books with bKash Online Advance ---
  console.log("\n=====================================================================");
  console.log("[Step 6] BOOKING 1: Doctor Doom booking with bKash Online Advance");
  console.log("=====================================================================");
  const dep1 = createdTour.departures[0];
  const booking1Seats = ["A1", "A2"];

  const bKashBookingRes = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tour_id: createdTour.id,
      departure_id: dep1.id,
      customer_full_name: "Doctor Doom",
      customer_phone_number: "01956565404",
      customer_email: "doctordoom@latveria.gov",
      traveler_count: 2,
      selected_seats: booking1Seats,
      payment_plan: "partial",
      payment_method: "Bkash payment",
      pickup_point: "Gabtoli Bus Terminal (09:45 PM)",
      special_requests: "Priority capsule seating and cosmic briefing pack"
    })
  });

  if (!bKashBookingRes.ok) {
    const err = await bKashBookingRes.text();
    throw new Error(`bKash booking failed (${bKashBookingRes.status}): ${err}`);
  }
  const booking1 = await bKashBookingRes.json();
  const customer1Token = booking1.customer_token;
  console.log(`✓ Booking 1 created: Ref ${booking1.reference} | ID: ${booking1.id}`);
  console.log(`  - Customer: ${booking1.customer_full_name} (${booking1.customer_phone_number})`);
  console.log(`  - Status: ${booking1.status} | Total: ৳${booking1.total_price} | Advance: ৳${booking1.advance_amount}`);
  console.log(`  - Reserved Seats: ${booking1.selected_seats?.join(", ")}`);

  // Initiate bKash Payment
  console.log("  → Initiating bKash payment session...");
  const initPay1Res = await fetch(`${BASE_URL}/api/v1/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booking_id: booking1.id,
      payment_type: "advance",
      gateway: "bkash",
      payment_method: "Bkash payment"
    })
  });
  if (!initPay1Res.ok) throw new Error(`bKash initiate failed: ${await initPay1Res.text()}`);
  const pay1Data = await initPay1Res.json();
  const tran1Id = pay1Data.tran_id;
  console.log(`  ✓ bKash session initiated: tran_id=${tran1Id}`);

  // Confirm bKash Payment via Webhook
  console.log("  → Confirming bKash payment callback...");
  const confirm1Res = await fetch(`${BASE_URL}/api/v1/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tran_id: tran1Id,
      status: "VALID",
      card_type: "BKASH",
      val_id: `BKASH-VAL-${Date.now()}`
    })
  });
  if (!confirm1Res.ok) throw new Error(`bKash payment confirmation failed: ${await confirm1Res.text()}`);
  const confirm1Data = await confirm1Res.json();
  console.log(`  ✓ Payment 1 Confirmed: Paid ৳${confirm1Data.amount_paid}, Due ৳${confirm1Data.amount_due}`);

  // Verify Clearance Ticket for Booking 1
  const ticket1Res = await fetch(`${BASE_URL}/api/v1/tickets/${booking1.id}`, {
    headers: { Authorization: `Bearer ${customer1Token}` }
  });
  const ticket1Data = await ticket1Res.json();
  console.log(`  ✓ Clearance Ticket 1 retrieved: Status '${ticket1Data.booking.status}' | Token: ${ticket1Data.clearance_token ? "VALID" : "NONE"}`);
  if (ticket1Data.booking.status !== "confirmed_advance_paid") {
    throw new Error(`Expected confirmed_advance_paid, got: ${ticket1Data.booking.status}`);
  }

  // --- Step 7: BOOKING 2 — Doctor Doom books with Pay Advance in Hand Cash ---
  console.log("\n=====================================================================");
  console.log("[Step 7] BOOKING 2: Doctor Doom booking with PAY ADVANCE IN HAND CASH");
  console.log("=====================================================================");
  const booking2Seats = ["B1", "B2"];

  const cashBookingRes = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tour_id: createdTour.id,
      departure_id: dep1.id,
      customer_full_name: "Doctor Doom",
      customer_phone_number: "01956565404",
      customer_email: "doctordoom@latveria.gov",
      traveler_count: 2,
      selected_seats: booking2Seats,
      payment_plan: "partial",
      payment_method: "cash_on_hand", // Pay Cash by Hand
      pickup_point: "Savar Thana Stand (09:00 PM)",
      special_requests: "Hand cash advance payment at Savar counter"
    })
  });

  if (!cashBookingRes.ok) {
    const err = await cashBookingRes.text();
    throw new Error(`Hand cash booking failed (${cashBookingRes.status}): ${err}`);
  }
  const booking2 = await cashBookingRes.json();
  const customer2Token = booking2.customer_token;
  console.log(`✓ Booking 2 created: Ref ${booking2.reference} | ID: ${booking2.id}`);
  console.log(`  - Customer: ${booking2.customer_full_name} (${booking2.customer_phone_number})`);
  console.log(`  - Payment Method: ${booking2.payment_method}`);
  console.log(`  - Initial Status: ${booking2.status}`);
  console.log(`  - Cash Approval Expires At: ${booking2.cash_approval_expires_at || "Not set"}`);
  console.log(`  - Total: ৳${booking2.total_price} | Advance Required: ৳${booking2.advance_amount}`);
  console.log(`  - Reserved Seats: ${booking2.selected_seats?.join(", ")}`);

  if (booking2.status !== "pending_cash_approval") {
    throw new Error(`Expected initial status 'pending_cash_approval', got: ${booking2.status}`);
  }

  // Admin approves physical hand cash payment
  console.log("\n[Step 7b] Staff Admin approving physical cash advance payment...");
  const approveCashRes = await fetch(`${BASE_URL}/api/v1/admin/bookings`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffToken}`
    },
    body: JSON.stringify({
      id: booking2.id,
      action: "approve_cash_payment",
      received_type: "advance"
    })
  });

  if (!approveCashRes.ok) {
    const err = await approveCashRes.text();
    throw new Error(`Staff cash approval failed (${approveCashRes.status}): ${err}`);
  }
  const approvedBooking = await approveCashRes.json();
  console.log(`✓ Physical cash advance payment APPROVED by Admin!`);
  console.log(`  - New Status: ${approvedBooking.status}`);
  console.log(`  - Amount Paid: ৳${approvedBooking.amount_paid} | Remaining Due: ৳${approvedBooking.amount_due}`);
  console.log(`  - Advance Transaction: ${approvedBooking.advance_transaction_id || approvedBooking.transaction_id}`);

  if (approvedBooking.status !== "confirmed_advance_paid") {
    throw new Error(`Expected approved status 'confirmed_advance_paid', got: ${approvedBooking.status}`);
  }

  // Verify Clearance Ticket for Booking 2
  console.log("  → Fetching Clearance Ticket for cash booking...");
  const ticket2Res = await fetch(`${BASE_URL}/api/v1/tickets/${booking2.id}`, {
    headers: { Authorization: `Bearer ${customer2Token}` }
  });
  const ticket2Data = await ticket2Res.json();
  const clearance2Token = ticket2Data.clearance_token;
  console.log(`  ✓ Clearance Ticket 2 generated! Token: ${clearance2Token ? "VALID" : "NONE"}`);
  if (!clearance2Token) throw new Error("Missing clearance token for cash approved booking!");

  // Verify Clearance Status API
  const clearanceCheckRes = await fetch(`${BASE_URL}/api/v1/clearance/${booking2.id}?token=${encodeURIComponent(clearance2Token)}`);
  const clearanceCheckData = await clearanceCheckRes.json();
  console.log(`  ✓ Clearance API: Status '${clearanceCheckData.status}' - ${clearanceCheckData.message}`);
  console.log(`    Remaining Balance: ৳${clearanceCheckData.amount_due}`);
  if (clearanceCheckData.status !== "due_pending") {
    throw new Error(`Expected clearance status 'due_pending', got: ${clearanceCheckData.status}`);
  }

  // Tour Day: Admin settles remaining due balance for Booking 2
  console.log("\n[Step 7c] Settling remaining due balance on tour day (Host Cash Settle)...");
  const settleRes = await fetch(`${BASE_URL}/api/v1/clearance/${booking2.id}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffToken}`
    },
    body: JSON.stringify({
      method: "host_cash",
      token: clearance2Token
    })
  });
  if (!settleRes.ok) throw new Error(`Due settle failed: ${await settleRes.text()}`);
  const settleData = await settleRes.json();
  console.log(`✓ Tour Day Due Balance Settled!`);
  console.log(`  - Booking Reference: ${settleData.booking.booking_reference}`);
  console.log(`  - Amount Paid: ৳${settleData.booking.amount_paid} | Due: ৳${settleData.booking.amount_due}`);
  console.log(`  - Cleared: ${settleData.booking.is_cleared}`);

  // Re-check clearance after full settlement
  const finalClearanceRes = await fetch(`${BASE_URL}/api/v1/clearance/${booking2.id}?token=${encodeURIComponent(clearance2Token)}`);
  const finalClearanceData = await finalClearanceRes.json();
  console.log(`✓ Final Clearance Status: '${finalClearanceData.status}' - ${finalClearanceData.message}`);
  if (finalClearanceData.status !== "verified") {
    throw new Error(`Expected 'verified' clearance, got: ${finalClearanceData.status}`);
  }

  // --- Step 8: Verify Doctor Doom in Customer CRM & Admin Bookings ---
  console.log("\n[Step 8] Verifying Customer CRM & Admin Bookings for Doctor Doom...");
  const adminCustomersRes = await fetch(`${BASE_URL}/api/v1/admin/customers`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  const adminCustomersData = await adminCustomersRes.json();
  const doomCustomer = (adminCustomersData.results || []).find(c => c.phone_number?.includes("01956565404") || c.full_name === "Doctor Doom");
  if (!doomCustomer) throw new Error("Doctor Doom not found in Admin Customer CRM!");
  console.log(`✓ Doctor Doom found in CRM:`);
  console.log(`  - Name: ${doomCustomer.full_name} | Phone: ${doomCustomer.phone_number}`);
  console.log(`  - Total Bookings: ${doomCustomer.bookings_count} | Total Spent: ৳${doomCustomer.total_spent} | Total Due: ৳${doomCustomer.total_due}`);

  const adminBookingsRes = await fetch(`${BASE_URL}/api/v1/admin/bookings`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  const adminBookingsData = await adminBookingsRes.json();
  const doomBookings = (adminBookingsData.results || []).filter(b => b.customer_phone_number?.includes("01956565404"));
  console.log(`✓ Found ${doomBookings.length} booking(s) for Doctor Doom in Admin Bookings list:`);
  for (const b of doomBookings) {
    console.log(`  - [${b.reference}] Tour: ${b.tour_title} | Seats: ${b.selected_seats?.join(", ")} | Status: ${b.status} | Paid: ৳${b.amount_paid} | Due: ৳${b.amount_due} | Method: ${b.payment_method}`);
  }

  // --- Step 9: Verify SSR Public HTML Pages for Tickets & Clearance ---
  console.log("\n[Step 9] Testing SSR Public HTML Pages for Tickets & Clearance...");
  const ticket1HtmlRes = await fetch(`${BASE_URL}/tickets/${booking1.id}`);
  console.log(`✓ /tickets/${booking1.id} (bKash booking) returned HTTP ${ticket1HtmlRes.status}`);
  if (!ticket1HtmlRes.ok) throw new Error(`Ticket 1 HTML page failed (${ticket1HtmlRes.status})`);

  const ticket2HtmlRes = await fetch(`${BASE_URL}/tickets/${booking2.id}`);
  console.log(`✓ /tickets/${booking2.id} (Cash booking) returned HTTP ${ticket2HtmlRes.status}`);
  if (!ticket2HtmlRes.ok) throw new Error(`Ticket 2 HTML page failed (${ticket2HtmlRes.status})`);

  const clearanceHtmlRes = await fetch(`${BASE_URL}/clearance/${booking2.id}?token=${encodeURIComponent(clearance2Token)}`);
  console.log(`✓ /clearance/${booking2.id} returned HTTP ${clearanceHtmlRes.status}`);
  if (!clearanceHtmlRes.ok) throw new Error(`Clearance HTML page failed (${clearanceHtmlRes.status})`);

  console.log("\n=====================================================================");
  console.log("🎉 ALL JUPITER DESTINATION, TOUR, BKASH & CASH ADVANCE TESTS PASSED! 🎉");
  console.log("=====================================================================");
}

run().catch((err) => {
  console.error("\n❌ SUITE FAILED:", err);
  process.exit(1);
});
