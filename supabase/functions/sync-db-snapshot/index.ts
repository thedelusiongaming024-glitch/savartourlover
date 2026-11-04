import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "atithi-data";
const DB_OBJECT_PATH = "db.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // PostgREST silently caps a single request at 1,000 rows, and this
    // function used to additionally slap its own .limit(200)/.limit(100) on
    // customers/bookings — so once either table grew past that, the
    // snapshot (and anything restored from it) silently lost data. This
    // pages through every row instead.
    async function selectAllRows(
      table: string,
      orderColumn?: string,
      ascending = true
    ): Promise<{ data: Record<string, any>[] | null; error: { message: string } | null }> {
      const pageSize = 1000;
      const rows: Record<string, any>[] = [];
      for (let from = 0; ; from += pageSize) {
        let query = supabase.from(table).select("*");
        if (orderColumn) query = query.order(orderColumn, { ascending });
        // Stable tiebreaker so rows are never skipped or duplicated between pages.
        query = query.order("id", { ascending: true });
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error) return { data: null, error };
        rows.push(...(data ?? []));
        if (!data || data.length < pageSize) break;
      }
      return { data: rows, error: null };
    }

    // 1. Fetch all catalog data concurrently from PostgreSQL tables
    const [
      destsRes,
      toursRes,
      offersRes,
      testsRes,
      blogsRes,
      blocksRes,
      staffRes,
      custsRes,
      bookingsRes,
    ] = await Promise.all([
      selectAllRows("destinations", "name"),
      selectAllRows("tours", "created_at", false),
      selectAllRows("offers", "created_at", false),
      selectAllRows("testimonials", "created_at", false),
      selectAllRows("blog_posts", "created_at", false),
      selectAllRows("homepage_blocks", "display_order"),
      selectAllRows("staff_users"),
      selectAllRows("customers"),
      selectAllRows("bookings", "created_at", false),
    ]);

    // Format Destinations
    const destinations = (destsRes.data || []).map((d: Record<string, any>) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      division: d.division,
      tagline: d.tagline || "",
      description: d.description || "",
      best_time_to_visit: d.best_time_to_visit || "October to March",
      weather_notes: d.weather_notes || "",
      popular_attractions: Array.isArray(d.popular_attractions) ? d.popular_attractions : [],
      recommended_accommodation: d.recommended_accommodation || "",
      travel_tips: d.travel_tips || "",
      permits_required: d.permits_required || "None",
      cover_image: d.cover_image,
      cover_video_url: d.cover_video_url,
      seo_title: d.seo_title,
      seo_description: d.seo_description,
      gallery: Array.isArray(d.gallery) ? d.gallery : [],
      is_featured: Boolean(d.is_featured),
      status: d.status || "published",
    }));

    // Format Tours
    const tours = (toursRes.data || []).map((t: Record<string, any>) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      destination_slug: t.destination_slug,
      destination_name: t.destination_slug
        ? t.destination_slug.charAt(0).toUpperCase() + t.destination_slug.slice(1)
        : "Bangladesh",
      category: t.category || "package_tour",
      short_description: t.overview || "",
      full_description: t.overview || "",
      hero_image: t.hero_image,
      duration_days: Number(t.duration_days || 1),
      duration_nights: Number(t.duration_nights || 0),
      base_price: String(t.starting_price || 0),
      discount_type: Number(t.discount) > 0 ? "flat" : "none",
      discount_value: String(t.discount || 0),
      final_price: String(Math.max(0, Number(t.starting_price || 0) - Number(t.discount || 0))),
      allow_partial_payment: true,
      advance_payment_percent: String(t.advance_percent || 40),
      advance_amount: String(
        t.advance_amount || Math.round((Number(t.starting_price || 0) * 40) / 100)
      ),
      inclusions: Array.isArray(t.inclusions) ? t.inclusions : [],
      exclusions: Array.isArray(t.exclusions) ? t.exclusions : [],
      accommodation_notes: "Standard hotel / resort",
      transportation_notes: "AC Bus / Private Transport",
      meals_notes: "Breakfast included",
      meeting_point: "Dhaka Sayedabad / Fakirapool",
      departure_schedule: "Every Friday 7:00 AM",
      total_seats: 14,
      itinerary: Array.isArray(t.itinerary) ? t.itinerary : [],
      departures: Array.isArray(t.departures) ? t.departures : [],
      faqs: Array.isArray(t.faqs) ? t.faqs : [],
      gallery: [],
      is_featured: Boolean(t.is_featured),
      status: t.status || "published",
    }));

    // Format Offers
    const offers = (offersRes.data || []).map((o: Record<string, any>) => ({
      id: o.id,
      title: o.title,
      code: o.code || "PROMO",
      slug: (o.code || o.title).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: o.tagline || "",
      discount_type: o.discount_type === "percentage" ? "percent" : "flat",
      discount_value: String(o.discount_value || 0),
      minimum_spend: String(o.minimum_spend || 0),
      valid_from: o.valid_from || new Date().toISOString().slice(0, 10),
      valid_until:
        o.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      banner_image: o.image_url || null,
      tour_slug: o.tour_slug || null,
      is_active: true,
    }));

    // Format Testimonials
    const testimonials = (testsRes.data || []).map((test: Record<string, any>) => ({
      id: test.id,
      author_name: test.author_name,
      customer_name: test.author_name,
      trip_name: test.trip_name,
      tour_title: test.trip_name,
      author_location: test.author_location || "Bangladesh",
      rating: Number(test.rating || 5),
      quote: test.quote,
      author_avatar: test.author_avatar || null,
      customer_photo: test.author_avatar || null,
      is_featured: Boolean(test.is_featured),
    }));

    // Format Blog Posts
    const blogPosts = (blogsRes.data || []).map((b: Record<string, any>) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt || "",
      body: b.content || "",
      content: b.content || "",
      author_name: b.author || "Atithi Editorial",
      author: b.author || "Atithi Editorial",
      cover_image: b.hero_image || null,
      hero_image: b.hero_image || null,
      read_time_minutes: Number(b.read_time_minutes || 5),
      tags: Array.isArray(b.tags) ? b.tags : [],
      published_at: b.created_at || new Date().toISOString(),
      created_at: b.created_at,
      status: b.is_published ? "published" : "draft",
      is_published: Boolean(b.is_published),
      category: { name: "Travel Guide" },
    }));

    // Format Homepage Blocks
    const homepageBlocks = blocksRes.data || [];

    // Format Staff
    const staffUsers = (staffRes.data || []).map((s: Record<string, any>) => ({
      id: s.id,
      username: s.username,
      password_hash: s.password_hash,
      salt: s.salt,
      role: s.role || "super_admin",
      phone_number: s.phone_number || "+8801929582426",
      email: s.email || "savartourlover@gmail.com",
      first_name: s.first_name || "Savar",
      last_name: s.last_name || "Admin",
    }));

    // Format Customers
    const customers = (custsRes.data || []).map((c: Record<string, any>) => ({
      id: c.id,
      phone_number: c.phone_number,
      full_name: c.full_name,
      email: c.email || undefined,
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString(),
      last_login_at: c.last_login_at || undefined,
      activities: [],
    }));

    // Format Bookings
    const bookings = (bookingsRes.data || []).map((b: Record<string, any>) => ({
      id: b.id,
      reference: b.reference || `AT-${b.id.slice(-6)}`,
      tour_id: b.tour_id,
      tour_title: b.tour_title,
      tour_slug: b.tour_slug,
      destination_slug: b.destination_slug || b.tour_slug || "bangladesh",
      departure_date: b.departure_date,
      traveler_count: Number(b.traveler_count || 1),
      unit_price: String(
        b.unit_price ||
          Math.round(Number(b.total_price || 0) / Math.max(1, Number(b.traveler_count || 1)))
      ),
      total_price: String(b.total_price || 0),
      final_price: String(b.total_price || 0),
      payment_plan: Number(b.due_on_tour_day || 0) > 0 ? "partial" : "full",
      advance_required_percent: "40",
      advance_amount: String(b.advance_amount || 0),
      amount_paid: String(b.amount_paid || 0),
      amount_due: String(b.due_on_tour_day || 0),
      due_date: b.departure_date || new Date().toISOString().slice(0, 10),
      status: b.status || "pending_payment",
      customer_id: b.customer_id || undefined,
      customer_full_name: b.customer_name,
      customer_phone_number: b.customer_phone,
      customer_email: b.customer_email || "",
      special_requests: b.special_requests || "",
      travelers: [{ id: `trav-${b.id}-1`, full_name: b.customer_name, is_lead_traveler: true }],
      created_at: b.created_at || new Date().toISOString(),
      updated_at: b.updated_at || new Date().toISOString(),
    }));

    const snapshot = {
      _meta: {
        generated_at: new Date().toISOString(),
        generator: "supabase-edge-function:sync-db-snapshot",
        latency_ms: Date.now() - startTime,
      },
      destinations,
      tours,
      offers,
      testimonials,
      blogPosts,
      homepageBlocks,
      staffUsers,
      customers,
      bookings,
      payments: [],
      clearanceTickets: [],
      alerts: [],
      expenses: [],
      suppliers: [],
      contactInquiries: [],
    };

    // Ensure target storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = (buckets || []).some((b: { name: string }) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }

    // Upload snapshot to Storage bucket
    const jsonString = JSON.stringify(snapshot, null, 2);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(DB_OBJECT_PATH, jsonString, {
        contentType: "application/json",
        upsert: true,
        cacheControl: "300", // 5 minute CDN cache
      });

    if (uploadError) {
      console.error("[sync-db-snapshot] Upload failed:", uploadError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: uploadError.message,
          duration_ms: Date.now() - startTime,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        bucket: BUCKET_NAME,
        path: DB_OBJECT_PATH,
        duration_ms: durationMs,
        stats: {
          destinations: destinations.length,
          tours: tours.length,
          offers: offers.length,
          testimonials: testimonials.length,
          blogPosts: blogPosts.length,
          homepageBlocks: homepageBlocks.length,
          customers: customers.length,
          bookings: bookings.length,
        },
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[sync-db-snapshot] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || String(err),
        duration_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
