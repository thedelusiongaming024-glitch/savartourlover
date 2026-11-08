#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
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
const DB_OBJECT_PATH = "db.json";

const newPassword = process.argv[2]?.trim();
const targetUsername = (process.argv[3] || "admin").trim().toLowerCase();

if (!newPassword || newPassword.length < 8) {
  console.log("\n======================================================================");
  console.log("  CHANGE ADMIN PASSWORD UTILITY");
  console.log("======================================================================\n");
  console.log("Usage: node scripts/change-admin-password.mjs \"<new-password>\" [username]\n");
  console.log("Examples:");
  console.log("  node scripts/change-admin-password.mjs \"MySecurePassword2026!\"");
  console.log("  npm run change-password -- \"MySecurePassword2026!\"\n");
  console.log("Note: Password must be at least 8 characters long.");
  console.log("======================================================================\n");
  process.exit(1);
}

const ITERATIONS = 210000; // Matches OWASP minimum in src/server/auth.ts
const salt = crypto.randomBytes(16).toString("hex");
const digest = crypto.pbkdf2Sync(newPassword, salt, ITERATIONS, 64, "sha512").toString("hex");
const passwordHash = `${ITERATIONS}$${digest}`;

async function main() {
  console.log("\n======================================================================");
  console.log("  UPDATING ADMIN PASSWORD");
  console.log("======================================================================\n");
  console.log(`Target Username: ${targetUsername}`);
  console.log(`Supabase URL:    ${SUPABASE_URL}`);
  console.log(`Hash Algorithm:  PBKDF2-HMAC-SHA512 (${ITERATIONS.toLocaleString()} iterations)\n`);

  // 1. Update in Supabase PostgreSQL
  if (!SERVICE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required in .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Step 1: Updating Supabase PostgreSQL 'staff_users' table...");
  const { data: updatedUsers, error: dbErr } = await supabase
    .from("staff_users")
    .update({ password_hash: passwordHash, salt })
    .eq("username", targetUsername)
    .select();

  if (dbErr) {
    console.error("  ❌ Failed to update Supabase database:", dbErr.message);
    process.exit(1);
  }

  if (!updatedUsers || updatedUsers.length === 0) {
    console.error(`  ❌ No staff user with username '${targetUsername}' found in Supabase!`);
    process.exit(1);
  }

  console.log(`  ✓ Updated user in Supabase PostgreSQL (ID: ${updatedUsers[0].id})`);

  // 2. Update local files
  console.log("\nStep 2: Updating local memory cache files (.data/db.json & data_storage/db.json)...");
  const localDbPath = path.resolve(process.cwd(), ".data", "db.json");
  const storageDbPath = path.resolve(process.cwd(), "data_storage", "db.json");

  let fullDb = null;
  for (const p of [localDbPath, storageDbPath]) {
    if (fs.existsSync(p)) {
      try {
        const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (raw && Array.isArray(raw.staffUsers)) {
          const userIdx = raw.staffUsers.findIndex((u) => u.username.toLowerCase() === targetUsername);
          if (userIdx !== -1) {
            raw.staffUsers[userIdx].password_hash = passwordHash;
            raw.staffUsers[userIdx].salt = salt;
          } else {
            raw.staffUsers.push({
              id: updatedUsers[0].id,
              username: targetUsername,
              password_hash: passwordHash,
              salt,
              role: updatedUsers[0].role || "super_admin",
              phone_number: updatedUsers[0].phone_number || "",
              email: updatedUsers[0].email || "",
              first_name: updatedUsers[0].first_name || "Admin",
              last_name: updatedUsers[0].last_name || "",
            });
          }
          fs.writeFileSync(p, JSON.stringify(raw, null, 2), "utf-8");
          console.log(`  ✓ Updated: ${p}`);
          if (!fullDb) fullDb = raw;
        }
      } catch (e) {
        console.warn(`  ⚠️ Warning updating ${p}:`, e.message);
      }
    }
  }

  // 3. Update Supabase Storage mirror
  if (fullDb) {
    console.log("\nStep 3: Uploading updated snapshot to Supabase Storage mirror...");
    const { error: uploadErr } = await supabase.storage.from(BUCKET_NAME).upload(DB_OBJECT_PATH, JSON.stringify(fullDb, null, 2), {
      contentType: "application/json",
      upsert: true,
      cacheControl: "300",
    });
    if (uploadErr) {
      console.warn("  ⚠️ Warning uploading to storage mirror:", uploadErr.message);
    } else {
      console.log(`  ✓ Successfully updated '${DB_OBJECT_PATH}' in bucket '${BUCKET_NAME}'`);
    }
  }

  console.log("\n======================================================================");
  console.log("  PASSWORD CHANGED SUCCESSFULLY! ✅");
  console.log("======================================================================");
  console.log(`Username:     ${targetUsername}`);
  console.log(`New Password: ${newPassword}`);
  console.log(`Login URL:    http://localhost:3000/staff/login (or your live site /staff/login)`);
  console.log("======================================================================\n");
}

main().catch(console.error);
