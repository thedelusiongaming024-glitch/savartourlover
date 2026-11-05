const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres.fmozfwayztpwiygobntr:HcaUMaMrzUl9DS3u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const supabaseUrl = 'https://fmozfwayztpwiygobntr.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb3pmd2F5enRwd2l5Z29ibnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzgxODI1NywiZXhwIjoyMTA5Mzk0MjU3fQ.CQodiDTNgCx0v2Zuo2Mkg2fHqzXQon7_fZA55c2iong';

const ADMIN_USER = {
  id: 'usr-admin-1',
  username: 'admin',
  password_hash: '210000$de114e3ded15edb546d1266d0d34918b44908858e011fd962a38f1a0b986af67a631bb2f6c4919d37eea531f6be7375af019da6253783e322b595c7a4d77caa2',
  salt: '8e4c1ce665ceb8419ff57a1aefb13252',
  role: 'super_admin',
  phone_number: '+8801929582426',
  email: 'savartourlover@gmail.com',
  first_name: 'Savar',
  last_name: 'Admin',
};

const DEFAULT_TOUR_CATEGORIES = [
  { id: 'cat-group-tour', name: 'Group Tour', slug: 'group_tour', description: 'Shared budget-friendly group tours with confirmed weekly departures', icon: '👥', badge: 'Most Popular', is_active: true, display_order: 1 },
  { id: 'cat-corporate-tour', name: 'Corporate Tour', slug: 'corporate_tour', description: 'Executive team retreats, annual picnics, and tailored conferences', icon: '🏢', badge: 'Business', is_active: true, display_order: 2 },
  { id: 'cat-custom-tour', name: 'Customized Tour', slug: 'customized_tour', description: 'Private custom-tailored itineraries designed around your preferences', icon: '✨', badge: 'Flexible', is_active: true, display_order: 3 },
  { id: 'cat-adventure-tour', name: 'Adventure & Trekking', slug: 'adventure_tour', description: 'Hiking, hill climbing, camping, waterfalls, and wild expeditions', icon: '🧗', badge: 'Thrilling', is_active: true, display_order: 4 },
  { id: 'cat-honeymoon-package', name: 'Honeymoon Package', slug: 'honeymoon_package', description: 'Romantic getaways with candlelit dinners and private resort stays', icon: '💍', badge: 'Romantic', is_active: true, display_order: 5 },
  { id: 'cat-family-tour', name: 'Family Tour', slug: 'family_tour', description: 'Comfortable, relaxed journeys suitable for children and elders', icon: '👨‍👩‍👧‍👦', badge: 'Family Friendly', is_active: true, display_order: 6 },
  { id: 'cat-day-trip', name: 'Day Trip', slug: 'day_trip', description: 'Single-day sightseeing and activities without overnight stay', icon: '☀️', badge: '1 Day', is_active: true, display_order: 7 },
  { id: 'cat-heritage-tour', name: 'Heritage Tour', slug: 'heritage_tour', description: 'Historical monuments, cultural roots, and archaeological wonders', icon: '🏛️', badge: 'Cultural', is_active: true, display_order: 8 },
];

async function setupNewDatabase() {
  console.log('--- 1. Connecting to PostgreSQL ---');
  const pg = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await pg.connect();
  console.log('✓ Connected to PostgreSQL 17 at fmozfwayztpwiygobntr');

  console.log('\n--- 2. Applying Schema (supabase/schema.sql) ---');
  const schemaSql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  await pg.query(schemaSql);
  console.log('✓ Successfully executed schema.sql on new database');

  // Verify tables
  const { rows } = await pg.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('✓ Public tables created:', rows.map(r => r.table_name).join(', '));
  await pg.end();

  console.log('\n--- 3. Seeding Initial Clean Data via Supabase Client ---');
  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Seed Admin user
  const { error: staffErr } = await sb.from('staff_users').upsert(ADMIN_USER, { onConflict: 'id' });
  if (staffErr) console.error('Staff user seed error:', staffErr.message);
  else console.log('✓ Seeded super_admin staff user');

  // Seed Default Categories
  const { error: catErr } = await sb.from('homepage_blocks').upsert({
    id: 'block-tour-categories',
    block_type: 'service_list',
    display_order: 99,
    content: { categories: DEFAULT_TOUR_CATEGORIES, updated_at: new Date().toISOString() }
  }, { onConflict: 'id' });
  if (catErr) console.error('Categories seed error:', catErr.message);
  else console.log('✓ Seeded default tour categories in homepage_blocks');

  // Seed Clean Tour (Finland)
  const localDb = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '.data', 'db.json'), 'utf8'));
  if (localDb.tours && localDb.tours.length > 0) {
    const t = localDb.tours[0];
    const tourRow = {
      id: t.id,
      title: t.title,
      slug: t.slug,
      destination_id: t.destinationId || null,
      destination_slug: t.destinationSlug || 'finland',
      category: t.category || 'international',
      duration_days: t.durationDays || 5,
      duration_nights: t.durationNights || 4,
      starting_price: t.startingPrice || 50000,
      discount: t.discount || 0,
      advance_percent: t.advancePercent || 40,
      advance_amount: t.advanceAmount || 20000,
      hero_image: t.heroImage || '',
      overview: t.overview || 'Scenic tour of Finland',
      total_seats: t.totalSeats || 30,
      meeting_point: t.meetingPoint || 'Dhaka Airport',
      departure_schedule: t.departureSchedule || 'Weekly',
      pickup_points: t.pickupPoints || [],
      gallery: t.gallery || [],
      itinerary: t.itinerary || [],
      inclusions: t.inclusions || [],
      exclusions: t.exclusions || [],
      packing_suggestions: t.packingSuggestions || [],
      faqs: t.faqs || [],
      departures: t.departures || [],
      status: t.status || 'published',
      is_featured: t.isFeatured || false,
    };
    const { error: tourErr } = await sb.from('tours').upsert(tourRow, { onConflict: 'id' });
    if (tourErr) console.error('Tour seed error:', tourErr.message);
    else console.log(`✓ Seeded clean initial tour: "${t.title}" (${t.id})`);
  }

  // Ensure storage bucket
  console.log('\n--- 4. Checking Storage Bucket ---');
  const { data: buckets } = await sb.storage.listBuckets();
  const bucketName = 'tourlover-data';
  if (!buckets?.some(b => b.name === bucketName)) {
    console.log(`Creating bucket ${bucketName}...`);
    const { error: bErr } = await sb.storage.createBucket(bucketName, { public: true });
    if (bErr) console.warn('Bucket notice:', bErr.message);
    else console.log(`✓ Created storage bucket "${bucketName}"`);
  } else {
    console.log(`✓ Storage bucket "${bucketName}" already exists`);
  }

  console.log('\n======================================================');
  console.log('  NEW VERCEL-INTEGRATED SUPABASE DATABASE SETUP COMPLETE');
  console.log('======================================================\n');
}

setupNewDatabase().catch(err => {
  console.error('Fatal error during setup:', err);
  process.exit(1);
});
