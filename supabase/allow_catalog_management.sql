-- =============================================================================
-- ALLOW CATALOG & CONTENT MANAGEMENT (For environments running with anon/publishable key)
--
-- Run this script in Supabase Dashboard -> SQL Editor if you are running the app
-- without a SUPABASE_SECRET_KEY (service_role), and want admin mutations
-- (INSERT, UPDATE, DELETE) on catalog tables (destinations, tours, offers,
-- testimonials, blog posts, homepage blocks) to execute directly in PostgreSQL.
--
-- NOTE: The application also employs tombstone tracking locally, so deleted
-- items will never reappear in the web app or admin dashboard even if this SQL
-- has not been executed yet.
-- =============================================================================

-- 1. Grant table-level permissions to anon and authenticated roles
GRANT ALL ON TABLE
  public.destinations,
  public.tours,
  public.offers,
  public.testimonials,
  public.blog_posts,
  public.homepage_blocks
TO anon, authenticated;

-- 2. Add permissive RLS policies for catalog modifications
DROP POLICY IF EXISTS "Allow catalog destinations mutations" ON public.destinations;
CREATE POLICY "Allow catalog destinations mutations" ON public.destinations
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow catalog tours mutations" ON public.tours;
CREATE POLICY "Allow catalog tours mutations" ON public.tours
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow catalog offers mutations" ON public.offers;
CREATE POLICY "Allow catalog offers mutations" ON public.offers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow catalog testimonials mutations" ON public.testimonials;
CREATE POLICY "Allow catalog testimonials mutations" ON public.testimonials
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow catalog blog_posts mutations" ON public.blog_posts;
CREATE POLICY "Allow catalog blog_posts mutations" ON public.blog_posts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow catalog homepage_blocks mutations" ON public.homepage_blocks;
CREATE POLICY "Allow catalog homepage_blocks mutations" ON public.homepage_blocks
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
