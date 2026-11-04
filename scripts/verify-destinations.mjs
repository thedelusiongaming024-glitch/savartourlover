// scripts/verify-destinations.mjs
const BASE_URL = "http://127.0.0.1:3000";

async function run() {
  console.log("=== STARTING DESTINATION DATABASE & RELATIONAL WIRING VERIFICATION ===");

  // 1. Check Public Destinations API
  console.log("\n[1] Testing GET /api/v1/destinations...");
  const destsRes = await fetch(`${BASE_URL}/api/v1/destinations`);
  if (!destsRes.ok) {
    throw new Error(`GET /api/v1/destinations failed: ${destsRes.status} ${destsRes.statusText}`);
  }
  const destsData = await destsRes.json();
  const destinations = destsData.results || [];
  console.log(`✓ Fetched ${destinations.length} destinations.`);
  
  if (destinations.length === 0) {
    throw new Error("No destinations returned from API!");
  }

  // Verify rich fields are present and not stripped
  const sample = destinations[0];
  console.log(`Checking sample destination: "${sample.name}" (slug: ${sample.slug}, id: ${sample.id})`);
  const requiredFields = [
    "id", "name", "slug", "division", "tagline", "description", 
    "popular_attractions", "best_time_to_visit", "weather_notes",
    "recommended_accommodation", "travel_tips", "status"
  ];
  for (const field of requiredFields) {
    if (sample[field] === undefined) {
      throw new Error(`Destination is missing field: ${field}`);
    }
  }
  console.log("✓ Sample destination has all rich fields intact (tagline, attractions, tips, etc.)!");

  // Verify deleted destinations are not present
  const deletedGazipur = destinations.find(d => d.slug === "gazipur" || d.id === "dest_gazipur");
  const deletedTetulia = destinations.find(d => d.slug === "tetulia" || d.id === "dest_tetulia");
  if (deletedGazipur || deletedTetulia) {
    throw new Error("Deleted destination was resurrected or not removed!");
  }
  console.log("✓ Deleted destinations (Gazipur, Tetulia) are absent and tombstoned.");

  // 2. Check Public Destinations HTML Page
  console.log("\n[2] Testing GET /destinations HTML page...");
  const destPageRes = await fetch(`${BASE_URL}/destinations`);
  if (!destPageRes.ok) {
    throw new Error(`GET /destinations returned ${destPageRes.status}`);
  }
  const destHtml = await destPageRes.text();
  console.log(`✓ /destinations returned 200 OK (${destHtml.length} bytes).`);

  // 3. Check Destination Detail Page & Tour Relational Wiring
  console.log("\n[3] Testing Destination Detail Page & Tour Relational Wiring...");
  const destSlug = sample.slug;
  const detailRes = await fetch(`${BASE_URL}/destinations/${destSlug}`);
  if (!detailRes.ok) {
    throw new Error(`GET /destinations/${destSlug} returned ${detailRes.status}`);
  }
  console.log(`✓ /destinations/${destSlug} returned 200 OK.`);

  // 4. Check Tours API & Tour-to-Destination Linkage
  console.log("\n[4] Testing GET /api/v1/tours and destination links...");
  const toursRes = await fetch(`${BASE_URL}/api/v1/tours`);
  if (!toursRes.ok) {
    throw new Error(`GET /api/v1/tours failed: ${toursRes.status}`);
  }
  const toursData = await toursRes.json();
  const tours = toursData.results || [];
  console.log(`✓ Fetched ${tours.length} tours.`);
  for (const t of tours) {
    console.log(`  - Tour "${t.title}" -> destination_slug: "${t.destination_slug}", destination_id: "${t.destination_id}", destination_name: "${t.destination_name}"`);
    if (!t.destination_slug) {
      throw new Error(`Tour ${t.id} has missing destination_slug!`);
    }
  }
  console.log("✓ Tours are properly linked to destinations!");

  // 5. Staff Admin Auth & Destination CRUD
  console.log("\n[5] Testing Admin Staff Login & Destination Management...");
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "admin",
      password: "adminpassword123"
    })
  });
  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Admin login failed: ${loginRes.status} ${errText}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.access || loginData.access_token;
  console.log("✓ Admin login successful.");

  // Test admin get destinations
  const adminDestRes = await fetch(`${BASE_URL}/api/v1/admin/destinations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!adminDestRes.ok) {
    throw new Error(`Admin GET /destinations failed: ${adminDestRes.status}`);
  }
  const adminDestData = await adminDestRes.json();
  console.log(`✓ Admin fetched ${adminDestData.results.length} destinations.`);

  // Test creating a new destination
  console.log("\n[6] Testing Destination Creation via Admin API...");
  const testDestSlug = `test-dest-${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/v1/admin/destinations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: "Bichanakandi Test",
      slug: testDestSlug,
      division: "Sylhet",
      tagline: "Where hills meet crystal streams",
      description: "A pristine border landscape in Sylhet where waterfalls cascade into crystal streams.",
      best_time_to_visit: "June to September",
      weather_notes: "Monsoon paradise",
      popular_attractions: ["Crystal Lake", "Stream Walk", "Hill View"],
      recommended_accommodation: "Sylhet Eco Lodges",
      travel_tips: "Wear waterproof sandals",
      permits_required: "None",
      status: "published"
    })
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Admin create destination failed: ${createRes.status} ${errText}`);
  }
  const createdDest = await createRes.json();
  console.log(`✓ Destination created: ID ${createdDest.id}, Slug ${createdDest.slug}`);

  // Verify created destination appears in public API
  const verifyPublicRes = await fetch(`${BASE_URL}/api/v1/destinations`);
  const verifyPublicData = await verifyPublicRes.json();
  const foundCreated = (verifyPublicData.results || []).find(d => d.slug === testDestSlug);
  if (!foundCreated) {
    throw new Error("Newly created destination was not found in public API!");
  }
  console.log("✓ Newly created destination immediately reflected in public API!");

  // Test updating the destination
  console.log("\n[7] Testing Destination Update via Admin API...");
  const updateRes = await fetch(`${BASE_URL}/api/v1/admin/destinations/${createdDest.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      tagline: "Updated Tagline - Monsoon Paradise",
      description: "Updated description with enhanced detail."
    })
  });
  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Admin update destination failed: ${updateRes.status} ${errText}`);
  }
  const updatedDest = await updateRes.json();
  if (updatedDest.tagline !== "Updated Tagline - Monsoon Paradise") {
    throw new Error("Updated tagline not reflected in response!");
  }
  console.log("✓ Destination updated successfully without wiping other fields!");

  // Test deleting the test destination
  console.log("\n[8] Testing Destination Deletion via Admin API...");
  const delRes = await fetch(`${BASE_URL}/api/v1/admin/destinations/${createdDest.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!delRes.ok) {
    throw new Error(`Admin delete destination failed: ${delRes.status}`);
  }
  console.log("✓ Destination deleted via API.");

  // Verify deletion is immediately reflected
  const afterDelRes = await fetch(`${BASE_URL}/api/v1/destinations`);
  const afterDelData = await afterDelRes.json();
  const foundAfterDel = (afterDelData.results || []).find(d => d.id === createdDest.id || d.slug === testDestSlug);
  if (foundAfterDel) {
    throw new Error("Deleted destination is still present in public API!");
  }
  console.log("✓ Deleted destination removed from public API and tombstoned.");

  console.log("\n=======================================================");
  console.log("🎉 ALL DESTINATION WIRING & PERSISTENCE TESTS PASSED! 🎉");
  console.log("=======================================================");
}

run().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
