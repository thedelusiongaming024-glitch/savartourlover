// Script to reset db.json to a clean production-ready state (no mock data)
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_FILE = path.join(process.cwd(), "data_storage", "db.json");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

const current = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

// Keep only the admin staff user — remove all mock/test staff
const adminUser = current.staffUsers.find(u => u.username === "admin" && (u.id === "staff_admin_01" || u.id === "usr-admin-1"));
// Prefer the original staff_admin_01 if it exists, else use usr-admin-1
const keepAdmin = current.staffUsers.find(u => u.id === "staff_admin_01") 
  || current.staffUsers.find(u => u.username === "admin");

const cleanDb = {
  // ── All content cleared ──────────────────────────────────────────
  destinations: [],
  tours: [],
  tourCategories: current.tourCategories || [],   // keep category config
  offers: [],
  testimonials: [],
  blogPosts: [],

  // ── Keep homepage blocks (CMS layout) ─────────────────────────── 
  homepageBlocks: current.homepageBlocks || [],

  // ── Keep only the admin account ───────────────────────────────── 
  staffUsers: keepAdmin ? [keepAdmin] : [],

  // ── All transactional data cleared ────────────────────────────── 
  customers: [],
  bookings: [],
  payments: [],
  clearanceTickets: [],
  alerts: [],
  expenses: [],
  suppliers: [],
  contactInquiries: [],
  analyticsEvents: [],

  // ── Clear all tombstones too (fresh start) ──────────────────────
  deletedEntities: {
    destinations: [],
    tours: [],
    offers: [],
    testimonials: [],
    blogPosts: [],
    homepageBlocks: [],
    tourCategories: [],
    bookings: [],
  },
};

fs.writeFileSync(DB_FILE, JSON.stringify(cleanDb, null, 2), "utf8");

console.log("✅ db.json reset to clean state:");
console.log(`   destinations:     ${cleanDb.destinations.length}`);
console.log(`   tours:            ${cleanDb.tours.length}`);
console.log(`   offers:           ${cleanDb.offers.length}`);
console.log(`   testimonials:     ${cleanDb.testimonials.length}`);
console.log(`   blogPosts:        ${cleanDb.blogPosts.length}`);
console.log(`   bookings:         ${cleanDb.bookings.length}`);
console.log(`   customers:        ${cleanDb.customers.length}`);
console.log(`   payments:         ${cleanDb.payments.length}`);
console.log(`   clearanceTickets: ${cleanDb.clearanceTickets.length}`);
console.log(`   staffUsers:       ${cleanDb.staffUsers.length} (admin only)`);
console.log(`   homepageBlocks:   ${cleanDb.homepageBlocks.length} (CMS kept)`);
console.log(`   tourCategories:   ${cleanDb.tourCategories.length} (kept)`);
