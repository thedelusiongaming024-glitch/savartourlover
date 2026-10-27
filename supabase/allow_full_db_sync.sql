-- =============================================================================
-- ALLOW DATABASE SYNCHRONIZATION FOR ANON/PUBLISHABLE KEY
--
-- WHY THIS IS NEEDED:
-- Currently, your web app connects to Supabase using the public/publishable key.
-- Because secure RLS policies were executed previously in Supabase, PostgreSQL
-- blocks the publishable key from deleting, inserting, or updating records in
-- Supabase tables (e.g. destinations, tours, bookings, etc.).
--
-- RUNNING THIS SCRIPT:
-- Open your Supabase Dashboard -> SQL Editor, paste this script, and click Run.
-- It immediately allows the web app to DELETE, INSERT, and UPDATE records
-- directly in Supabase PostgreSQL tables.
-- =============================================================================

-- 1. Grant table permissions to anon & authenticated roles
GRANT ALL ON TABLE
  public.destinations,
  public.tours,
  public.offers,
  public.testimonials,
  public.blog_posts,
  public.homepage_blocks,
  public.customers,
  public.customer_activities,
  public.bookings,
  public.payments,
  public.clearance_tickets,
  public.operational_alerts,
  public.contact_inquiries
TO anon, authenticated;

-- 2. Allow ALL operations (INSERT, UPDATE, DELETE, SELECT) via RLS policies
DROP POLICY IF EXISTS "Allow anon destinations sync" ON public.destinations;
CREATE POLICY "Allow anon destinations sync" ON public.destinations
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon tours sync" ON public.tours;
CREATE POLICY "Allow anon tours sync" ON public.tours
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon offers sync" ON public.offers;
CREATE POLICY "Allow anon offers sync" ON public.offers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon testimonials sync" ON public.testimonials;
CREATE POLICY "Allow anon testimonials sync" ON public.testimonials
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon blog_posts sync" ON public.blog_posts;
CREATE POLICY "Allow anon blog_posts sync" ON public.blog_posts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon homepage_blocks sync" ON public.homepage_blocks;
CREATE POLICY "Allow anon homepage_blocks sync" ON public.homepage_blocks
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon customers sync" ON public.customers;
CREATE POLICY "Allow anon customers sync" ON public.customers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon customer_activities sync" ON public.customer_activities;
CREATE POLICY "Allow anon customer_activities sync" ON public.customer_activities
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon bookings sync" ON public.bookings;
CREATE POLICY "Allow anon bookings sync" ON public.bookings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon payments sync" ON public.payments;
CREATE POLICY "Allow anon payments sync" ON public.payments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon clearance_tickets sync" ON public.clearance_tickets;
CREATE POLICY "Allow anon clearance_tickets sync" ON public.clearance_tickets
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon operational_alerts sync" ON public.operational_alerts;
CREATE POLICY "Allow anon operational_alerts sync" ON public.operational_alerts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon contact_inquiries sync" ON public.contact_inquiries;
CREATE POLICY "Allow anon contact_inquiries sync" ON public.contact_inquiries
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
