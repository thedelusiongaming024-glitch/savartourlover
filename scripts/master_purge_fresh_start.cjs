const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// 1. Read environment variables from .env.local
const envPath = path.resolve(__dirname, "..", ".env.local");
let SUPABASE_URL = "";
let SUPABASE_SERVICE_ROLE_KEY = "";
let BUCKET_NAME = "tourlover-data";

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
      if (key === "SUPABASE_URL" || (key === "NEXT_PUBLIC_SUPABASE_URL" && !SUPABASE_URL)) {
        SUPABASE_URL = val;
      }
      if (key === "SUPABASE_SERVICE_ROLE_KEY") {
        SUPABASE_SERVICE_ROLE_KEY = val;
      }
      if (key === "SUPABASE_STORAGE_BUCKET") {
        BUCKET_NAME = val;
      }
    }
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Admin credentials to preserve
const ADMIN_USER = {
  id: "usr-admin-1",
  username: "admin",
  password_hash: "210000$de114e3ded15edb546d1266d0d34918b44908858e011fd962a38f1a0b986af67a631bb2f6c4919d37eea531f6be7375af019da6253783e322b595c7a4d77caa2",
  salt: "8e4c1ce665ceb8419ff57a1aefb13252",
  role: "super_admin",
  phone_number: "+8801929582426",
  email: "savartourlover@gmail.com",
  first_name: "Savar",
  last_name: "Admin",
};

const DEFAULT_TOUR_CATEGORIES = [
  { id: "cat-group-tour", name: "Group Tour", slug: "group_tour", description: "Shared budget-friendly group tours with confirmed weekly departures", icon: "👥", badge: "Most Popular", is_active: true, display_order: 1 },
  { id: "cat-corporate-tour", name: "Corporate Tour", slug: "corporate_tour", description: "Executive team retreats, annual picnics, and tailored conferences", icon: "🏢", badge: "Business", is_active: true, display_order: 2 },
  { id: "cat-custom-tour", name: "Customized Tour", slug: "customized_tour", description: "Private custom-tailored itineraries designed around your preferences", icon: "✨", badge: "Flexible", is_active: true, display_order: 3 },
  { id: "cat-adventure-tour", name: "Adventure & Trekking", slug: "adventure_tour", description: "Hiking, hill climbing, camping, waterfalls, and wild expeditions", icon: "🎒", badge: "Thrilling", is_active: true, display_order: 4 },
  { id: "cat-honeymoon-package", name: "Honeymoon Package", slug: "honeymoon_package", description: "Romantic getaways with candlelit dinners and private resort stays", icon: "💍", badge: "Romantic", is_active: true, display_order: 5 },
  { id: "cat-family-tour", name: "Family Tour", slug: "family_tour", description: "Comfortable, relaxed journeys suitable for children and elders", icon: "👨‍👩‍👧‍👦", badge: "Family Friendly", is_active: true, display_order: 6 },
  { id: "cat-day-trip", name: "Day Trip", slug: "day_trip", description: "Single-day sightseeing and activities without overnight stay", icon: "☀️", badge: "1 Day", is_active: true, display_order: 7 },
  { id: "cat-heritage-tour", name: "Heritage Tour", slug: "heritage_tour", description: "Historical monuments, cultural roots, and archaeological wonders", icon: "🏛️", badge: "Cultural", is_active: true, display_order: 8 },
];

