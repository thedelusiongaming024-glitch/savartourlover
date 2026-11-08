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
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tuvgeaflyxbldpmpafdk.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "tourlover-data";

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// All 12 Curated Default Destinations with complete rich media
const CURATED_DEFAULT_DESTINATIONS = [
  {
    slug: "bandarban",
    name: "Bandarban",
    bn: "বান্দরবান",
    tagline: "Roof of Bangladesh & Cloud kingdom",
    division: "Chattogram",
    description: "Towering green peaks, indigenous culture, and clouds floating below Nilgiri and Keokradong.",
    best_time_to_visit: "October to March",
    weather_notes: "Pleasant winter with cool mountain breeze",
    popular_attractions: ["Nilgiri", "Nafakhum", "Boga Lake", "Keokradong", "Golden Temple"],
    recommended_accommodation: "Hillside eco-cottages and standard resorts",
    travel_tips: "Carry valid NID/Passport copy for military checkpoints in hill tracts.",
    cover_image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "sundarban",
    name: "Sundarban",
    bn: "সুন্দরবন",
    tagline: "World's largest mangrove forest & Royal Bengal Tiger",
    division: "Khulna",
    description: "UNESCO World Heritage mangrove kingdom teeming with wildlife, spotted deer, and pristine tidal waterways.",
    best_time_to_visit: "November to February",
    weather_notes: "Cool, calm waters and clear skies",
    popular_attractions: ["Kotka Beach", "Hiron Point", "Karamjal Wildlife Center", "Dublar Char"],
    recommended_accommodation: "Tourist cruise vessel cabins and Mongla eco-resorts",
    travel_tips: "Always stay with armed forest guard and certified tour director inside core sanctuary.",
    cover_image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "coxs-bazar",
    name: "Cox's Bazar",
    bn: "কক্সবাজার",
    tagline: "The world's longest unbroken natural sea beach",
    division: "Chattogram",
    description: "120 kilometers of golden sand, rolling waves, seafood culinary feasts, and Marine Drive ocean vistas.",
    best_time_to_visit: "October to April",
    weather_notes: "Sunny beaches and refreshing coastal sea breeze",
    popular_attractions: ["Laboni Beach", "Inani Coral Beach", "Himchari Waterfalls", "Marine Drive"],
    recommended_accommodation: "Beachfront 3-star & 5-star hotels and luxury suites",
    travel_tips: "Book beach beds early in high season and rent open-top jeeps for Marine Drive drive.",
    cover_image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "saint-martin",
    name: "Saint Martin",
    bn: "সেন্ট মার্টিন",
    tagline: "Only coral island of Bangladesh",
    division: "Chattogram",
    description: "Coconut groves, crystal-clear blue seawater, live coral colonies, and fresh barbecue under tropical night skies.",
    best_time_to_visit: "November to March",
    weather_notes: "Sunny tropical paradise breeze",
    popular_attractions: ["Chera Dwip", "West Beach Sunset", "Coral Rocks", "Scuba & Snorkeling Points"],
    recommended_accommodation: "Eco beach cottages and coral view resorts",
    travel_tips: "Ship permits are strictly regulated by government; book tickets and permits weeks ahead.",
    cover_image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "sajek-valley",
    name: "Sajek Valley",
    bn: "সাজেক ভ্যালি",
    tagline: "Queen of Hills & Sea of Clouds",
    division: "Chattogram",
    description: "High mountain ridgeline where clouds touch your resort cottage balcony during breathtaking sunrises and starry nights.",
    best_time_to_visit: "September to February",
    weather_notes: "Chilly evenings and floating morning fog",
    popular_attractions: ["Konglak Para", "Helipad Sunrise Point", "Ruilui Para", "Alutila Cave"],
    recommended_accommodation: "Valley-view wooden cottages and cloud-line resorts",
    travel_tips: "Military convoy timings from Dighinala are 10:00 AM and 3:00 PM; do not be late.",
    cover_image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "sreemangal",
    name: "Sreemangal",
    bn: "শ্রীমঙ্গল",
    tagline: "Tea Capital of Bangladesh & Rainforest sanctuary",
    division: "Sylhet",
    description: "Rolling emerald tea garden hills, Lawachara tropical rainforest with rare gibbons, and seven-layer colored tea.",
    best_time_to_visit: "September to April",
    weather_notes: "Misty cool mornings and fresh tea scents",
    popular_attractions: ["Lawachara National Park", "Baikka Beel Wetland", "Madhabpur Lake", "Finlay Tea Estates"],
    recommended_accommodation: "Tea garden heritage bungalows and luxury eco-resorts",
    travel_tips: "Visit Lawachara early morning at 6:30 AM to hear hoolock gibbons calling across trees.",
    cover_image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "tanguar-haor",
    name: "Tanguar Haor",
    bn: "টাঙ্গুয়ার হাওর",
    tagline: "Vast inland wetland sea & Houseboat living",
    division: "Sylhet",
    description: "Endless crystal fresh water mirror with the Meghalaya mountains in the background, luxury houseboats, and water lilies.",
    best_time_to_visit: "July to October (Monsoon high water)",
    weather_notes: "Cool water breeze and starry open skies",
    popular_attractions: ["Watch Tower", "Tekerghat Limestone Lake", "Jadukata River", "Barikka Tila"],
    recommended_accommodation: "Private AC and Premium non-AC traditional houseboats",
    travel_tips: "Houseboats book up 1 month in advance for monsoon weekends; carry waterproof bags.",
    cover_image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "sylhet",
    name: "Sylhet",
    bn: "সিলেট",
    tagline: "Land of Two Leaves & A Bud",
    division: "Sylhet",
    description: "Ratargul freshwater swamp forest, transparent emerald waters of Jaflong and Lalakhal, and historic shrines.",
    best_time_to_visit: "October to April",
    weather_notes: "Pleasant subtropical green valleys",
    popular_attractions: ["Ratargul Swamp Forest", "Jaflong Zero Point", "Lalakhal Blue Canal", "Bisnakandi"],
    recommended_accommodation: "Heritage hotels and river eco-resorts",
    travel_tips: "Rent wooden country boats for authentic rides through Ratargul swamp canopy.",
    cover_image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80",
    is_featured: true,
    status: "published",
  },
  {
    slug: "kuakata",
    name: "Kuakata",
    bn: "কুয়াকাটা",
    tagline: "Daughter of the Sea — Sunrise & Sunset Beach",
    division: "Barishal",
    description: "One of the few sea beaches in the world where both sunrise and sunset can be watched over the vast ocean.",
    best_time_to_visit: "October to March",
    weather_notes: "Gentle coastal winds and wide open sands",
    popular_attractions: ["Gangamati Mangrove Forest", "Red Crab Island", "Buddhist Wells", "Fatrar Char"],
    recommended_accommodation: "Beachfront 3-star hotels and tourist motels",
    travel_tips: "Rent a beach motorbike to visit Red Crab Island early morning during low tide.",
    cover_image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
    is_featured: false,
    status: "published",
  },
  {
    slug: "kaptai",
    name: "Kaptai",
    bn: "কাপ্তাই",
    tagline: "South Asia's largest artificial lake & emerald hills",
    division: "Chattogram",
    description: "Serene boat cruises through emerald valleys, floating cafes, tribal handloom villages, and hanging bridges.",
    best_time_to_visit: "All year round",
    weather_notes: "Mild tropical hill breeze and clear blue waters",
    popular_attractions: ["Kaptai Lake Boat Cruise", "Hanging Bridge", "Shuvolong Waterfalls", "Polwel Park"],
    recommended_accommodation: "Lake-view floating cottages and hill resorts",
    travel_tips: "Hire engine boats from Kaptai town for private lake excursions to tribal village markets.",
    cover_image: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80",
    is_featured: false,
    status: "published",
  },
  {
    slug: "tetulia",
    name: "Tetulia",
    bn: "তেঁতুলিয়া",
    tagline: "Northernmost frontier with Kanchenjunga mountain view",
    division: "Rangpur",
    description: "Lush flat-land organic tea estates overlooking the breathtaking snow-capped peaks of Mount Kanchenjunga.",
    best_time_to_visit: "October to December",
    weather_notes: "Crisp autumn mornings and cool Himalayan breeze",
    popular_attractions: ["Dahuk Picnic Spot", "Organic Tea Gardens", "Zero Point", "Mahananda River Bank"],
    recommended_accommodation: "Tea estate bungalows and local guest houses",
    travel_tips: "Best Kanchenjunga visibility is between 6:00 AM and 7:30 AM on cloudless autumn mornings.",
    cover_image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    is_featured: false,
    status: "published",
  },
  {
    slug: "netrokona",
    name: "Netrokona",
    bn: "নেত্রকোণা",
    tagline: "Birisiri turquoise ceramic lake & Garo hills",
    division: "Mymensingh",
    description: "Striking emerald and turquoise waters filling white ceramic clay quarries against the Meghalaya border hills.",
    best_time_to_visit: "October to March",
    weather_notes: "Cool and calm rural tranquility",
    popular_attractions: ["Birisiri White Clay Hills", "Shomeswari River", "Ranikhong Church", "Garo Cultural Academy"],
    recommended_accommodation: "Birisiri YMCA/YWCA guesthouses and local rest houses",
    travel_tips: "Cross Shomeswari river on local wooden boats; visit the Garo cultural museum.",
    cover_image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    is_featured: false,
    status: "published",
  },
];

