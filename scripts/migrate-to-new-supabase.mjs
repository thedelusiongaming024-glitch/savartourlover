import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
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
      process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "tourlover-data";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function migrateData() {
  console.log("\n======================================================================");
  console.log("  MIGRATING LOCAL DATA TO SUPABASE DATABASE ACCOUNT");
  console.log("======================================================================\n");
  console.log(`Target Supabase URL: ${SUPABASE_URL}`);
  console.log(`Target Bucket:       ${BUCKET_NAME}\n`);

  // Read local database snapshot
  const dbFile = path.resolve(process.cwd(), ".data", "db.json");
  if (!fs.existsSync(dbFile)) {
    console.error(`❌ Local database file not found at ${dbFile}`);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(dbFile, "utf-8"));

  // 1. Storage bucket check / creation
  console.log("1. Checking Storage Bucket...");
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!bucketExists) {
    console.log(`  Creating storage bucket '${BUCKET_NAME}'...`);
    const { error: bErr } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    if (bErr) console.warn(`  ⚠️ Bucket creation notice: ${bErr.message}`);
    else console.log(`  ✓ Bucket '${BUCKET_NAME}' created`);
  } else {
    console.log(`  ✓ Bucket '${BUCKET_NAME}' exists`);
  }

  // Upload db.json snapshot to bucket
  console.log("  Uploading db.json snapshot to storage...");
  const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload("db.json", JSON.stringify(db, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (upErr) console.warn(`  ⚠️ Snapshot upload warning: ${upErr.message}`);
  else console.log("  ✓ Storage snapshot mirror uploaded");

  // Helper upsert function
  async function upsertBatch(table, items, idKey = "id") {
    if (!Array.isArray(items) || items.length === 0) return 0;
    let count = 0;
    for (const item of items) {
      const { error } = await supabase.from(table).upsert(item, { onConflict: idKey });
      if (error) {
        console.warn(`  ⚠️ Failed to upsert ${table} (${item[idKey]}):`, error.message);
      } else {
        count++;
      }
    }
    return count;
  }

  // 2. Destinations
  console.log("\n2. Migrating Destinations...");
  const destCount = await upsertBatch("destinations", db.destinations || []);
  console.log(`  ✓ Migrated ${destCount} destinations`);

  // 3. Tours
  console.log("\n3. Migrating Tours...");
  const tourRows = (db.tours || []).map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    destination_id: t.destination_id || null,
    destination_slug: t.destination_slug || t.destination || "bangladesh",
    category: t.category || "group_tour",
    duration_days: Number(t.duration_days || 3),
    duration_nights: Number(t.duration_nights || 2),
    starting_price: Number(t.base_price || t.starting_price || 0),
    discount: Number(t.discount_value || t.discount || 0),
    advance_percent: Number(t.advance_payment_percent || t.advance_percent || 40),
    advance_amount: Number(t.advance_amount || 0),
    hero_image: t.hero_image || null,
    overview: t.full_description || t.short_description || t.overview || null,
    total_seats: Number(t.total_seats || 40),
    meeting_point: t.meeting_point || "Dhaka Sayedabad / Fakirapool",
    departure_schedule: t.departure_schedule || "Every Friday",
    pickup_points: t.pickup_points || [],
    gallery: t.gallery || [],
    itinerary: t.itinerary || [],
    inclusions: t.inclusions || [],
    exclusions: t.exclusions || [],
    faqs: t.faqs || [],
    departures: t.departures || [],
    status: t.status || "published",
    is_featured: t.is_featured !== false,
    created_at: t.created_at || new Date().toISOString(),
    updated_at: t.updated_at || new Date().toISOString(),
  }));
  const tourCount = await upsertBatch("tours", tourRows);
  console.log(`  ✓ Migrated ${tourCount} tours`);

  // 4. Staff Users
  console.log("\n4. Migrating Staff Users...");
  const staffCount = await upsertBatch("staff_users", db.staffUsers || db.staff_users || []);
  console.log(`  ✓ Migrated ${staffCount} staff users`);

  // 5. Homepage Blocks
  console.log("\n5. Migrating Homepage Blocks & Settings...");
  const blockCount = await upsertBatch("homepage_blocks", db.homepageBlocks || db.homepage_blocks || []);
  console.log(`  ✓ Migrated ${blockCount} CMS blocks`);

  // 6. Blog Posts
  console.log("\n6. Migrating Blog Posts...");
  const blogCount = await upsertBatch("blog_posts", db.blogPosts || db.blog_posts || []);
  console.log(`  ✓ Migrated ${blogCount} blog posts`);

  // 7. Offers & Testimonials
  console.log("\n7. Migrating Offers & Testimonials...");
  const offerCount = await upsertBatch("offers", db.offers || []);
  const testCount = await upsertBatch("testimonials", db.testimonials || []);
  console.log(`  ✓ Migrated ${offerCount} offers, ${testCount} testimonials`);

  // 8. Customers
  console.log("\n8. Migrating Customers...");
  const custRows = (db.customers || []).map((c) => ({
    id: c.id,
    phone_number: c.phone_number,
    full_name: c.full_name,
    email: c.email || null,
    preferred_pickup_point: c.preferred_pickup_point || null,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
    last_login_at: c.last_login_at || null,
  }));
  const custCount = await upsertBatch("customers", custRows);
  console.log(`  ✓ Migrated ${custCount} customers`);

  // 9. Bookings & Payments
  console.log("\n9. Migrating Bookings & Payments...");
  const bookingCount = await upsertBatch("bookings", db.bookings || []);
  const paymentCount = await upsertBatch("payments", db.payments || []);
  const ticketCount = await upsertBatch("clearance_tickets", db.clearanceTickets || db.clearance_tickets || []);
  console.log(`  ✓ Migrated ${bookingCount} bookings, ${paymentCount} payments, ${ticketCount} clearance tickets`);

  console.log("\n======================================================================");
  console.log("  MIGRATION FINISHED SUCCESSFULLY ✅");
  console.log("======================================================================\n");
}

migrateData().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
