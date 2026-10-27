-- =============================================================================
-- ATITHI TRAVEL PLATFORM: SUPABASE WEBHOOK & SNAPSHOT MIRROR SETUP
-- Target Project: https://tcituxdzdqjgslhctncu.supabase.co
-- Function: sync-db-snapshot
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STORAGE BUCKET CONFIGURATION
-- Ensure the 'atithi-data' bucket exists with public read enabled for CDN serving
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'atithi-data',
  'atithi-data',
  true,
  52428800, -- 50 MB
  ARRAY['application/json']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 52428800;

-- (Public read access was removed on purpose: the snapshot holds private customer data.)
DROP POLICY IF EXISTS "Public Read Access on atithi-data" ON storage.objects;

-- Allow service_role to manage all files in atithi-data
CREATE POLICY "Service Role Full Access on atithi-data"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'atithi-data')
WITH CHECK (bucket_id = 'atithi-data');


-- -----------------------------------------------------------------------------
-- 2. AUTOMATED DATABASE TRIGGER (via pg_net)
-- Enables PostgreSQL to ping the Edge Function whenever catalog data changes
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.handle_catalog_change_for_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT := 'https://tcituxdzdqjgslhctncu.supabase.co';
  edge_function_url TEXT;
BEGIN
  edge_function_url := project_url || '/functions/v1/sync-db-snapshot';

  -- Asynchronously notify Edge Function via non-blocking HTTP POST
  PERFORM extensions.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'occurred_at', NOW()
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Prevent transaction failure if notification fails
    RAISE WARNING 'Snapshot trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Apply triggers across all public catalog tables
DROP TRIGGER IF EXISTS trigger_sync_destinations ON public.destinations;
CREATE TRIGGER trigger_sync_destinations
AFTER INSERT OR UPDATE OR DELETE ON public.destinations
FOR EACH ROW EXECUTE FUNCTION public.handle_catalog_change_for_snapshot();

DROP TRIGGER IF EXISTS trigger_sync_tours ON public.tours;
CREATE TRIGGER trigger_sync_tours
AFTER INSERT OR UPDATE OR DELETE ON public.tours
FOR EACH ROW EXECUTE FUNCTION public.handle_catalog_change_for_snapshot();

DROP TRIGGER IF EXISTS trigger_sync_offers ON public.offers;
CREATE TRIGGER trigger_sync_offers
AFTER INSERT OR UPDATE OR DELETE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.handle_catalog_change_for_snapshot();

DROP TRIGGER IF EXISTS trigger_sync_testimonials ON public.testimonials;
CREATE TRIGGER trigger_sync_testimonials
AFTER INSERT OR UPDATE OR DELETE ON public.testimonials
FOR EACH ROW EXECUTE FUNCTION public.handle_catalog_change_for_snapshot();

DROP TRIGGER IF EXISTS trigger_sync_blog_posts ON public.blog_posts;
CREATE TRIGGER trigger_sync_blog_posts
AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.handle_catalog_change_for_snapshot();

DROP TRIGGER IF EXISTS trigger_sync_homepage_blocks ON public.homepage_blocks;
CREATE TRIGGER trigger_sync_homepage_blocks
AFTER INSERT OR UPDATE OR DELETE ON public.homepage_blocks
FOR EACH ROW EXECUTE FUNCTION public.handle_catalog_change_for_snapshot();

-- -----------------------------------------------------------------------------
-- 3. ALTERNATIVE: SUPABASE DASHBOARD WEBHOOK SETUP (NO-CODE)
-- If you prefer using the Supabase Dashboard UI instead of pg_net SQL triggers:
-- 1. Go to Supabase Dashboard -> Database -> Webhooks
-- 2. Click "Create a new webhook"
-- 3. Name: "sync-db-snapshot-on-catalog-change"
-- 4. Tables: destinations, tours, offers, testimonials, blog_posts, homepage_blocks
-- 5. Events: INSERT, UPDATE, DELETE
-- 6. Type: Supabase Edge Functions
-- 7. Edge Function: sync-db-snapshot
-- 8. Method: POST
-- -----------------------------------------------------------------------------