// Default Tour Categories
const DEFAULT_CATEGORIES = [
  { id: "cat-group-tour", name: "Group Tour", slug: "group_tour", description: "Scheduled small group journeys with like-minded travelers", icon: "👥", badge: "Popular", is_active: true, display_order: 1 },
  { id: "cat-private-tour", name: "Private Tour", slug: "private_tour", description: "Customized private itineraries for personal dates and groups", icon: "🚙", badge: "Flexible", is_active: true, display_order: 2 },
  { id: "cat-weekend-getaway", name: "Weekend Getaway", slug: "weekend_getaway", description: "Quick short escapes designed for Friday-Saturday weekends", icon: "⛺", badge: "Quick Trip", is_active: true, display_order: 3 },
  { id: "cat-adventure-tour", name: "Adventure Tour", slug: "adventure_tour", description: "Trekking, hills, caves, and outdoor exploration", icon: "🧗", badge: "Thrilling", is_active: true, display_order: 4 },
  { id: "cat-honeymoon-package", name: "Honeymoon Package", slug: "honeymoon_package", description: "Romantic getaways with candlelit dinners and private resort stays", icon: "💍", badge: "Romantic", is_active: true, display_order: 5 },
  { id: "cat-family-tour", name: "Family Tour", slug: "family_tour", description: "Comfortable, relaxed journeys suitable for children and elders", icon: "👨‍👩‍👧‍👦", badge: "Family Friendly", is_active: true, display_order: 6 },
  { id: "cat-day-trip", name: "Day Trip", slug: "day_trip", description: "Single-day sightseeing and activities without overnight stay", icon: "☀️", badge: "1 Day", is_active: true, display_order: 7 },
  { id: "cat-heritage-tour", name: "Heritage Tour", slug: "heritage_tour", description: "Historical monuments, cultural roots, and archaeological wonders", icon: "🏛️", badge: "Cultural", is_active: true, display_order: 8 },
];

