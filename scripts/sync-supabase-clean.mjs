import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tuvgeaflyxbldpmpafdk.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dmdlYWZseXhibGRwbXBhZmRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDMwOTkxNSwiZXhwIjoyMTA1ODg1OTE1fQ.Jf-pfS0HB3ggws08_xUrJ5l53QAT8OayrCYJUrt5rxM";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("Cleaning mock and test data from connected Supabase PostgreSQL...");

  // 1. Delete dependent tables first (payments, tickets, activities)
  const { error: payErr } = await supabase.from("payments").delete().neq("id", "keep-none");
  console.log("Payments cleared:", payErr ? payErr.message : "OK");

  const { error: tktErr } = await supabase.from("clearance_tickets").delete().neq("id", "keep-none");
  console.log("Clearance tickets cleared:", tktErr ? tktErr.message : "OK");

  const { error: actErr } = await supabase.from("customer_activities").delete().neq("id", "keep-none");
  console.log("Customer activities cleared:", actErr ? actErr.message : "OK");

  // 2. Delete bookings
  const { error: bkErr } = await supabase.from("bookings").delete().neq("id", "keep-none");
  console.log("Bookings cleared:", bkErr ? bkErr.message : "OK");

  // 3. Delete customers
  const { error: custErr } = await supabase.from("customers").delete().neq("id", "keep-none");
  console.log("Customers cleared:", custErr ? custErr.message : "OK");

  // 4. Delete tours
  const { error: tourErr } = await supabase.from("tours").delete().neq("id", "keep-none");
  console.log("Tours cleared:", tourErr ? tourErr.message : "OK");

  // 5. Delete destinations
  const { error: destErr } = await supabase.from("destinations").delete().neq("id", "keep-none");
  console.log("Destinations cleared:", destErr ? destErr.message : "OK");

  // 6. Delete offers
  const { error: offErr } = await supabase.from("offers").delete().neq("id", "keep-none");
  console.log("Offers cleared:", offErr ? offErr.message : "OK");

  // 7. Delete testimonials & blog posts & inquiries
  await supabase.from("testimonials").delete().neq("id", "keep-none");
  await supabase.from("blog_posts").delete().neq("id", "keep-none");
  await supabase.from("contact_inquiries").delete().neq("id", "keep-none");
  console.log("Testimonials, blog posts, inquiries cleared: OK");

  // 8. Delete mock staff users (keep only admin)
  const { error: staffErr } = await supabase.from("staff_users").delete().neq("username", "admin");
  console.log("Mock staff removed (admin kept):", staffErr ? staffErr.message : "OK");

  // Verify
  console.log("\n--- Verification in Supabase ---");
  const tables = ["destinations", "tours", "bookings", "customers", "payments", "clearance_tickets", "offers", "staff_users"];
  for (const t of tables) {
    const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t.padEnd(20)}: ${count}`);
  }
}

main().catch(console.error);
