const BASE = "http://127.0.0.1:3000";
const tokenRes = await fetch(`${BASE}/api/v1/auth/staff/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "adminpassword123" })
});
const { access } = await tokenRes.json();
const H = { "Content-Type": "application/json", Authorization: `Bearer ${access}` };

// Create post
const p1 = await (await fetch(`${BASE}/api/v1/admin/blog-posts`, {
  method: "POST", headers: H,
  body: JSON.stringify({ title: "Test Blog Debug", slug: `debug-${Date.now()}`, body: "test content", tags: ["a"] })
})).json();
console.log("POST id:", p1.id, "  slug:", p1.slug);

// PUT update
const putRes = await fetch(`${BASE}/api/v1/admin/blog-posts/${p1.id}`, {
  method: "PUT", headers: H,
  body: JSON.stringify({ title: "Updated Blog Debug", slug: p1.slug, body: "updated content", tags: ["a","b"], id: p1.id })
});
const p2 = await putRes.json();
console.log("PUT status:", putRes.status, " id:", p2.id, "  title:", p2.title);
console.log("id changed?", p1.id !== p2.id, `(${p1.id} -> ${p2.id})`);

// List
const list = await (await fetch(`${BASE}/api/v1/admin/blog-posts`, { headers: H })).json();
const byOrig = (list.results||[]).find(x => x.id === p1.id);
const byNew = (list.results||[]).find(x => x.id === p2.id);
console.log("GET after PUT: found by original id:", !!byOrig, "  found by PUT id:", !!byNew);
if (byOrig) console.log("  original id entry title:", byOrig.title);

// Delete by PUT-returned id
const delRes = await fetch(`${BASE}/api/v1/admin/blog-posts/${p2.id}`, {
  method: "DELETE", headers: H
});
console.log("DELETE status:", delRes.status, await delRes.text());