async function masterPurge() {
  console.log("\n======================================================================");
  console.log("  MASTER FRESH-START DATABASE PURGE & RESET (ALL TIERS)");
  console.log("======================================================================\n");
  console.log(`Target Supabase URL: ${SUPABASE_URL}`);
  console.log(`Target Bucket:       ${BUCKET_NAME}\n`);

  // Helper to delete all rows in a table
  async function purgeTable(table, idCol = "id") {
    try {
      const { data, error } = await supabase.from(table).delete().neq(idCol, "___NON_EXISTENT_DUMMY_ID___");
      if (error) {
        console.warn(`  ⚠️ Could not purge table '${table}': ${error.message}`);
      } else {
        console.log(`  ✓ Purged all rows from table '${table}'`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Exception purging table '${table}':`, err.message);
    }
  }

  // 1. TIER 3 (Supabase PostgreSQL Tables)
  console.log("--- 1. PURGING TIER 3 (Supabase PostgreSQL Tables) ---");
  await purgeTable("clearance_tickets");
  await purgeTable("payments");
  await purgeTable("customer_activities");
  await purgeTable("bookings");
  await purgeTable("customers");
  await purgeTable("tours");
  await purgeTable("destinations");
  await purgeTable("offers");
  await purgeTable("testimonials");
  await purgeTable("blog_posts");
  await purgeTable("contact_inquiries");
  await purgeTable("operational_alerts");
  await purgeTable("expenses");
  await purgeTable("suppliers");

  // Keep ONLY super_admin in staff_users
  console.log("  Syncing super_admin in 'staff_users'...");
  await supabase.from("staff_users").delete().neq("id", ADMIN_USER.id);
  const { error: staffErr } = await supabase.from("staff_users").upsert(ADMIN_USER);
  if (staffErr) console.warn("  ⚠️ Failed to upsert admin user:", staffErr.message);
  else console.log("  ✓ Preserved super_admin in 'staff_users'");

  // Reset CMS blocks
  console.log("  Resetting 'homepage_blocks' in Tier 3...");
  await supabase.from("homepage_blocks").upsert({
    id: "block-tour-categories",
    block_type: "service_list",
    display_order: 99,
    content: { categories: DEFAULT_TOUR_CATEGORIES, updated_at: new Date().toISOString() },
  });
  await supabase.from("homepage_blocks").upsert({
    id: "block-expenses-data",
    block_type: "custom",
    display_order: 991,
    content: { expenses: [], updated_at: new Date().toISOString() },
  });
  await supabase.from("homepage_blocks").upsert({
    id: "block-suppliers-data",
    block_type: "custom",
    display_order: 992,
    content: { suppliers: [], updated_at: new Date().toISOString() },
  });
  console.log("  ✓ Reset CMS metadata blocks in 'homepage_blocks'");

  // 2. TIER 2 (Local JSON State across all candidate files)
  console.log("\n--- 2. PURGING TIER 2 (Local JSON Files) ---");
  const cleanDb = {
    destinations: [],
    tours: [],
    tourCategories: DEFAULT_TOUR_CATEGORIES,
    offers: [],
    testimonials: [],
    blogPosts: [],
    homepageBlocks: [
      {
        id: "block-tour-categories",
        block_type: "service_list",
        display_order: 99,
        content: { categories: DEFAULT_TOUR_CATEGORIES, updated_at: new Date().toISOString() },
      },
      {
        id: "block-home-page",
        block_type: "home_page",
        display_order: 1,
        content: {
          hero_eyebrow: "সাভার ট্যুর লাভার — আপনার স্বপ্ন উড়তে দিন",
          hero_headline: "Discover Bangladesh,",
          hero_highlight: "Let Your Dreams Fly",
          hero_subheadline: "Curated domestic tours with Savar Tour Lover. Trusted local hosts. Book with an advance and clear the balance on tour day.",
          hero_primary_cta_label: "Explore Tours",
          hero_primary_cta_href: "/tours",
          hero_secondary_cta_label: "Plan My Trip",
          hero_secondary_cta_href: "/contact",
          hero_media_type: "slideshow",
          hero_slides: [],
        },
      },
    ],
    staffUsers: [ADMIN_USER],
    customers: [],
    customerActivities: [],
    bookings: [],
    payments: [],
    clearanceTickets: [],
    alerts: [],
    expenses: [],
    suppliers: [],
    contactInquiries: [],
    analyticsEvents: [],
    rocketIncomingSms: [],
    bkashIncomingSms: [],
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
      staffUsers: [],
      contactInquiries: [],
      alerts: [],
    },
  };

  const serialized = JSON.stringify(cleanDb, null, 2);
  const localFiles = [
    path.resolve(process.cwd(), ".data", "db.json"),
    path.resolve(process.cwd(), "data_storage", "db.json"),
    path.resolve(process.cwd(), "..", "savartourlover-main", ".data", "db.json"),
    path.resolve(process.cwd(), "..", "savartourlover-main", "data_storage", "db.json"),
  ];

  for (const f of localFiles) {
    try {
      const dir = path.dirname(f);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(f, serialized, "utf-8");
        console.log(`  ✓ Cleaned ${f}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Could not write ${f}:`, e.message);
    }
  }

  // 3. TIER 4 (Supabase Storage Bucket Mirror tourlover-data/db.json)
  console.log("\n--- 3. PURGING TIER 4 (Supabase Storage Bucket Mirror) ---");
  try {
    const { error: rmErr } = await supabase.storage.from(BUCKET_NAME).remove(["db.json"]);
    if (rmErr) console.warn("  ⚠️ Storage remove warning:", rmErr.message);
    else console.log("  ✓ Deleted old snapshot from Supabase Storage bucket");

    const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload("db.json", serialized, {
      contentType: "application/json",
      upsert: true,
      cacheControl: "0",
    });
    if (upErr) console.warn("  ⚠️ Snapshot mirror upload warning:", upErr.message);
    else console.log(`  ✓ Successfully uploaded empty clean snapshot to ${BUCKET_NAME}/db.json`);
  } catch (err) {
    console.warn("  ⚠️ Storage exception:", err.message);
  }

  // 4. Clear Next.js cache
  const nextCacheDir = path.resolve(process.cwd(), ".next", "cache");
  if (fs.existsSync(nextCacheDir)) {
    try {
      fs.rmSync(nextCacheDir, { recursive: true, force: true });
      console.log("  ✓ Cleared Next.js fetch & Turbopack cache (.next/cache)");
    } catch (e) {
      console.warn("  ⚠️ Error clearing .next/cache:", e.message);
    }
  }

  console.log("\n======================================================================");
  console.log("  ALL TIERS PURGED & FRESH-START INITIALIZED SUCCESSFULLY ✅");
  console.log("======================================================================\n");
}

masterPurge().catch((err) => {
  console.error("Purge failed:", err);
  process.exit(1);
});
