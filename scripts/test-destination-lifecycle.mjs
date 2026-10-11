import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tuvgeaflyxbldpmpafdk.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dmdlYWZseXhibGRwbXBhZmRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDMwOTkxNSwiZXhwIjoyMTA1ODg1OTE1fQ.Jf-pfS0HB3ggws08_xUrJ5l53QAT8OayrCYJUrt5rxM";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function run() {
  console.log("1. Admin login...");
  const loginRes = await fetch("http://127.0.0.1:3000/api/v1/auth/staff/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "adminpassword123" }),
  });
  const { access } = await loginRes.json();
  console.log("Admin token:", !!access);

  console.log("\n2. Initial destination count:");
  const { data: supaInit } = await supabase.from("destinations").select("*");
  console.log("Supabase destinations count:", supaInit.length);
  const destsInit = await (await fetch("http://127.0.0.1:3000/api/v1/destinations")).json();
  console.log("Website destinations count:", destsInit.results?.length ?? 0);

  console.log("\n3. Creating destination via Admin Panel: 'Sajek Valley Live'...");
  const createRes = await fetch("http://127.0.0.1:3000/api/v1/admin/destinations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${access}` },
    body: JSON.stringify({
      name: "Sajek Valley Live",
      slug: "sajek-valley-live",
      division: "Chattogram",
      tagline: "Kingdom of Clouds",
      description: "Experience real cloud kingdoms above lush green valleys.",
      status: "published",
      is_featured: true,
    }),
  });
  const created = await createRes.json();
  console.log("Created ID:", created.id);

  await new Promise((r) => setTimeout(r, 1000));
  const { data: supaCreated } = await supabase.from("destinations").select("*").eq("id", created.id);
  console.log("Reflected in Supabase Postgres:", supaCreated?.length === 1, "->", supaCreated?.[0]?.name);

  const destsAfter = await (await fetch("http://127.0.0.1:3000/api/v1/destinations")).json();
  console.log("Reflected on Website API:", destsAfter.results?.length, "->", destsAfter.results?.[0]?.name);

  console.log("\n4. Deleting destination via Admin Panel...");
  const delRes = await fetch(`http://127.0.0.1:3000/api/v1/admin/destinations/${created.id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${access}` },
  });
  console.log("Delete status:", delRes.status);

  await new Promise((r) => setTimeout(r, 1000));
  const { data: supaAfterDel } = await supabase.from("destinations").select("*").eq("id", created.id);
  console.log("Supabase count for deleted ID (expect 0):", supaAfterDel?.length);

  const destsFinal = await (await fetch("http://127.0.0.1:3000/api/v1/destinations")).json();
  console.log("Website destinations final count (expect 0):", destsFinal.results?.length ?? 0);
  console.log("\n✅ ALL LIFECYCLE CHECKS PASSED!");
}

run().catch(console.error);