async function syncAllDefaults() {
  console.log("\n======================================================================");
  console.log("  TOTAL MOCK / DEFAULT DATA SYNC WITH SUPABASE DATABASE");
  console.log("======================================================================\n");

  // Step 1: Read existing destinations in Supabase
  console.log("1. Syncing Destinations with Curated Defaults...");
  const { data: existingDests, error: destErr } = await supabase.from("destinations").select("*");
  if (destErr) {
    console.error("  ❌ Failed to read destinations from Supabase:", destErr.message);
  } else {
    const destBySlug = new Map(existingDests.map((d) => [d.slug.toLowerCase(), d]));
    const destByName = new Map(existingDests.map((d) => [d.name.toLowerCase(), d]));

    for (const cur of CURATED_DEFAULT_DESTINATIONS) {
      const match =
        destBySlug.get(cur.slug.toLowerCase()) ||
        destByName.get(cur.name.toLowerCase()) ||
        (cur.slug === "coxs-bazar" ? destBySlug.get("cox-bazar") : null) ||
        (cur.slug === "saint-martin" ? destBySlug.get("saint-martin-tour") : null) ||
        (cur.slug === "sajek-valley" ? (destBySlug.get("best-time-to-visit-sajek") || destBySlug.get("sajek")) : null) ||
        (cur.name === "Sreemangal" ? (destByName.get("শ্রীমঙ্গল") || destBySlug.get("-")) : null);

      const destId = match?.id || `dest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const destSlug = match?.slug || cur.slug;

      const payload = {
        id: destId,
        name: match?.name || cur.name,
        slug: destSlug,
        division: cur.division,
        tagline: cur.tagline,
        description: match?.description && match.description.length > 30 ? match.description : cur.description,
        best_time_to_visit: cur.best_time_to_visit,
        weather_notes: cur.weather_notes,
        popular_attractions: cur.popular_attractions,
        recommended_accommodation: cur.recommended_accommodation,
        travel_tips: cur.travel_tips,
        permits_required: "None",
        cover_image: match?.cover_image || cur.cover_image,
        cover_video_url: match?.cover_video_url || "",
        seo_title: `${match?.name || cur.name} Tour Packages & Guide - Savar Tour Lover`,
        seo_description: cur.description.slice(0, 160),
        gallery: match?.gallery && match.gallery.length > 0 ? match.gallery : [{ imageUrl: cur.cover_image, caption: cur.name }],
        is_featured: cur.is_featured,
        status: "published",
      };

      const { error: upsertErr } = await supabase.from("destinations").upsert(payload, { onConflict: "id" });
      if (upsertErr) {
        console.warn(`  ⚠️ Could not upsert destination '${cur.name}':`, upsertErr.message);
      } else {
        console.log(`  ✓ Synced destination: ${payload.name} (${payload.slug})`);
      }
    }
  }

  // Step 2: Ensure Tour Categories Block is synced in Supabase
  console.log("\n2. Syncing Tour Categories...");
  const { error: catErr } = await supabase.from("homepage_blocks").upsert({
    id: "block-tour-categories",
    block_type: "categories",
    display_order: 10,
    content: { categories: DEFAULT_CATEGORIES },
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (catErr) {
    console.warn("  ⚠️ Warning syncing tour categories block:", catErr.message);
  } else {
    console.log("  ✓ Synced 8 default tour categories to Supabase");
  }

  // Step 3: Re-wire and fix all Tours in Supabase
  console.log("\n3. Verifying and Re-wiring Tours in Supabase...");
  const { data: allDests } = await supabase.from("destinations").select("*");
  const { data: allTours, error: tourErr } = await supabase.from("tours").select("*");

  if (!tourErr && Array.isArray(allTours) && Array.isArray(allDests)) {
    const destSlugMap = new Map(allDests.map((d) => [d.slug.toLowerCase(), d]));
    const destNameMap = new Map(allDests.map((d) => [d.name.toLowerCase(), d]));
    const destIdMap = new Map(allDests.map((d) => [d.id, d]));

    for (const t of allTours) {
      let matchedDest = null;
      if (t.destination_id && destIdMap.has(t.destination_id)) {
        matchedDest = destIdMap.get(t.destination_id);
      } else if (t.destination_slug && destSlugMap.has(t.destination_slug.toLowerCase())) {
        matchedDest = destSlugMap.get(t.destination_slug.toLowerCase());
      } else {
        // Fuzzy match by title or slug
        const tLower = (t.title + " " + t.slug).toLowerCase();
        if (tLower.includes("cox") || tLower.includes("কক্সবাজার")) matchedDest = destNameMap.get("cox's bazar") || destSlugMap.get("coxs-bazar") || destSlugMap.get("cox-bazar");
        else if (tLower.includes("sajek") || tLower.includes("সাজেক")) matchedDest = destNameMap.get("sajek valley") || destSlugMap.get("sajek-valley") || destSlugMap.get("best-time-to-visit-sajek");
        else if (tLower.includes("martin") || tLower.includes("মার্টিন") || tLower.includes("america")) matchedDest = destNameMap.get("saint martin") || destSlugMap.get("saint-martin") || destSlugMap.get("saint-martin-tour");
        else if (tLower.includes("sreemangal") || tLower.includes("শ্রীমঙ্গল")) matchedDest = destNameMap.get("sreemangal") || destSlugMap.get("sreemangal") || destNameMap.get("শ্রীমঙ্গল");
        else if (tLower.includes("tanguar") || tLower.includes("টাঙ্গুয়ার")) matchedDest = destNameMap.get("tanguar haor") || destSlugMap.get("tanguar-haor");
        else if (tLower.includes("bandarban") || tLower.includes("বান্দরবান")) matchedDest = destNameMap.get("bandarban") || destSlugMap.get("bandarban");
        else if (tLower.includes("rangamati") || tLower.includes("রাঙ্গামাটি")) matchedDest = destNameMap.get("kaptai") || destSlugMap.get("kaptai") || destNameMap.get("bandarban");
        else if (tLower.includes("ভোলাগঞ্জ") || tLower.includes("bholaganj")) matchedDest = destNameMap.get("sylhet") || destSlugMap.get("sylhet");
        else if (tLower.includes("সীতাকুণ্ড") || tLower.includes("sitakundo")) matchedDest = destNameMap.get("bandarban") || destSlugMap.get("bandarban");
      }

      const startingPrice = Number(t.starting_price || 0) > 0 ? Number(t.starting_price) : 25000;
      const discount = Number(t.discount || 0);
      const advanceAmount = Number(t.advance_amount || 0) > 0 ? Number(t.advance_amount) : Math.round(startingPrice * 0.4);
      const advancePercent = Math.max(1, Math.min(100, Math.round((advanceAmount / startingPrice) * 100)));

      const tourUpdate = {
        destination_id: matchedDest?.id || t.destination_id,
        destination_slug: matchedDest?.slug || t.destination_slug || "bangladesh",
        starting_price: startingPrice,
        discount: discount,
        advance_amount: advanceAmount,
        advance_percent: advancePercent,
        total_seats: Number(t.total_seats || 40),
        status: t.status || "published",
        is_featured: t.is_featured !== false,
      };

      await supabase.from("tours").update(tourUpdate).eq("id", t.id);
      console.log(`  ✓ Updated tour '${t.title}' -> Dest: ${matchedDest?.name || 'Assigned'}, Price: ৳${startingPrice}, Advance: ৳${advanceAmount}`);
    }
  }

  // Step 4: Ensure Default Homepage Blocks (Hero, About, Journal, SEO)
  console.log("\n4. Ensuring Default Homepage and CMS Blocks...");
  const requiredBlocks = [
    {
      id: "block-hero-1",
      block_type: "hero",
      display_order: 1,
      content: {
        eyebrow: "Domestic tours across Bangladesh",
        headline: "Discover Bangladesh,",
        highlight: "your way",
        subheadline: "Curated domestic tours. Trusted local hosts. Book with a flat advance and clear the balance on tour day.",
        primary_cta_label: "Explore Tours",
        primary_cta_href: "/tours",
        secondary_cta_label: "Plan My Trip",
        secondary_cta_href: "/contact",
      },
    },
    {
      id: "block-about-page",
      block_type: "about_cms",
      display_order: 20,
      content: {
        hero_title: "Crafted journeys, trusted local hosts",
        hero_subtitle: "Born in Savar, travelling across every corner of Bangladesh.",
        mission_text: "To make domestic travel across Bangladesh seamless, transparent, and unforgettable.",
        stats_tours: "120+",
        stats_travelers: "3,500+",
        stats_rating: "4.9★",
      },
    },
    {
      id: "block-seo-settings",
      block_type: "seo_settings",
      display_order: 30,
      content: {
        site_name: "Savar Tour Lover",
        site_tagline: "Your Premier Domestic Travel Partner in Bangladesh",
        default_og_image: "/images/logo-badge.png",
      },
    },
  ];

  for (const rb of requiredBlocks) {
    const { data: existingB } = await supabase.from("homepage_blocks").select("id").eq("id", rb.id).maybeSingle();
    if (!existingB) {
      await supabase.from("homepage_blocks").insert({
        id: rb.id,
        block_type: rb.block_type,
        display_order: rb.display_order,
        content: rb.content,
        updated_at: new Date().toISOString(),
      });
      console.log(`  ✓ Created default CMS block: ${rb.id}`);
    } else {
      console.log(`  ✓ Default CMS block verified: ${rb.id}`);
    }
  }

  console.log("\n======================================================================");
  console.log("  DEFAULT DATA SYNC COMPLETED SUCCESSFULLY ✅");
  console.log("======================================================================\n");
}

syncAllDefaults().catch((err) => {
  console.error("Fatal error during default sync:", err);
  process.exit(1);
});
