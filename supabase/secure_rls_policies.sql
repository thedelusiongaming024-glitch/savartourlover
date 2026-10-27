-- =============================================================================
-- SECURE ROW LEVEL SECURITY  (replaces fix_rls_policies.sql + apply_remaining_policies.sql)
--
-- ⚠️  RUN ORDER MATTERS — read before executing:
--   1. In Supabase Dashboard → Project Settings → API Keys, create a NEW *secret* key and put it in
--      your server environment as SUPABASE_SECRET_KEY. (The previous key in the code base was
--      unregistered, so the server had been silently using the public "publishable" key.)
--   2. Deploy / restart the app and confirm it works with that key.
--   3. ONLY THEN run this script. After it runs, the public (anon) key can no longer read or write
--      customers, bookings, payments, tickets, staff accounts, inquiries or alerts — only your
--      server (service role, which bypasses RLS) can.
--
-- Safe to re-run.
-- =============================================================================

-- 1. Remove every existing policy in `public` (the old ones granted the public role
--    full read/write/DELETE on all tables) ------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 2. Turn RLS on everywhere ------------------------------------------------------
ALTER TABLE public.destinations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tours                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_blocks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_tickets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_inquiries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts   ENABLE ROW LEVEL SECURITY;

-- 3. Sensitive tables: NO policies + no grants for anon/authenticated ------------
--    (service_role bypasses RLS, so the Next.js server keeps working.)
REVOKE ALL ON TABLE
  public.staff_users,
  public.customers,
  public.customer_activities,
  public.bookings,
  public.payments,
  public.clearance_tickets,
  public.contact_inquiries,
  public.operational_alerts
FROM anon, authenticated;

-- 4. Catalog tables: public READ of published content only, never write ---------
REVOKE ALL ON TABLE
  public.destinations, public.tours, public.offers,
  public.testimonials, public.blog_posts, public.homepage_blocks
FROM anon, authenticated;
GRANT SELECT ON TABLE
  public.destinations, public.tours, public.offers,
  public.testimonials, public.blog_posts, public.homepage_blocks
TO anon, authenticated;

CREATE POLICY "Public read published destinations" ON public.destinations
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Public read published tours" ON public.tours
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Public read offers" ON public.offers
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read testimonials" ON public.testimonials
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read published blog posts" ON public.blog_posts
  FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Public read homepage blocks" ON public.homepage_blocks
  FOR SELECT TO anon, authenticated USING (true);

-- 5. The JSON snapshot mirror contains customers, bookings, payments, tickets and staff password
--    hashes. It was published in a PUBLIC bucket (anyone could download it). Make it private; the
--    server reads/writes it with the secret key. ------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'atithi-data';
DROP POLICY IF EXISTS "Public Read Access on atithi-data" ON storage.objects;

-- Verify (each row below should show the expected state):
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--   SELECT id, public FROM storage.buckets WHERE id = 'atithi-data';   -- public must be false
