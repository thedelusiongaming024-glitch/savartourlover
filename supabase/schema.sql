-- =============================================================================
-- ATITHI TRAVEL PLATFORM: SUPABASE POSTGRESQL RELATIONAL SCHEMA
-- Project: https://tcituxdzdqjgslhctncu.supabase.co
-- Generated for Supabase SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DESTINATIONS
CREATE TABLE IF NOT EXISTS public.destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  division TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  best_time_to_visit TEXT,
  weather_notes TEXT,
  popular_attractions JSONB DEFAULT '[]'::jsonb,
  recommended_accommodation TEXT,
  travel_tips TEXT,
  permits_required TEXT,
  cover_image TEXT,
  cover_video_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TOURS
CREATE TABLE IF NOT EXISTS public.tours (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  destination_id TEXT REFERENCES public.destinations(id) ON DELETE SET NULL,
  destination_slug TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_days INT NOT NULL,
  duration_nights INT NOT NULL,
  starting_price NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  advance_percent INT DEFAULT 40,
  advance_amount NUMERIC(10, 2) NOT NULL,
  hero_image TEXT,
  overview TEXT,
  total_seats INT DEFAULT 40,
  meeting_point TEXT DEFAULT 'Dhaka Sayedabad / Fakirapool',
  departure_schedule TEXT DEFAULT 'Every Friday 7:00 AM',
  pickup_points JSONB DEFAULT '[]'::jsonb,
  gallery JSONB DEFAULT '[]'::jsonb,
  itinerary JSONB DEFAULT '[]'::jsonb,
  inclusions JSONB DEFAULT '[]'::jsonb,
  exclusions JSONB DEFAULT '[]'::jsonb,
  packing_suggestions JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  departures JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'published',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. TOUR DEPARTURES (DEDICATED SEAT ALLOCATION & SCHEDULE TABLE)
CREATE TABLE IF NOT EXISTS public.tour_departures (
  id TEXT PRIMARY KEY,
  tour_id TEXT REFERENCES public.tours(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  total_seats INT NOT NULL DEFAULT 40,
  seats_remaining INT NOT NULL DEFAULT 40,
  booked_seats JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  reference TEXT,
  tour_id TEXT REFERENCES public.tours(id) ON DELETE RESTRICT,
  tour_title TEXT NOT NULL,
  tour_slug TEXT NOT NULL,
  departure_date DATE NOT NULL,
  traveler_count INT NOT NULL DEFAULT 1,
  selected_seats JSONB DEFAULT '[]'::jsonb,
  travelers JSONB DEFAULT '[]'::jsonb,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_point TEXT,
  special_requests TEXT,
  promo_code TEXT,
  discount_amount NUMERIC(10, 2),
  total_price NUMERIC(10, 2) NOT NULL,
  advance_amount NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  due_on_tour_day NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE NOT NULL,
  payment_method TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLEARANCE TICKETS
CREATE TABLE IF NOT EXISTS public.clearance_tickets (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
  signed_token TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  cleared_by_host TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SPECIAL OFFERS
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT,
  tagline TEXT,
  discount_badge TEXT,
  discount_type TEXT,
  discount_value NUMERIC(10, 2),
  valid_from DATE,
  valid_until DATE,
  minimum_spend NUMERIC(10, 2),
  image_url TEXT,
  tour_id TEXT,
  tour_slug TEXT,
  tour_title TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TESTIMONIALS
CREATE TABLE IF NOT EXISTS public.testimonials (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  trip_name TEXT,
  author_location TEXT,
  author_avatar TEXT,
  rating INT DEFAULT 5,
  quote TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BLOG POSTS (TRAVEL JOURNAL)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  hero_image TEXT,
  read_time_minutes INT DEFAULT 5,
  tags JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. HOMEPAGE CMS BLOCKS
CREATE TABLE IF NOT EXISTS public.homepage_blocks (
  id TEXT PRIMARY KEY,
  block_type TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CONTACT INQUIRIES
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. OPERATIONAL ALERTS
CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. STAFF USERS
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CUSTOMERS (TRAVELERS)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  total_tours_booked INT DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. CUSTOMER ACTIVITIES
CREATE TABLE IF NOT EXISTS public.customer_activities (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link customer_id in Bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL;

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_destinations_slug ON public.destinations(slug);
CREATE INDEX IF NOT EXISTS idx_tours_slug ON public.tours(slug);
CREATE INDEX IF NOT EXISTS idx_tours_destination ON public.tours(destination_slug);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;

-- Public read policies for marketing data
CREATE POLICY "Public Read Published Destinations" ON public.destinations FOR SELECT USING (status = 'published');
CREATE POLICY "Public Read Published Tours" ON public.tours FOR SELECT USING (status = 'published');
CREATE POLICY "Public Read Offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Public Read Testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Public Read Published Blog Posts" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Public Read Homepage Blocks" ON public.homepage_blocks FOR SELECT USING (true);

-- Everything else is private. There are deliberately NO policies for bookings, customers, payments,
-- tickets, staff, inquiries or alerts: only the server (service_role key, which bypasses RLS) may
-- touch them. Earlier versions of this file granted the public role FULL access ("USING (true)") to
-- all of these tables, which exposed every customer's data and let anyone edit or delete anything.
-- Remove any leftovers from those versions:
DROP POLICY IF EXISTS "Allow public all on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public all on customer_activities" ON public.customer_activities;
DROP POLICY IF EXISTS "Allow public all on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public all on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public all on clearance_tickets" ON public.clearance_tickets;
DROP POLICY IF EXISTS "Allow public all on destinations" ON public.destinations;
DROP POLICY IF EXISTS "Allow public all on tours" ON public.tours;
DROP POLICY IF EXISTS "Allow public all on blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow public all on offers" ON public.offers;
DROP POLICY IF EXISTS "Allow public all on testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Allow public all on homepage_blocks" ON public.homepage_blocks;

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
