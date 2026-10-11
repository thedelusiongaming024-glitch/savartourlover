import { NextResponse } from "next/server";
import { generateTokens, hashPassword, needsRehash, verifyPassword } from "@/server/auth";
import { findStaffByUsername, updateStaffPasswordHash } from "@/server/db";
import { limitOr429 } from "@/server/rateLimit";

export async function POST(request: Request) {
  // Brute-force protection: per-IP cap on sign-in attempts.
  const limited = await limitOr429(request, "staff-login", 8, 10 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ detail: "Username and password are required." }, { status: 400 });
    }

    const user = findStaffByUsername(username);
    if (!user) {
      return NextResponse.json({ detail: "Invalid username or password." }, { status: 401 });
    }

    const valid = verifyPassword(password, user.password_hash, user.salt);
    if (!valid) {
      return NextResponse.json({ detail: "Invalid username or password." }, { status: 401 });
    }

    // Lazily upgrade any hash still using the old, weaker iteration count.
    // This is the only point we ever have the plaintext password, so it's
    // the only safe place to do this migration.
    if (needsRehash(user.password_hash)) {
      const upgraded = hashPassword(password, user.salt);
      await updateStaffPasswordHash(user.id, upgraded.hash, upgraded.salt);
    }

    const tokens = generateTokens(user);
    return NextResponse.json(tokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
