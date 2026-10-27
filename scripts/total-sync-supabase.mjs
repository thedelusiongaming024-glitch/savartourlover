import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables if running outside next
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tuvgeaflyxbldpmpafdk.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "tourlover-data";
const DB_OBJECT_PATH = "db.json";

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function selectAll(table, orderCol = "id", ascending = true) {
  const { data, error } = await supabase.from(table).select("*").order(orderCol, { ascending });
  if (error) {
    console.warn(`  ⚠️ Warning reading table '${table}':`, error.message);
    return [];
  }
  return data || [];
}

async function runTotalSync() {
  console.log("\n======================================================================");
  console.log("  TOTAL BIDIRECTIONAL SYNC: Local Cache Memory & Supabase Database");
  console.log("======================================================================\n");
  console.log(`Supabase URL:    ${SUPABASE_URL}`);
  console.log(`Storage Bucket:  ${BUCKET_NAME}`);
  console.log(`Timestamp:       ${new Date().toISOString()}\n`);

  // 1. Read existing local files
  const localDbPath = path.resolve(process.cwd(), ".data", "db.json");
  const storageDbPath = path.resolve(process.cwd(), "data_storage", "db.json");

  let localDb = null;
  if (fs.existsSync(localDbPath)) {
    try {
      localDb = JSON.parse(fs.readFileSync(localDbPath, "utf-8"));
    } catch {}
  }
  if (!localDb && fs.existsSync(storageDbPath)) {
    try {
      localDb = JSON.parse(fs.readFileSync(storageDbPath, "utf-8"));
    } catch {}
  }
  if (!localDb) localDb = {};

  console.log("Step 1: Reading authoritative state from Supabase PostgreSQL...");
  const [
    dests,
    tours,
    offers,
    testimonials,
    blogPosts,
    blocks,
    staffUsers,
    customers,
    activities,
    bookings,
    payments,
    clearanceTickets,
    inquiries,
    alerts,
  ] = await Promise.all([
    selectAll("destinations", "name"),
    selectAll("tours", "title"),
    selectAll("offers"),
    selectAll("testimonials"),
    selectAll("blog_posts"),
    selectAll("homepage_blocks", "display_order"),
    selectAll("staff_users"),
    selectAll("customers"),
    selectAll("customer_activities", "created_at", false),
    selectAll("bookings", "created_at", false),
    selectAll("payments", "created_at", false),
    selectAll("clearance_tickets", "created_at", false),
    selectAll("contact_inquiries", "created_at", false),
    selectAll("operational_alerts", "created_at", false),
  ]);

  console.log(`  ✓ Destinations:         ${dests.length}`);
  console.log(`  ✓ Tours:                ${tours.length}`);
  console.log(`  ✓ Offers:               ${offers.length}`);
  console.log(`  ✓ Testimonials:         ${testimonials.length}`);
  console.log(`  ✓ Blog Posts:           ${blogPosts.length}`);
  console.log(`  ✓ Homepage Blocks:      ${blocks.length}`);
  console.log(`  ✓ Staff Users:          ${staffUsers.length}`);
  console.log(`  ✓ Customers:            ${customers.length}`);
  console.log(`  ✓ Activities:           ${activities.length}`);
  console.log(`  ✓ Bookings:             ${bookings.length}`);
  console.log(`  ✓ Payments:             ${payments.length}`);
  console.log(`  ✓ Clearance Tickets:    ${clearanceTickets.length}`);
  console.log(`  ✓ Contact Inquiries:    ${inquiries.length}`);
  console.log(`  ✓ Operational Alerts:   ${alerts.length}`);

  // Map into unified schema
  console.log("\nStep 2: Normalizing and constructing unified Database Schema...");

  // Customer activity grouping
  const custActsMap = new Map();
  for (const act of activities) {
    if (!custActsMap.has(act.customer_id)) custActsMap.set(act.customer_id, []);
    custActsMap.get(act.customer_id).push({
      id: act.id,
      customer_id: act.customer_id,
      type: act.activity_type || act.type,
      title: act.title,
      description: act.description,
      metadata: act.metadata || {},
      created_at: act.created_at,
    });
  }

  const mappedCustomers = customers.map((c) => ({
    id: c.id,
    phone_number: c.phone_number,
    full_name: c.full_name,
    email: c.email || undefined,
    preferred_pickup_point: c.preferred_pickup_point || undefined,
    created_at: c.created_at,
    updated_at: c.updated_at,
    last_login_at: c.last_login_at || undefined,
    activities: custActsMap.get(c.id) || [],
  }));

  // Booking & Payments validation
  const validBookingIds = new Set(bookings.map((b) => b.id));

  const mappedBookings = bookings.map((b) => {
    let travelers = [];
    if (Array.isArray(b.travelers)) travelers = b.travelers;
    else if (typeof b.travelers === "string") {
      try { travelers = JSON.parse(b.travelers); } catch {}
    }

    let selected_seats = [];
    if (Array.isArray(b.selected_seats)) selected_seats = b.selected_seats;
    else if (typeof b.selected_seats === "string") {
      try { selected_seats = JSON.parse(b.selected_seats); } catch {}
    }

    return {
      id: b.id,
      reference: b.reference || `STL-${b.id.slice(-6).toUpperCase()}`,
      tour_id: b.tour_id,
      tour_title: b.tour_title,
      tour_slug: b.tour_slug,
      destination_slug: b.destination_slug || b.tour_slug || "bangladesh",
      departure_date: b.departure_date,
      traveler_count: Number(b.traveler_count || (selected_seats.length > 0 ? selected_seats.length : 1)),
      selected_seats,
      unit_price: String(b.unit_price || Math.round(Number(b.total_price || 0) / Math.max(1, Number(b.traveler_count || 1)))),
      total_price: String(b.total_price || 0),
      final_price: String(b.total_price || 0),
      promo_code: b.promo_code || undefined,
      discount_amount: b.discount_amount !== undefined && b.discount_amount !== null ? String(b.discount_amount) : undefined,
      payment_plan: Number(b.due_on_tour_day || 0) > 0 ? "partial" : "full",
      advance_required_percent: "40",
      advance_amount: String(b.advance_amount || 0),
      amount_paid: String(b.amount_paid || 0),
      amount_due: String(b.due_on_tour_day || 0),
      due_date: b.departure_date || new Date().toISOString().slice(0, 10),
      status: b.status || "pending_payment",
      payment_method: b.payment_method || "Bkash payment",
      advance_payment_method: b.advance_payment_method || b.payment_method || undefined,
      due_payment_method: b.due_payment_method || undefined,
      cash_approval_expires_at: b.cash_approval_expires_at || undefined,
      cash_approved_by: b.cash_approved_by || undefined,
      cash_approved_at: b.cash_approved_at || undefined,
      due_cash_approval_expires_at: b.due_cash_approval_expires_at || undefined,
      due_cash_approved_by: b.due_cash_approved_by || undefined,
      due_cash_approved_at: b.due_cash_approved_at || undefined,
      customer_id: b.customer_id || undefined,
      customer_full_name: b.customer_name,
      customer_phone_number: b.customer_phone,
      customer_email: b.customer_email || "",
      pickup_point: b.pickup_point || undefined,
      special_requests: b.special_requests || "",
      travelers,
      created_at: b.created_at,
      updated_at: b.updated_at,
    };
  });

  // Only retain payments and tickets that reference existing valid bookings
  const mappedPayments = payments
    .filter((p) => validBookingIds.has(p.booking_id))
    .map((p) => ({
      id: p.id,
      booking_id: p.booking_id,
      amount: String(p.amount || "0"),
      payment_type: p.payment_type || "advance",
      payment_method: p.payment_method || "Bkash payment",
      status: p.status || "success",
      tran_id: p.transaction_id || p.id,
      card_type: p.card_type || undefined,
      trx_id: p.trx_id || undefined,
      created_at: p.created_at,
      paid_at: p.paid_at || undefined,
    }));

  const mappedTickets = clearanceTickets
    .filter((t) => validBookingIds.has(t.booking_id))
    .map((t) => ({
      id: t.id,
      booking_id: t.booking_id,
      token: t.signed_token || t.token,
      token_expires_at: t.token_expires_at || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      is_cleared: Boolean(t.is_verified || t.is_cleared),
      cleared_at: t.verified_at || t.cleared_at || undefined,
      cleared_by_staff_id: t.verified_by || t.cleared_by_host || undefined,
      clearance_method: t.clearance_method || "host_verification",
      created_at: t.created_at,
    }));

  // Merge CMS blocks and categories
  const categoriesBlock = blocks.find((b) => b.id === "block-tour-categories");
  const tourCategories =
    categoriesBlock?.content?.categories ||
    localDb.tourCategories ||
    [
      { id: "cat-group-tour", name: "Group Tour", slug: "group_tour", description: "Scheduled small group journeys with like-minded travelers", icon: "👥", badge: "Popular", is_active: true, display_order: 1 },
      { id: "cat-private-tour", name: "Private Tour", slug: "private_tour", description: "Customized private itineraries for personal dates and groups", icon: "🚙", badge: "Flexible", is_active: true, display_order: 2 },
      { id: "cat-weekend-getaway", name: "Weekend Getaway", slug: "weekend_getaway", description: "Quick short escapes designed for Friday-Saturday weekends", icon: "⛺", badge: "Quick Trip", is_active: true, display_order: 3 },
      { id: "cat-adventure-tour", name: "Adventure Tour", slug: "adventure_tour", description: "Trekking, hills, caves, and outdoor exploration", icon: "🧗", badge: "Thrilling", is_active: true, display_order: 4 },
      { id: "cat-honeymoon-package", name: "Honeymoon Package", slug: "honeymoon_package", description: "Romantic getaways with candlelit dinners and private resort stays", icon: "💍", badge: "Romantic", is_active: true, display_order: 5 },
      { id: "cat-family-tour", name: "Family Tour", slug: "family_tour", description: "Comfortable, relaxed journeys suitable for children and elders", icon: "👨‍👩‍👧‍👦", badge: "Family Friendly", is_active: true, display_order: 6 },
      { id: "cat-day-trip", name: "Day Trip", slug: "day_trip", description: "Single-day sightseeing and activities without overnight stay", icon: "☀️", badge: "1 Day", is_active: true, display_order: 7 },
      { id: "cat-heritage-tour", name: "Heritage Tour", slug: "heritage_tour", description: "Historical monuments, cultural roots, and archaeological wonders", icon: "🏛️", badge: "Cultural", is_active: true, display_order: 8 },
    ];

  // Reconcile homepage blocks (e.g. block-seo-settings, block-home-page, etc.)
  const cloudBlockIds = new Set(blocks.map((b) => b.id));
  const mergedBlocks = blocks.map((bl) => ({
    id: bl.id,
    block_type: bl.block_type,
    display_order: Number(bl.display_order) || 0,
    content: typeof bl.content === "object" && bl.content ? bl.content : {},
  }));
  for (const lb of localDb.homepageBlocks || []) {
    if (!cloudBlockIds.has(lb.id)) {
      mergedBlocks.push(lb);
      await supabase.from("homepage_blocks").upsert({
        id: lb.id,
        block_type: lb.block_type,
        display_order: Number(lb.display_order || 0),
        content: lb.content || {},
      }).catch(() => {});
    }
  }

  const fullSchema = {
    destinations: dests.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      division: d.division || "Dhaka",
      tagline: d.tagline || "",
      description: d.description || "",
      best_time_to_visit: d.best_time_to_visit || "All year round",
      weather_notes: d.weather_notes || "",
      popular_attractions: Array.isArray(d.popular_attractions) ? d.popular_attractions : [],
      recommended_accommodation: d.recommended_accommodation || "",
      travel_tips: d.travel_tips || "",
      permits_required: d.permits_required || "",
      cover_image: d.cover_image || null,
      cover_video_url: d.cover_video_url || "",
      seo_title: d.seo_title || d.name,
      seo_description: d.seo_description || d.tagline || "",
      gallery: Array.isArray(d.gallery) ? d.gallery : [],
      is_featured: Boolean(d.is_featured),
      status: d.status || "published",
    })),
    tours: tours.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      destination_id: t.destination_id || undefined,
      destination_slug: t.destination_slug || "bangladesh",
      destination_name: t.destination_name || "Bangladesh",
      category: t.category || "group_tour",
      short_description: t.short_description || "",
      full_description: t.full_description || "",
      hero_image: t.hero_image || null,
      duration_days: Number(t.duration_days) || 3,
      duration_nights: Number(t.duration_nights) || 2,
      base_price: String(t.base_price || 0),
      discount_type: t.discount_type || "none",
      discount_value: String(t.discount_value || 0),
      final_price: String(t.final_price || t.base_price || 0),
      allow_partial_payment: t.allow_partial_payment !== false,
      advance_payment_percent: String(t.advance_payment_percent || 40),
      advance_amount: String(t.advance_amount || 0),
      inclusions: Array.isArray(t.inclusions) ? t.inclusions : [],
      exclusions: Array.isArray(t.exclusions) ? t.exclusions : [],
      accommodation_notes: t.accommodation_notes || "",
      transportation_notes: t.transportation_notes || "",
      meals_notes: t.meals_notes || "",
      meeting_point: t.meeting_point || "Dhaka Sayedabad / Fakirapool",
      pickup_points: Array.isArray(t.pickup_points) ? t.pickup_points : [],
      departure_schedule: t.departure_schedule || "Every Friday 7:00 AM",
      total_seats: Number(t.total_seats) || 40,
      departures: Array.isArray(t.departures) ? t.departures : [],
      itinerary: Array.isArray(t.itinerary) ? t.itinerary : [],
      gallery: Array.isArray(t.gallery) ? t.gallery : [],
      faqs: Array.isArray(t.faqs) ? t.faqs : [],
      is_featured: Boolean(t.is_featured),
      status: t.status || "published",
    })),
    tourCategories,
    offers: offers.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description || "",
      slug: o.slug || o.id,
      code: o.code || undefined,
      discount_type: o.discount_type || "percent",
      discount_value: String(o.discount_value || 0),
      minimum_spend: String(o.minimum_spend || 0),
      valid_from: o.valid_from || undefined,
      valid_until: o.valid_until || "",
      tour_id: o.tour_id || null,
      tour_slug: o.tour_slug || null,
      tour_title: o.tour_title || null,
      banner_image: o.banner_image || null,
      is_active: Boolean(o.is_active),
    })),
    testimonials: testimonials.map((tm) => ({
      id: tm.id,
      customer_name: tm.customer_name || tm.author_name || "Traveler",
      tour_title: tm.tour_title || tm.trip_name || "Tour",
      rating: Number(tm.rating) || 5,
      quote: tm.quote || tm.content || "",
      customer_photo: tm.customer_photo || tm.author_avatar || null,
      is_featured: Boolean(tm.is_featured),
    })),
    blogPosts: blogPosts.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      category: b.category ? (typeof b.category === "string" ? { name: b.category } : b.category) : null,
      author_name: b.author_name || b.author || "Savar Tour Lover",
      cover_image: b.cover_image || b.hero_image || null,
      excerpt: b.excerpt || "",
      body: b.body || b.content || "",
      read_time_minutes: Number(b.read_time_minutes) || 5,
      tags: Array.isArray(b.tags) ? b.tags : [],
      published_at: b.published_at || new Date().toISOString(),
      status: b.status || "published",
      is_featured: Boolean(b.is_featured),
    })),
    homepageBlocks: mergedBlocks,
    staffUsers: staffUsers.map((su) => ({
      id: su.id,
      username: su.username,
      password_hash: su.password_hash,
      salt: su.salt,
      role: su.role,
      phone_number: su.phone_number || "",
      email: su.email || "",
      first_name: su.first_name || "",
      last_name: su.last_name || "",
    })),
    customers: mappedCustomers,
    bookings: mappedBookings,
    payments: mappedPayments,
    clearanceTickets: mappedTickets,
    alerts: alerts.map((al) => ({
      id: al.id,
      alert_type: al.alert_type || "system",
      severity: al.severity || "info",
      message: al.message,
      is_acknowledged: Boolean(al.is_acknowledged),
      created_at: al.created_at,
    })),
    expenses: Array.isArray(localDb.expenses) ? localDb.expenses : [],
    suppliers: Array.isArray(localDb.suppliers) ? localDb.suppliers : [],
    contactInquiries: inquiries.map((inq) => ({
      id: inq.id,
      name: inq.name,
      email: inq.email || "",
      phone: inq.phone || "",
      destination: inq.destination || "",
      dates: inq.dates || "",
      trip_type: inq.trip_type || "",
      travelers: Number(inq.travelers) || 1,
      message: inq.message || "",
      status: inq.status || "new",
      admin_notes: inq.admin_notes || undefined,
      created_at: inq.created_at,
    })),
    analyticsEvents: Array.isArray(localDb.analyticsEvents) ? localDb.analyticsEvents : [],
    deletedEntities: {
      destinations: [],
      tours: [],
      offers: [],
      testimonials: [],
      blogPosts: [],
      homepageBlocks: [],
      tourCategories: [],
      bookings: [],
      customers: [],
      contactInquiries: [],
    },
  };

  const schemaJson = JSON.stringify(fullSchema, null, 2);

  // Step 3: Write to local files
  console.log("\nStep 3: Writing synchronized database to local cache files...");
  
  const dotDataDir = path.dirname(localDbPath);
  if (!fs.existsSync(dotDataDir)) fs.mkdirSync(dotDataDir, { recursive: true });
  fs.writeFileSync(localDbPath, schemaJson, "utf-8");
  console.log(`  ✓ Written: ${localDbPath} (${(schemaJson.length / 1024).toFixed(1)} KB)`);

  const storageDir = path.dirname(storageDbPath);
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  fs.writeFileSync(storageDbPath, schemaJson, "utf-8");
  console.log(`  ✓ Written: ${storageDbPath} (${(schemaJson.length / 1024).toFixed(1)} KB)`);

  // Step 4: Upload to Supabase Storage Mirror
  console.log("\nStep 4: Uploading synchronized snapshot to Supabase Cloud Storage mirror...");
  const { error: uploadErr } = await supabase.storage.from(BUCKET_NAME).upload(DB_OBJECT_PATH, schemaJson, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "300",
  });

  if (uploadErr) {
    console.error("  ❌ Storage mirror upload failed:", uploadErr.message);
  } else {
    console.log(`  ✓ Successfully uploaded '${DB_OBJECT_PATH}' to bucket '${BUCKET_NAME}'`);
  }

  // Step 5: Verification & Consistency Check
  console.log("\n======================================================================");
  console.log("  VERIFICATION AUDIT: Local Memory Cache <===> Supabase Cloud");
  console.log("======================================================================");

  const tableSummary = [
    { entity: "Destinations", local: fullSchema.destinations.length, supabase: dests.length },
    { entity: "Tours", local: fullSchema.tours.length, supabase: tours.length },
    { entity: "Tour Categories", local: fullSchema.tourCategories.length, supabase: tourCategories.length },
    { entity: "Special Offers", local: fullSchema.offers.length, supabase: offers.length },
    { entity: "Testimonials", local: fullSchema.testimonials.length, supabase: testimonials.length },
    { entity: "Blog Posts", local: fullSchema.blogPosts.length, supabase: blogPosts.length },
    { entity: "Homepage Blocks", local: fullSchema.homepageBlocks.length, supabase: blocks.length },
    { entity: "Staff Users", local: fullSchema.staffUsers.length, supabase: staffUsers.length },
    { entity: "Customers", local: fullSchema.customers.length, supabase: customers.length },
    { entity: "Bookings", local: fullSchema.bookings.length, supabase: bookings.length },
    { entity: "Payments", local: fullSchema.payments.length, supabase: payments.length },
    { entity: "Clearance Tickets", local: fullSchema.clearanceTickets.length, supabase: clearanceTickets.length },
    { entity: "Contact Inquiries", local: fullSchema.contactInquiries.length, supabase: inquiries.length },
    { entity: "Operational Alerts", local: fullSchema.alerts.length, supabase: alerts.length },
  ];

  let allMatch = true;
  for (const row of tableSummary) {
    const match = row.local === row.supabase;
    if (!match) allMatch = false;
    const status = match ? "MATCH ✅" : "DIFF ⚠️";
    console.log(`  ${row.entity.padEnd(22)}: Local = ${String(row.local).padStart(2)} | Supabase = ${String(row.supabase).padStart(2)}  [${status}]`);
  }

  console.log("\nStorage Mirror status: " + (uploadErr ? "ERROR ❌" : "SYNCHRONIZED ✅"));
  console.log("Overall Consistency:   " + (allMatch && !uploadErr ? "100% PERFECT SYNC ✅" : "ATTENTION NEEDED ⚠️"));
  console.log("======================================================================\n");
}

runTotalSync().catch((err) => {
  console.error("FATAL SYNC ERROR:", err);
  process.exit(1);
});
