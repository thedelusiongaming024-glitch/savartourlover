#!/usr/bin/env node
// Generates a password hash + salt in the format the app expects
// (PBKDF2-SHA512, 210,000 iterations — matches src/server/auth.ts).
//
//   node scripts/hash-password.mjs "my new strong password"
//
// Then update the account in Supabase (SQL editor) — staff accounts live in public.staff_users:
//   UPDATE public.staff_users SET password_hash = '<hash>', salt = '<salt>' WHERE username = 'admin';
import crypto from "node:crypto";

const ITERATIONS = 210000; // keep in sync with PBKDF2_ITERATIONS in src/server/auth.ts

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: node scripts/hash-password.mjs "<password of at least 12 characters>"');
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString("hex");
// Format: "<iterations>$<hex digest>" — the iteration count is stored inline
// so it can be raised again later without invalidating existing hashes, and
// so accounts created straight in Supabase (bypassing the app's lazy-rehash
// on login) still get the current iteration count from day one.
const hash = `${ITERATIONS}$${crypto.pbkdf2Sync(password, salt, ITERATIONS, 64, "sha512").toString("hex")}`;
console.log(`password_hash: ${hash}\nsalt:          ${salt}`);
console.log(`\nSQL:\nUPDATE public.staff_users SET password_hash = '${hash}', salt = '${salt}' WHERE username = 'admin';`);
